import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AppNotification } from '../types';
import { useAuthStore } from '../store/authStore';

export function useNotifications() {
  const appUser = useAuthStore((s) => s.appUser);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!appUser) return;
    setLastSeenAt(appUser.lastNotificationsSeenAt ?? null);
    setDismissedIds(appUser.dismissedNotificationIds ?? []);
  }, [appUser?.id, appUser?.lastNotificationsSeenAt, appUser?.dismissedNotificationIds]);

  useEffect(() => {
    if (!appUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', appUser.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs
        .map((d) => ({ ...d.data(), id: d.id } as AppNotification))
        .filter((n) => !dismissedIds.includes(n.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(all);
    });
    return unsub;
  }, [appUser?.id, dismissedIds]);

  const unseen = lastSeenAt
    ? notifications.filter(
        (n) => new Date(n.createdAt) > new Date(lastSeenAt)
      ).length
    : notifications.length;

  async function dismiss(notificationId: string) {
    if (!appUser) return;
    await updateDoc(doc(db, 'users', appUser.id), {
      dismissedNotificationIds: arrayUnion(notificationId),
    });
    useAuthStore.getState().setAppUser({
      ...appUser,
      dismissedNotificationIds: [...appUser.dismissedNotificationIds, notificationId],
    });
  }

  async function markAllSeen() {
    if (!appUser) return;
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'users', appUser.id), { lastNotificationsSeenAt: now });
    useAuthStore.getState().setAppUser({ ...appUser, lastNotificationsSeenAt: now });
  }

  return { notifications, unseen, dismiss, markAllSeen };
}
