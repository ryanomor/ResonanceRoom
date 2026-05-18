import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  getSessionByRoomId,
  createGameSession,
  updateGameSession,
  getQuestion,
  submitAnswer,
  getAnswersForQuestion,
  submitSelection,
  deleteSelection,
  useGameSession,
  useAnsweredCount,
  deleteOwnAnswerForQuestion,
  deleteOwnSelectionsForQuestion,
} from '../../hooks/useGame';
import { getRoomById } from '../../hooks/useRooms';
import { useParticipants } from '../../hooks/useParticipants';
import { useAuthStore } from '../../store/authStore';
import { setMatch } from '../../hooks/useMatches';
import { getMatchesBySessionId } from '../../hooks/useMatches';
import { getUserById, incrementOwnGamesPlayed } from '../../hooks/useAuth';
import { createNotification } from '../../hooks/useParticipants';
import { colors, fontSize, spacing, radius } from '../../theme';
import { getPaymentStatus, triggerHostPayout } from '../../lib/payments';
import type { Question, UserAnswer, Room } from '../../types';
import { Avatar } from '../../components/ui/Avatar';

const ANSWER_COLORS = [colors.game.red, colors.game.blue, colors.game.yellow, colors.game.green];
const ANSWER_SHAPES = ['▲', '◆', '●', '■'];

