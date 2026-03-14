import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Question } from '../../types';
import { colors, fontSize, spacing, radius } from '../../theme';
import { Ionicons, Feather } from '@expo/vector-icons';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.green,
  medium: colors.yellow,
  hard: colors.error,
};

export function QuestionPicker({ selectedIds, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState<string[]>(selectedIds);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'questions'));
      const q: Question[] = snap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
      setQuestions(q);
    } finally {
      setLoading(false);
    }
  }

  function openPicker() {
    setLocal([...selectedIds]);
    fetchQuestions();
    setOpen(true);
  }

  function toggle(id: string) {
    setLocal(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function confirm() {
    onChange(local);
    setOpen(false);
  }

  const categories = Array.from(new Set(questions.map(q => q.category))).sort();

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker} activeOpacity={0.8}>
        <Feather name="list" size={16} color={colors.accent} />
        <Text style={styles.triggerText}>
          {selectedIds.length === 0
            ? 'Select questions...'
            : `${selectedIds.length} question${selectedIds.length === 1 ? '' : 's'} selected`}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{selectedIds.length}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Choose Questions</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={styles.done}>Done ({local.length})</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={styles.loaderText}>Loading questions...</Text>
              </View>
            ) : questions.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No questions found in the database.</Text>
              </View>
            ) : (
              <FlatList
                data={questions}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const checked = local.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.row, checked && styles.rowChecked]}
                      onPress={() => toggle(item.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.rowLeft}>
                        {checked
                          ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                          : <Ionicons name="ellipse-outline" size={22} color={colors.subtle} />
                        }
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.question} numberOfLines={2}>{item.questionText}</Text>
                        <View style={styles.meta}>
                          <View style={[styles.diffBadge, { backgroundColor: `${DIFFICULTY_COLORS[item.difficulty]}22`, borderColor: DIFFICULTY_COLORS[item.difficulty] }]}>
                            <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>{item.difficulty}</Text>
                          </View>
                          <Text style={styles.category}>{item.category}</Text>
                          <Text style={styles.timer}>{item.timeLimitSeconds}s</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.offwhite,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 100,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.white,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: {
    fontSize: fontSize.base,
    color: colors.muted,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.white,
  },
  done: {
    fontSize: fontSize.base,
    color: colors.accent,
    fontWeight: '700',
  },
  loader: {
    padding: spacing[8],
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  empty: {
    padding: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.muted,
    textAlign: 'center',
  },
  list: {
    padding: spacing[4],
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowChecked: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}18`,
  },
  rowLeft: {
    paddingTop: 2,
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  question: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.white,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  diffText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  category: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  timer: {
    fontSize: fontSize.xs,
    color: colors.subtle,
    marginLeft: 'auto',
  },
});
