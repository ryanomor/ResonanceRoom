import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { colors, fontSize, spacing, radius } from '../../theme';
import { Ionicons, Feather } from '@expo/vector-icons';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDisplay(date: Date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function DateTimePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'date' | 'time'>('date');
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selected, setSelected] = useState(new Date(value));

  function openPicker() {
    setSelected(new Date(value));
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
    setTab('date');
    setOpen(true);
  }

  function confirm() {
    onChange(selected);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const d = new Date(selected);
    d.setFullYear(viewYear, viewMonth, day);
    setSelected(d);
  }

  function setHour(h: number) {
    const d = new Date(selected);
    d.setHours(h);
    setSelected(d);
  }

  function setMinute(m: number) {
    const d = new Date(selected);
    d.setMinutes(m);
    setSelected(d);
  }

  const today = new Date();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selDay = selected.getDate();
  const selMonth = selected.getMonth();
  const selYear = selected.getFullYear();
  const selHour = selected.getHours();
  const selMinute = selected.getMinutes();

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker} activeOpacity={0.8}>
        <Feather name="calendar" size={16} color={colors.accent} />
        <Text style={styles.triggerText}>{formatDisplay(value)}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Schedule Start</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, tab === 'date' && styles.tabActive]}
                onPress={() => setTab('date')}
              >
                <Feather name="calendar" size={14} color={tab === 'date' ? colors.white : colors.muted} />
                <Text style={[styles.tabLabel, tab === 'date' && styles.tabLabelActive]}>Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'time' && styles.tabActive]}
                onPress={() => setTab('time')}
              >
                <Feather name="clock" size={14} color={tab === 'time' ? colors.white : colors.muted} />
                <Text style={[styles.tabLabel, tab === 'time' && styles.tabLabelActive]}>Time</Text>
              </TouchableOpacity>
            </View>

            {tab === 'date' ? (
              <View style={styles.calendarWrap}>
                <View style={styles.monthNav}>
                  <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={colors.white} />
                  </TouchableOpacity>
                  <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
                  <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>

                <View style={styles.dayHeaderRow}>
                  {DAYS.map(d => (
                    <Text key={d} style={styles.dayHeader}>{d}</Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {cells.map((day, i) => {
                    const isSelected = day !== null && day === selDay && viewMonth === selMonth && viewYear === selYear;
                    const isPast = day !== null && new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.cell, isSelected && styles.cellSelected, isPast && styles.cellPast]}
                        onPress={() => !isPast && day && selectDay(day)}
                        disabled={isPast || day === null}
                        activeOpacity={0.7}
                      >
                        {day !== null && (
                          <Text style={[styles.cellText, isSelected && styles.cellTextSelected, isPast && styles.cellTextPast]}>
                            {day}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={styles.nextBtn} onPress={() => setTab('time')}>
                  <Text style={styles.nextBtnText}>Set Time →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.timeWrap}>
                <Text style={styles.timeLabel}>
                  {selHour % 12 === 0 ? 12 : selHour % 12}:{String(selMinute).padStart(2, '0')} {selHour < 12 ? 'AM' : 'PM'}
                </Text>

                <Text style={styles.timeSectionLabel}>Hour</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                  <View style={styles.timeRow}>
                    {hours.map(h => {
                      const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[styles.timeChip, selHour === h && styles.timeChipActive]}
                          onPress={() => setHour(h)}
                        >
                          <Text style={[styles.timeChipText, selHour === h && styles.timeChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <Text style={[styles.timeSectionLabel, { marginTop: spacing[4] }]}>Minute</Text>
                <View style={styles.minuteGrid}>
                  {minutes.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.minuteChip, selMinute === m && styles.timeChipActive]}
                      onPress={() => setMinute(m)}
                    >
                      <Text style={[styles.timeChipText, selMinute === m && styles.timeChipTextActive]}>
                        :{String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
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
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerText: {
    fontSize: fontSize.base,
    color: colors.white,
    flex: 1,
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.white,
  },
  cancelText: {
    fontSize: fontSize.base,
    color: colors.muted,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    margin: spacing[4],
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.white,
  },
  calendarWrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  navBtn: {
    padding: 8,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
  },
  monthLabel: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  cellSelected: {
    backgroundColor: colors.accent,
  },
  cellPast: {},
  cellText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.white,
  },
  cellTextSelected: {
    color: colors.white,
    fontWeight: '800',
  },
  cellTextPast: {
    color: colors.subtle,
  },
  nextBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing[4],
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  nextBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  timeWrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  timeLabel: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  timeSectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  timeScroll: { marginHorizontal: -spacing[4] },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing[4],
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  timeChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.muted,
  },
  timeChipTextActive: {
    color: colors.white,
  },
  minuteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  minuteChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 56,
    alignItems: 'center',
  },
  confirmBtn: {
    marginTop: spacing[5],
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.white,
  },
});
