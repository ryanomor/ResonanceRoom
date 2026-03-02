import { useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { Gender, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useAuthListener() {
  const { setFirebaseUser, setAppUser, setLoading } = useAuthStore();

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
  };
  await setDoc(doc(db, 'users', cred.user.uid), user);
  useAuthStore.getState().setAppUser(user);
  return cred;
}

export async function signOut() {
  await fbSignOut(auth);
  useAuthStore.getState().setAppUser(null);
  useAuthStore.getState().setFirebaseUser(null);
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
