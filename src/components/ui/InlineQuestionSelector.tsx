import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Question } from '../../types';
import { colors, fontSize, spacing, radius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.green,
  medium: colors.yellow,
  hard: colors.error,
};

export function InlineQuestionSelector({ selectedIds, onChange }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const snap = await getDocs(collection(db, 'questions'));
        const q: Question[] = snap.docs.map(d => ({ ...d.data(), id: d.id } as Question));
        setQuestions(q);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id]
    );
  }

  const categories = Array.from(new Set(questions.map(q => q.category))).sort();
  const filteredQuestions = selectedCategories.length > 0
    ? questions.filter(q => selectedCategories.includes(q.category))
    : questions;

  const displayedQuestions = expanded ? filteredQuestions : filteredQuestions.slice(0, 5);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.loaderText}>Loading questions...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No questions found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {selectedIds.length} question{selectedIds.length === 1 ? '' : 's'} selected
        </Text>
      </View>

      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterContainer}
        >
          {selectedCategories.length > 0 && (
            <TouchableOpacity
              style={[styles.filterButton, styles.clearButton]}
              onPress={() => setSelectedCategories([])}
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
          {categories.map(category => {
            const isSelected = selectedCategories.includes(category);
            return (
              <TouchableOpacity
                key={category}
                style={[styles.filterButton, isSelected && styles.filterButtonActive]}
                onPress={() => {
                  setSelectedCategories(prev =>
                    isSelected
                      ? prev.filter(c => c !== category)
                      : [...prev, category]
                  );
                }}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.list}>
        {displayedQuestions.map(item => {
          const checked = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.row, checked && styles.rowChecked]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.75}
            >
              <View style={styles.rowLeft}>
                {checked
                  ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  : <Ionicons name="ellipse-outline" size={20} color={colors.subtle} />
                }
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.question} numberOfLines={2}>{item.questionText}</Text>
                <View style={styles.meta}>
                  <View style={[styles.diffBadge, { backgroundColor: `${DIFFICULTY_COLORS[item.difficulty]}22`, borderColor: DIFFICULTY_COLORS[item.difficulty] }]}>
                    <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>{item.difficulty}</Text>
                  </View>
                  <Text style={styles.category}>{item.category}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredQuestions.length > 5 && (
        <TouchableOpacity style={styles.showMoreBtn} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.showMoreText}>
            {expanded ? 'Show less' : `Show all ${filteredQuestions.length} questions`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: `${colors.accent}18`,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  summaryText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  loader: {
    padding: spacing[4],
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loaderText: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  empty: {
    padding: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  filterContainer: {
    maxHeight: 36,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  clearButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  clearText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.xs,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
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
    gap: 4,
  },
  question: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.white,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 100,
    borderWidth: 1,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  category: {
    fontSize: 10,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  showMoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  showMoreText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '700',
  },
});
