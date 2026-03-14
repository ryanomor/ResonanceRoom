import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  FlatList,
} from 'react-native';
import { useCitySearch, CityResult } from '../../hooks/useCitySearch';
import { colors, radius, fontSize, spacing } from '../../theme';

interface Props {
  label?: string;
  value: string;
  onSelect: (city: string) => void;
  containerStyle?: ViewStyle;
  error?: string;
}

export function CitySearchInput({ label, value, onSelect, containerStyle, error }: Props) {
  const { results, loading, search, clear } = useCitySearch();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const isFocused = React.useRef(false);

  function handleChange(val: string) {
    setText(val);
    onSelect(val);
    search(val);
  }

  function handleFocus() {
    isFocused.current = true;
    setOpen(true);
  }

  function handleBlur() {
    isFocused.current = false;
    setTimeout(() => {
      if (!isFocused.current) {
        setOpen(false);
        clear();
      }
    }, 200);
  }

  function handleSelect(item: CityResult) {
    setText(item.name);
    onSelect(item.name);
    clear();
    setOpen(false);
  }

  const hasContent = text.trim().length >= 2;
  const showDropdown = open && hasContent && (loading || results.length > 0);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, open && styles.focused, error ? styles.errorBorder : null]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search city..."
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading && <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {showDropdown && (
        <View style={styles.dropdown}>
          <FlatList
            data={loading && results.length === 0 ? [] : results}
            keyExtractor={(item, i) => `${item.lat}-${item.lon}-${i}`}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
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
                <Text style={styles.primary} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.secondary} numberOfLines={1}>{item.displayName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
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
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
