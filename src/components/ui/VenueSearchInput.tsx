import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  Modal,
  FlatList,
} from 'react-native';
import { useVenueSearch, VenueResult } from '../../hooks/useVenueSearch';
import { colors, radius, fontSize, spacing } from '../../theme';

interface Props {
  label?: string;
  value: string;
  onSelect: (address: string) => void;
  cityBias?: string;
  containerStyle?: ViewStyle;
  error?: string;
  placeholder?: string;
}

export function VenueSearchInput({
  label,
  value,
  onSelect,
  cityBias,
  containerStyle,
  error,
  placeholder = 'Search venue or address...',
}: Props) {
  const { results, loading, search, clear } = useVenueSearch();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rowRef = useRef<View>(null);

  function handleChange(val: string) {
    setText(val);
    onSelect(val);
    search(val, cityBias);
  }

  function handleFocus() {
    rowRef.current?.measureInWindow((x, y, w, h) => {
      setDropPos({ top: y + h + 4, left: x, width: w });
      setOpen(true);
    });
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      clear();
    }, 200);
  }

  function handleSelect(item: VenueResult) {
    setText(item.shortName);
    onSelect(item.shortName);
    clear();
    setOpen(false);
  }

  const showList = results.length > 0 || loading;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        ref={rowRef}
        style={[styles.inputRow, open && styles.focused, error ? styles.errorBorder : null]}
      >
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading && <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {open && dropPos && (
        <Modal visible={showList} transparent animationType="none" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setOpen(false); clear(); }}
          />
          <View style={[styles.dropdown, { top: dropPos.top, left: dropPos.left, width: dropPos.width }]}>
            <FlatList
              data={loading && results.length === 0 ? [] : results}
              keyExtractor={(item, i) => `${item.lat}-${item.lon}-${i}`}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                loading ? (
                  <View style={styles.item}>
                    <Text style={styles.muted}>Searching...</Text>
                  </View>
                ) : null
              }
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[styles.item, index < results.length - 1 && styles.divider]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.primary} numberOfLines={1}>{item.shortName}</Text>
                  <Text style={styles.secondary} numberOfLines={2}>{item.displayName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.offwhite,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focused: { borderColor: colors.accent },
  errorBorder: { borderColor: colors.error },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.white,
  },
  spinner: { marginLeft: 8 },
  errorText: { fontSize: fontSize.xs, color: colors.error, marginTop: 2 },
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 260,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  item: {
    paddingHorizontal: spacing[4],
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  primary: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  secondary: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  muted: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
});
