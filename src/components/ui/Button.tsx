import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import { colors, radius, fontSize, fontWeight } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  onPress: () => void;
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: Props) {
  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.accent,
    ghost: 'transparent',
    danger: colors.error,
  };

  const sizeStyle: Record<Size, { height: number; px: number; fontSize: number }> = {
    sm: { height: 40, px: 16, fontSize: fontSize.sm },
    md: { height: 52, px: 24, fontSize: fontSize.base },
    lg: { height: 60, px: 32, fontSize: fontSize.md },
  };

  const s = sizeStyle[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: bg[variant],
          height: s.height,
          paddingHorizontal: s.px,
          borderRadius: radius.lg,
          opacity: disabled ? 0.5 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? colors.border : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { fontSize: s.fontSize, color: variant === 'ghost' ? colors.offwhite : colors.white },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
});
