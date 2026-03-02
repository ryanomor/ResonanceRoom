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
  useGameSession,
  useAnsweredCount,
} from '../../hooks/useGame';
import { getRoomById } from '../../hooks/useRooms';
import { useAuthStore } from '../../store/authStore';
import { createMatch } from '../../hooks/useMatches';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { GameSession, Question, UserAnswer } from '../../types';
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
  const [pulse] = useState(new Animated.Value(1));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const session = useGameSession(sessionId);
  const answeredCount = useAnsweredCount(sessionId, question?.id ?? null);

  useEffect(() => {
    if (!roomId || !appUser || initialized) return;
    setInitialized(true);

    (async () => {
      const room = await getRoomById(roomId);
      setIsHost(room?.hostId === appUser.id);

      let s = await getSessionByRoomId(roomId);
      if (!s && room?.hostId === appUser.id) {
        s = await createGameSession(roomId, room?.questionIds ?? []);
        if (s) {
          await updateGameSession(s.id, {
            gameState: 'question',
            questionStartTime: new Date().toISOString(),
            questionEndTime: new Date(Date.now() + 30000).toISOString(),
          });
        }
      }
      if (s) setSessionId(s.id);
    })();
  }, [roomId, appUser, initialized]);

  useEffect(() => {
    if (!session?.currentQuestionId) return;
    setMyAnswer(null);
    setSelectedUserId(null);
    getQuestion(session.currentQuestionId).then(setQuestion);
  }, [session?.currentQuestionIndex, session?.currentQuestionId]);

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

  const handleAnswer = useCallback(async (optionIndex: number) => {
    if (!session || !appUser || myAnswer !== null || session.gameState !== 'question') return;
    setMyAnswer(optionIndex);
    await submitAnswer({
      gameSessionId: session.id,
      userId: appUser.id,
      questionId: session.currentQuestionId!,
      selectedOption: optionIndex,
      answeredAt: new Date().toISOString(),
    });
  }, [session, appUser, myAnswer]);

  const handleHostEndQuestion = useCallback(async () => {
    if (!session) return;
    const answersData = await getAnswersForQuestion(session.id, session.currentQuestionId!);
    setAnswers(answersData);
    await updateGameSession(session.id, { gameState: 'selection' });
  }, [session]);

  const handleSelectUser = useCallback(async (targetUserId: string) => {
    if (!session || !appUser || selectedUserId) return;
    setSelectedUserId(targetUserId);
    await submitSelection({
      gameSessionId: session.id,
      questionId: session.currentQuestionId!,
      selectorUserId: appUser.id,
      selectedUserId: targetUserId,
      createdAt: new Date().toISOString(),
    });

    const myAnswerIndex = myAnswer ?? 0;
    const theirAnswer = answers.find((a) => a.userId === targetUserId)?.selectedOption;
    if (theirAnswer === myAnswerIndex) {
      await createMatch(session.id, appUser.id, targetUserId);
    }
  }, [session, appUser, selectedUserId, myAnswer, answers]);

  const handleNextQuestion = useCallback(async () => {
    if (!session) return;
    if (session.currentQuestionIndex < session.questionIds.length - 1) {
      const now = new Date();
      await updateGameSession(session.id, {
        currentQuestionIndex: session.currentQuestionIndex + 1,
        gameState: 'question',
        questionStartTime: now.toISOString(),
        questionEndTime: new Date(now.getTime() + 30000).toISOString(),
      });
    } else {
      await updateGameSession(session.id, { gameState: 'ended' });
    }
  }, [session]);

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
    const myAnswerIdx = myAnswer ?? -1;
    const usersWhoMatchedMe = answers.filter(
      (a) => a.userId !== appUser?.id && a.selectedOption === myAnswerIdx
    );

    return (
      <View style={styles.container}>
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionTitle}>Choose your match!</Text>
          <Text style={styles.selectionSub}>
            {usersWhoMatchedMe.length > 0
              ? `${usersWhoMatchedMe.length} player${usersWhoMatchedMe.length !== 1 ? 's' : ''} answered like you`
              : 'Nobody answered the same... try selecting anyone!'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.selectionGrid}>
          {answers
            .filter((a) => a.userId !== appUser?.id)
            .map((a) => {
              const matched = a.selectedOption === myAnswerIdx;
              return (
                <TouchableOpacity
                  key={a.userId}
                  onPress={() => handleSelectUser(a.userId)}
                  disabled={!!selectedUserId}
                  style={[
                    styles.selectionCard,
                    matched && styles.selectionCardMatch,
                    selectedUserId === a.userId && styles.selectionCardSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <Avatar name={a.userId} size="lg" />
                  <Text style={styles.selectionName}>{a.userId.slice(0, 8)}</Text>
                  {matched && <Text style={styles.matchTag}>MATCHED!</Text>}
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        {isHost && (
          <TouchableOpacity style={styles.hostBtn} onPress={handleNextQuestion}>
            <Text style={styles.hostBtnText}>
              {session.currentQuestionIndex < session.questionIds.length - 1
                ? 'Next Question →'
                : 'End Game'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const timerColor = timeLeft <= 5 ? colors.primary : timeLeft <= 10 ? colors.yellow : colors.white;
  const progressPct = question.timeLimitSeconds > 0 ? timeLeft / question.timeLimitSeconds : 0;

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
          {isHost && (
            <View style={styles.answeredPill}>
              <Text style={styles.answeredText}>{answeredCount} answered</Text>
            </View>
          )}
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
              disabled={myAnswer !== null || !appUser}
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

      {isHost && (
        <TouchableOpacity style={styles.hostBtn} onPress={handleHostEndQuestion}>
          <Text style={styles.hostBtnText}>End Question & Show Selection</Text>
        </TouchableOpacity>
      )}

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
