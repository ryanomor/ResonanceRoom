import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useMessages, sendMessage, markRead } from '../../hooks/useChat';
import { isMatchExpired } from '../../hooks/useMatches';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { ChatMessage, Match } from '../../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function ChatScreen() {
  const router = useRouter();
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const appUser = useAuthStore((s) => s.appUser);
  const messages = useMessages(matchId ?? null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!matchId) return;
    getDoc(doc(db, 'matches', matchId)).then((snap) => {
      if (snap.exists()) setMatch({ ...snap.data(), id: snap.id } as Match);
    });
  }, [matchId]);

  useEffect(() => {
    if (messages.length === 0 || !appUser) return;
    messages
      .filter((m) => m.senderId !== appUser.id && !m.readAt)
      .forEach((m) => markRead(m.id));
  }, [messages, appUser?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim() || !matchId || !appUser || sending) return;
    setSending(true);
    const txt = text.trim();
    setText('');
    try {
      await sendMessage(matchId, appUser.id, txt);
    } finally {
      setSending(false);
    }
  }

  const expired = match ? isMatchExpired(match) || match.status === 'expired' : false;

  function renderMessage({ item }: { item: ChatMessage }) {
    const mine = item.senderId === appUser?.id;
    return (
      <View style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
            {item.messageText}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>
          {match ? `${match.uid1 === appUser?.id ? match.uid2 : match.uid1}`.slice(0, 12) : 'Chat'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {expired && (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>This match has expired. Chat is read-only.</Text>
        </View>
      )}

      {match && !expired && (
        <View style={styles.timerBanner}>
          <Text style={styles.timerText}>
            Expires {new Date(match.expiresAt).toLocaleString()}
          </Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyText}>Say hello!</Text>
          </View>
        }
      />

      {!expired && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: fontSize.base, color: colors.accent, fontWeight: '600' },
  topTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.white },
  expiredBanner: {
    backgroundColor: `${colors.error}22`,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  expiredText: { fontSize: fontSize.xs, color: colors.error, fontWeight: '600' },
  timerBanner: {
    backgroundColor: `${colors.accent}11`,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  timerText: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600' },
  messageList: { padding: spacing[4], paddingBottom: 16, gap: 8 },
  msgRow: { maxWidth: '80%', gap: 4 },
  msgLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: { backgroundColor: colors.accent },
  bubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: fontSize.base, color: colors.offwhite, lineHeight: 22 },
  bubbleTextMine: { color: colors.white },
  timestamp: { fontSize: 10, color: colors.muted, marginHorizontal: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: spacing[4],
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: colors.white, fontWeight: '700' },
  emptyMessages: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: fontSize.base, color: colors.muted },
});
