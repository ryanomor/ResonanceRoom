import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  firebaseUser: { uid: string; email: string | null } | null;
  appUser: User | null;
  loading: boolean;
  setFirebaseUser: (u: { uid: string; email: string | null } | null) => void;
  setAppUser: (u: User | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  appUser: null,
  loading: true,
  setFirebaseUser: (u) => set({ firebaseUser: u }),
  setAppUser: (u) => set({ appUser: u }),
  setLoading: (v) => set({ loading: v }),
}));
