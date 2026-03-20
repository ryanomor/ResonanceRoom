import { useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { Gender, User } from '../types';

export function useAuthListener() {
  const { setFirebaseUser, setAppUser, setLoading, setPendingSocialProfile } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid));
          if (snap.exists()) {
            setAppUser(snap.data() as User);
          }
        } catch {
          // silent
        }
      } else {
        setFirebaseUser(null);
        setAppUser(null);
        setPendingSocialProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  if (snap.exists()) {
    useAuthStore.getState().setAppUser(snap.data() as User);
  }
  return cred;
}

export async function signUp(
  email: string,
  password: string,
  username: string,
  city: string,
  gender: Gender
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const now = new Date().toISOString();
  const user: User = {
    id: cred.user.uid,
    email,
    username,
    city,
    gender,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    totalGamesPlayed: 0,
    totalMatches: 0,
    favoriteCities: [],
    dismissedNotificationIds: [],
    photos: [],
  };
  await setDoc(doc(db, 'users', cred.user.uid), user);
  useAuthStore.getState().setAppUser(user);
  return cred;
}

export async function signInWithGoogle(): Promise<{ isNewUser: boolean }> {
  let fbUser: { uid: string; email: string | null; displayName: string | null };

  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    fbUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
    };
  } else {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    const { idToken } = await GoogleSignin.signIn();
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    fbUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
    };
  }

  const snap = await getDoc(doc(db, 'users', fbUser.uid));
  if (snap.exists()) {
    useAuthStore.getState().setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
    useAuthStore.getState().setAppUser(snap.data() as User);
    return { isNewUser: false };
  }

  useAuthStore.getState().setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
  useAuthStore.getState().setPendingSocialProfile({
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
  });
  return { isNewUser: true };
}

export async function signInWithApple(): Promise<{ isNewUser: boolean }> {
  const AppleAuthentication = await import('expo-apple-authentication');
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCredential.identityToken!,
    rawNonce: undefined,
  });

  const result = await signInWithCredential(auth, credential);
  const fbUser = {
    uid: result.user.uid,
    email: result.user.email,
    displayName: appleCredential.fullName
      ? `${appleCredential.fullName.givenName ?? ''} ${appleCredential.fullName.familyName ?? ''}`.trim()
      : result.user.displayName,
  };

  const snap = await getDoc(doc(db, 'users', fbUser.uid));
  if (snap.exists()) {
    useAuthStore.getState().setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
    useAuthStore.getState().setAppUser(snap.data() as User);
    return { isNewUser: false };
  }

  useAuthStore.getState().setFirebaseUser({ uid: fbUser.uid, email: fbUser.email });
  useAuthStore.getState().setPendingSocialProfile({
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName ?? null,
  });
  return { isNewUser: true };
}

export async function completeSocialSignUp(
  username: string,
  city: string,
  gender: Gender
) {
  const store = useAuthStore.getState();
  const pending = store.pendingSocialProfile;
  if (!pending) throw new Error('No pending social profile');

  const now = new Date().toISOString();
  const user: User = {
    id: pending.uid,
    email: pending.email ?? '',
    username,
    city,
    gender,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    totalGamesPlayed: 0,
    totalMatches: 0,
    favoriteCities: [],
    dismissedNotificationIds: [],
    photos: [],
  };

  await setDoc(doc(db, 'users', pending.uid), user);
  store.setAppUser(user);
  store.setPendingSocialProfile(null);
}

export async function signOut() {
  await fbSignOut(auth);
  useAuthStore.getState().setAppUser(null);
  useAuthStore.getState().setFirebaseUser(null);
  useAuthStore.getState().setPendingSocialProfile(null);
}

export async function updateProfile(updates: Partial<User>) {
  const uid = useAuthStore.getState().firebaseUser?.uid;
  if (!uid) return;
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: now });
  const current = useAuthStore.getState().appUser;
  if (current) {
    useAuthStore.getState().setAppUser({ ...current, ...updates, updatedAt: now });
  }
}

export async function deleteAccount() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await deleteDoc(doc(db, 'users', uid));
  if (auth.currentUser) await deleteUser(auth.currentUser);
}
