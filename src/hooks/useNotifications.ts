import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AppNotification } from '../types';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
  const appUser = useAuthStore((s) => s.appUser);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser) return;
    setLastSeenAt(appUser.lastNotificationsSeenAt ?? null);
  }, [appUser?.id, appUser?.lastNotificationsSeenAt]);

  useEffect(() => {
    if (!appUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', appUser.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as AppNotification))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(all);
    });
    return unsub;
  }, [appUser?.id]);

  const unseen = lastSeenAt
    ? notifications.filter(
        (n) => new Date(n.createdAt) > new Date(lastSeenAt)
      ).length
    : notifications.length;

  async function dismiss(notificationId: string) {
    await deleteDoc(doc(db, 'notifications', notificationId));
  }

  async function dismissAll() {
    if (!appUser) return;
    const snap = await getDocs(
      query(collection(db, 'notifications'), where('userId', '==', appUser.id))
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async function markAllSeen() {
    if (!appUser) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'users', appUser.id), { lastNotificationsSeenAt: now });
    useAuthStore.getState().setAppUser({ ...appUser, lastNotificationsSeenAt: now });
  }

  return { notifications, unseen, dismiss, dismissAll, markAllSeen };
}
