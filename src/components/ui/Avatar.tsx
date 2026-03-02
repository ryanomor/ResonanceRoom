import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  uri?: string;
  name?: string;
  size?: Size;
  style?: ViewStyle;
}

const sizes: Record<Size, number> = { sm: 32, md: 44, lg: 56, xl: 80 };

export function Avatar({ uri, name, size = 'md', style }: Props) {
  const dim = sizes[size];
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  return (
    <View
      style={[
        styles.container,
        { width: dim, height: dim, borderRadius: dim / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: dim, height: dim, borderRadius: dim / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: dim * 0.35 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
  },
});
