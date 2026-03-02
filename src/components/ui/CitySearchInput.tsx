import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  ViewStyle,
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
  const [focused, setFocused] = useState(false);
  const showDropdown = focused && (results.length > 0 || loading);

  function handleChange(val: string) {
    setText(val);
    onSelect(val);
    search(val);
  }

  function handleSelect(item: CityResult) {
    setText(item.displayName);
    onSelect(item.displayName);
    clear();
    setFocused(false);
  }

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, focused && styles.focused, error ? styles.errorBorder : null]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
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
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {results.length === 0 && loading && (
              <View style={styles.dropdownItem}>
                <Text style={styles.dropdownMuted}>Searching...</Text>
              </View>
            )}
            {results.map((item, i) => (
              <TouchableOpacity
                key={`${item.lat}-${item.lon}-${i}`}
                style={[styles.dropdownItem, i < results.length - 1 && styles.dropdownDivider]}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.dropdownPrimary} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.dropdownSecondary} numberOfLines={1}>
                  {item.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    position: 'absolute',
    top: 82,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 999,
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: 12,
  },
  dropdownDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownPrimary: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  dropdownSecondary: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },
  dropdownMuted: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
});
