import { create } from 'zustand';
import type { User } from '../types';

export interface PendingSocialProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  firebaseUser: { uid: string; email: string | null } | null;
  appUser: User | null;
  loading: boolean;
  pendingSocialProfile: PendingSocialProfile | null;
  setFirebaseUser: (u: { uid: string; email: string | null } | null) => void;
  setAppUser: (u: User | null) => void;
  setLoading: (v: boolean) => void;
  setPendingSocialProfile: (p: PendingSocialProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  appUser: null,
  loading: true,
  pendingSocialProfile: null,
  setFirebaseUser: (u) => set({ firebaseUser: u }),
  setAppUser: (u) => set({ appUser: u }),
  setLoading: (v) => set({ loading: v }),
  setPendingSocialProfile: (p) => set({ pendingSocialProfile: p }),
}));