export function GameScreen() {
  const router = useRouter();
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const appUser = useAuthStore((s) => s.appUser);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [pulse] = useState(new Animated.Value(1));
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [paymentBlocked, setPaymentBlocked] = useState(false);
  const [payoutTriggered, setPayoutTriggered] = useState(false);
  const [gamesPlayedIncremented, setGamesPlayedIncremented] = useState(false);

  const participants = useParticipants(roomId ?? null);

  const session = useGameSession(sessionId);
  const currentQuestionId = session ? (session.questionIds[session.currentQuestionIndex] ?? null) : null;
  const answeredCount = useAnsweredCount(sessionId, question?.id ?? null);

  useEffect(() => {
    if (!roomId || !appUser || initialized) return;
    setInitialized(true);

    (async () => {
      const room = await getRoomById(roomId);
      const roomHostId = room?.hostId ?? null;
      setHostId(roomHostId);
      setIsHost(roomHostId === appUser.id);

      if (roomHostId !== appUser.id && (room?.entryFee ?? 0) > 0) {
        const myParticipant = participants.find((p) => p.userId === appUser.id);
        if (myParticipant) {
          const payment = await getPaymentStatus(myParticipant.id);
          if (!payment || payment.payment_status !== 'paid') {
            setPaymentBlocked(true);
            return;
          }
        }
      }

      let s = await getSessionByRoomId(roomId);
      if (!s && room?.hostId === appUser.id) {
        s = await createGameSession(roomId, room?.questionIds ?? []);
        if (s) {
          const firstQuestionId = s.questionIds[0] ?? null;
          const firstQuestion = firstQuestionId ? await getQuestion(firstQuestionId) : null;
          const timeLimitMs = (firstQuestion?.timeLimitSeconds ?? 30) * 1000;
          await updateGameSession(s.id, {
            gameState: 'question',
            questionStartTime: new Date().toISOString(),
            questionEndTime: new Date(Date.now() + timeLimitMs).toISOString(),
          });
        }
      }
      if (s) setSessionId(s.id);
    })();
  }, [roomId, appUser, initialized]);

  useEffect(() => {
    if (!currentQuestionId) return;
    setMyAnswer(null);
    setSelectedUserIds([]);
    setAnswers([]);
    getQuestion(currentQuestionId).then((q) => {
      setQuestion(q);
      if (q) setTimeLeft(q.timeLimitSeconds);
    });
  }, [session?.currentQuestionIndex, currentQuestionId]);

  useEffect(() => {
    if (!session || session.gameState !== 'selection' || !currentQuestionId) return;
    getAnswersForQuestion(session.id, currentQuestionId).then(setAnswers);
  }, [session?.gameState, session?.id, currentQuestionId]);

  useEffect(() => {
    if (!session?.questionEndTime || session.gameState !== 'question') return;
    const end = new Date(session.questionEndTime).getTime();
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.round((end - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(tick);
    }, 500);
    return () => clearInterval(tick);
  }, [session?.questionEndTime, session?.gameState]);

  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0) {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [timeLeft]);

  const [lastCleanedQuestionId, setLastCleanedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !appUser) return;
    const prevQuestionId = session.questionIds[session.currentQuestionIndex - 1];
    if (session.gameState === 'question' && prevQuestionId && prevQuestionId !== lastCleanedQuestionId) {
      setLastCleanedQuestionId(prevQuestionId);
      deleteOwnAnswerForQuestion(session.id, prevQuestionId, appUser.id).catch(() => {});
      deleteOwnSelectionsForQuestion(session.id, prevQuestionId, appUser.id).catch(() => {});
    }
  }, [session?.currentQuestionIndex, session?.gameState]);

  useEffect(() => {
    if (!session || !appUser) return;
    const lastQuestionId = session.questionIds[session.questionIds.length - 1];
    if (session.gameState === 'ended' && lastQuestionId && lastQuestionId !== lastCleanedQuestionId) {
      setLastCleanedQuestionId(lastQuestionId);
      deleteOwnAnswerForQuestion(session.id, lastQuestionId, appUser.id).catch(() => {});
      deleteOwnSelectionsForQuestion(session.id, lastQuestionId, appUser.id).catch(() => {});
    }
  }, [session?.gameState]);

  useEffect(() => {
    if (session?.gameState === 'ended' && !gamesPlayedIncremented) {
      setGamesPlayedIncremented(true);
      incrementOwnGamesPlayed().catch(() => {});
    }
  }, [session?.gameState, gamesPlayedIncremented]);

  const handleAnswer = useCallback(async (optionIndex: number) => {
    if (!session || !appUser || session.gameState !== 'question') return;
    setMyAnswer(optionIndex);
    await submitAnswer({
      gameSessionId: session.id,
      userId: appUser.id,
      questionId: currentQuestionId!,
      selectedOption: optionIndex,
      answeredAt: new Date().toISOString(),
    });
  }, [session, appUser, session?.gameState, hostId]);

  const handleHostEndQuestion = useCallback(async () => {
    if (!session) return;
    const answersData = await getAnswersForQuestion(session.id, currentQuestionId!);
    setAnswers(answersData);
    await updateGameSession(session.id, { gameState: 'selection' });
  }, [session]);

  const handleSelectUser = useCallback(async (targetUserId: string) => {
    if (!session || !appUser) return;

    const alreadySelected = selectedUserIds.includes(targetUserId);
    if (alreadySelected) {
      await deleteSelection(session.id, currentQuestionId!, appUser.id, targetUserId);
      await setMatch(session.id, appUser.id, targetUserId, currentQuestionId!, false);
      setSelectedUserIds((prev) => prev.filter((id) => id !== targetUserId));
      return;
    }

    setSelectedUserIds((prev) => [...prev, targetUserId]);
    await submitSelection({
      gameSessionId: session.id,
      questionId: currentQuestionId!,
      selectorUserId: appUser.id,
      selectedUserId: targetUserId,
      createdAt: new Date().toISOString(),
    });

    const myAnswerIndex = myAnswer ?? 0;
    const theirAnswer = answers.find((a) => a.userId === targetUserId)?.selectedOption;
    if (theirAnswer === myAnswerIndex) {
      await setMatch(session.id, appUser.id, targetUserId, currentQuestionId!, true);
    }
  }, [session, appUser, selectedUserIds, myAnswer, answers, hostId, currentQuestionId]);

  const handleNextQuestion = useCallback(async () => {
    if (!session) return;
    if (session.currentQuestionIndex < session.questionIds.length - 1) {
      const nextIndex = session.currentQuestionIndex + 1;
      const nextQuestionId = session.questionIds[nextIndex] ?? null;
      const nextQuestion = nextQuestionId ? await getQuestion(nextQuestionId) : null;
      const timeLimitMs = (nextQuestion?.timeLimitSeconds ?? 30) * 1000;
      const now = new Date();
      await updateGameSession(session.id, {
        currentQuestionIndex: nextIndex,
        gameState: 'question',
        questionStartTime: now.toISOString(),
        questionEndTime: new Date(now.getTime() + timeLimitMs).toISOString(),
      });
    } else {
      await updateGameSession(session.id, { gameState: 'ended' });
      
      // Notify users about their matches
      try {
        const matches = await getMatchesBySessionId(session.id);
        const notifiedUsers = new Set<string>();
        
        for (const match of matches) {
          if (!notifiedUsers.has(match.uid1)) {
            const otherUser = await getUserById(match.uid2);
            await createNotification(
              match.uid1,
              'newMatch',
              'New Match!',
              `You matched with ${otherUser?.username || 'someone'} in a game!`
            );
            notifiedUsers.add(match.uid1);
          }
          if (!notifiedUsers.has(match.uid2)) {
            const otherUser = await getUserById(match.uid1);
            await createNotification(
              match.uid2,
              'newMatch',
              'New Match!',
              `You matched with ${otherUser?.username || 'someone'} in a game!`
            );
            notifiedUsers.add(match.uid2);
          }
        }
      } catch (error) {
        console.warn('Failed to send match notifications:', error);
      }
      
      if (isHost && roomId && hostId && !payoutTriggered) {
        setPayoutTriggered(true);
        triggerHostPayout(roomId, hostId);
      }
    }
  }, [session, isHost, roomId, hostId, payoutTriggered]);

  if (paymentBlocked) {
    return (
      <View style={styles.blockedScreen}>
        <Text style={styles.blockedIcon}>🔒</Text>
        <Text style={styles.blockedTitle}>Payment Required</Text>
        <Text style={styles.blockedSub}>
          This game requires a paid entry. Complete your payment from the room page to join.
        </Text>
        <TouchableOpacity style={styles.blockedBtn} onPress={() => router.back()}>
          <Text style={styles.blockedBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!session || !question) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (session.gameState === 'ended') {
    return (
      <View style={styles.endScreen}>
        <Text style={styles.endTitle}>Game Over!</Text>
        <Text style={styles.endSub}>Check your matches</Text>
        <TouchableOpacity
          style={styles.endBtn}
          onPress={() => router.replace('/(tabs)/matches')}
        >
          <Text style={styles.endBtnText}>See My Matches</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.endBtn, styles.endBtnSecondary]}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={[styles.endBtnText, { color: colors.muted }]}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (session.gameState === 'selection') {
    if (isHost) {
      return (
        <View style={styles.container}>
          <View style={styles.selectionHeader}>
            <Text style={styles.selectionTitle}>Selection Phase</Text>
            <Text style={styles.selectionSub}>Players are choosing their matches...</Text>
          </View>
          <View style={styles.hostSelectionBody}>
            <View style={styles.hostStatCard}>
              <Text style={styles.hostStatValue}>{answers.length}</Text>
              <Text style={styles.hostStatLabel}>Answers submitted</Text>
            </View>
            <Text style={styles.hostWaitingText}>
              Wait for players to select their matches, then advance.
            </Text>
          </View>
          <TouchableOpacity style={styles.hostBtn} onPress={handleNextQuestion}>
            <Text style={styles.hostBtnText}>
              {session.currentQuestionIndex < session.questionIds.length - 1
                ? 'Next Question →'
                : 'End Game'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const myAnswerIdx = myAnswer ?? -1;
    const usersWhoMatchedMe = answers.filter(
      (a) => a.userId !== appUser?.id && a.selectedOption === myAnswerIdx
    );

    return (
      <View style={styles.container}>
        <View style={styles.selectionHeader}>
          {/* <Text style={styles.selectionTitle}>Choose your match!</Text> */}
          <Text style={styles.selectionTitle}>Group {ANSWER_SHAPES[myAnswerIdx % 4]}</Text>
          <Text style={styles.selectionSub}>
            {usersWhoMatchedMe.length > 0
              ? `${usersWhoMatchedMe.length} player${usersWhoMatchedMe.length !== 1 ? 's' : ''} answered like you. Chat with others in the group and select who you match with!`
              : 'Nobody answered the same...'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.selectionGrid}>
          {answers
            .filter((a) => a.userId !== appUser?.id)
            .map((a) => {
              const matched = a.selectedOption === myAnswerIdx;
              const participant = participants.find((p) => p.userId === a.userId);
              const isSelected = selectedUserIds.includes(a.userId);
              return (
                <TouchableOpacity
                  key={a.userId}
                  onPress={() => handleSelectUser(a.userId)}
                  style={[
                    styles.selectionCard,
                    matched && styles.selectionCardMatch,
                    isSelected && styles.selectionCardSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <Avatar uri={participant?.avatarUrl} size="lg" />
                  <Text style={styles.selectionName}>{participant?.username ?? a.userId.slice(0, 8)}</Text>
                  {matched && isSelected && <Text style={styles.matchTag}>LIKED!</Text>}
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>
    );
  }

  const timerColor = timeLeft <= 5 ? colors.primary : timeLeft <= 10 ? colors.yellow : colors.white;
  const progressPct = question.timeLimitSeconds > 0 ? timeLeft / question.timeLimitSeconds : 0;

  if (isHost) {
    return (
      <View style={styles.container}>
        <View style={styles.questionHeader}>
          <View style={styles.timerRow}>
            <Animated.Text
              style={[styles.timer, { color: timerColor, transform: [{ scale: pulse }] }]}
            >
              {timeLeft}
            </Animated.Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progressPct * 100}%`, backgroundColor: timerColor }]} />
            </View>
          </View>

          <View style={styles.questionMeta}>
            <Text style={styles.questionCounter}>
              {session.currentQuestionIndex + 1} / {session.questionIds.length}
            </Text>
            <View style={styles.answeredPill}>
              <Text style={styles.answeredText}>{answeredCount} answered</Text>
            </View>
          </View>

          <Text style={styles.questionText}>{question.questionText}</Text>
        </View>

        <View style={styles.hostAnswerPreview}>
          {question.options.map((option, idx) => (
            <View
              key={idx}
              style={[styles.hostAnswerRow, { borderLeftColor: ANSWER_COLORS[idx % 4] }]}
            >
              <Text style={[styles.hostAnswerShape, { color: ANSWER_COLORS[idx % 4] }]}>
                {ANSWER_SHAPES[idx % 4]}
              </Text>
              <Text style={styles.hostAnswerOptionText}>{option}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.hostBtn} onPress={handleHostEndQuestion}>
          <Text style={styles.hostBtnText}>End Question & Show Selection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <View style={styles.timerRow}>
          <Animated.Text
            style={[styles.timer, { color: timerColor, transform: [{ scale: pulse }] }]}
          >
            {timeLeft}
          </Animated.Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPct * 100}%`, backgroundColor: timerColor }]} />
          </View>
        </View>

        <View style={styles.questionMeta}>
          <Text style={styles.questionCounter}>
            {session.currentQuestionIndex + 1} / {session.questionIds.length}
          </Text>
        </View>

        <Text style={styles.questionText}>{question.questionText}</Text>
      </View>

      <View style={styles.answersGrid}>
        {question.options.map((option, idx) => {
          const selected = myAnswer === idx;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => handleAnswer(idx)}
              disabled={!appUser}
              activeOpacity={0.85}
              style={[
                styles.answerBtn,
                { backgroundColor: ANSWER_COLORS[idx % 4] },
                selected && styles.answerSelected,
                myAnswer !== null && !selected && styles.answerDimmed,
              ]}
            >
              <Text style={styles.answerShape}>{ANSWER_SHAPES[idx % 4]}</Text>
              <Text style={styles.answerText}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {myAnswer !== null && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingText}>Answer locked in! Waiting for others...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted, fontSize: fontSize.base },
  blockedScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: 16,
  },
  blockedIcon: { fontSize: 56 },
  blockedTitle: { fontSize: fontSize['2xl'], fontWeight: '900', color: colors.white, textAlign: 'center' },
  blockedSub: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  blockedBtn: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockedBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  questionHeader: {
    backgroundColor: colors.surface,
    padding: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  timer: { fontSize: fontSize['3xl'], fontWeight: '900', minWidth: 52 },
  progressTrack: { flex: 1, height: 8, backgroundColor: colors.subtle, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: 8, borderRadius: 4, minWidth: 4 },
  questionMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  questionCounter: { fontSize: fontSize.sm, fontWeight: '700', color: colors.muted },
  answeredPill: {
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  answeredText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.accent },
  questionText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 32,
  },

  answersGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[3],
    gap: 8,
    alignContent: 'center',
  },
  answerBtn: {
    width: '47.5%',
    minHeight: 120,
    borderRadius: radius.xl,
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  answerSelected: {
    borderWidth: 4,
    borderColor: colors.white,
    transform: [{ scale: 1.03 }],
  },
  answerDimmed: { opacity: 0.45 },
  answerShape: { fontSize: 28, color: 'rgba(255,255,255,0.5)' },
  answerText: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 22,
  },

  hostBtn: {
    margin: spacing[5],
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hostBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  waitingBanner: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[5],
    backgroundColor: `${colors.accent}22`,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  waitingText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.accent },

  selectionHeader: {
    padding: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectionTitle: { fontSize: fontSize['2xl'], fontWeight: '900', color: colors.white, marginBottom: 4 },
  selectionSub: { fontSize: fontSize.sm, color: colors.muted },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: 12,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  selectionCard: {
    width: 120,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing[4],
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectionCardMatch: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}22`,
  },
  selectionCardSelected: {
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  selectionName: { fontSize: fontSize.xs, fontWeight: '700', color: colors.white },
  matchTag: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.white,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },

  hostAnswerPreview: {
    flex: 1,
    padding: spacing[5],
    gap: 10,
    justifyContent: 'center',
  },
  hostAnswerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderLeftWidth: 4,
  },
  hostAnswerShape: { fontSize: 22, width: 28 },
  hostAnswerOptionText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  hostSelectionBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: 20,
  },
  hostStatCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: 160,
  },
  hostStatValue: { fontSize: 48, fontWeight: '900', color: colors.white },
  hostStatLabel: { fontSize: fontSize.sm, color: colors.muted, marginTop: 4 },
  hostWaitingText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  endScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: 16,
  },
  endTitle: { fontSize: 48, fontWeight: '900', color: colors.white },
  endSub: { fontSize: fontSize.lg, color: colors.muted, marginBottom: 8 },
  endBtn: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  endBtnText: { fontSize: fontSize.base, fontWeight: '800', color: colors.white },
});
