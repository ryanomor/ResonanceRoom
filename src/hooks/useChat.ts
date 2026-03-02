import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useMessages(matchId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!matchId) return;
    const q = query(
      collection(db, 'chatMessages'),
      where('matchId', '==', matchId),
      orderBy('sentAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ ...d.data(), id: d.id } as ChatMessage)));
    });
    return unsub;
  }, [matchId]);

  return messages;
}

export async function sendMessage(matchId: string, senderId: string, text: string) {
  const now = new Date().toISOString();
  const msg: ChatMessage = {
    id: uuidv4(),
    matchId,
    senderId,
    messageText: text,
    sentAt: now,
    createdAt: now,
  };
  await setDoc(doc(db, 'chatMessages', msg.id), msg);
  return msg;
}

export async function markRead(messageId: string) {
  await updateDoc(doc(db, 'chatMessages', messageId), {
    readAt: new Date().toISOString(),
  });
}

export function useUnreadCount(matchId: string | null, currentUserId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!matchId || !currentUserId) return;
    const q = query(
      collection(db, 'chatMessages'),
      where('matchId', '==', matchId),
      where('readAt', '==', null)
    );
    const unsub = onSnapshot(q, (snap) => {
      const unread = snap.docs.filter((d) => d.data().senderId !== currentUserId);
      setCount(unread.length);
    });
    return unsub;
  }, [matchId, currentUserId]);

  return count;
}
