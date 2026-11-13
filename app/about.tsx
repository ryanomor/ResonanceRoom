import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../src/theme';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Venn Match</Text>
        <Text style={styles.subtitle}>Where real connections begin</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>What is Venn Match?</Text>
        <Text style={styles.body}>
          Venn Match is a social dating app that brings people together through shared experiences rather than superficial swiping. Instead of judging someone by a photo, you discover compatibility by answering fun, meaningful questions together in real-time game rooms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>How it works</Text>
        <Text style={styles.body}>
          1. Join or create a room in your city with a group of other singles.
        </Text>
        <Text style={styles.body}>
          2. Play a fast-paced question game covering topics like lifestyle, food, travel, humor, values, and more.
        </Text>
        <Text style={styles.body}>
          3. See who you overlap with. When your answers align, you land in each other's Venn diagram — the intersection where compatibility lives.
        </Text>
        <Text style={styles.body}>
          4. Match and chat with the people you genuinely connected with.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Why Venn Match?</Text>
        <Text style={styles.body}>
          Traditional dating apps reduce people to a photo and a bio. Venn Match flips the script — you connect through personality, humor, and values first. Our question-based matching creates deeper, more intentional connections from the very start.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Built for real life</Text>
        <Text style={styles.body}>
          Every room is tied to a city, a time, and a venue. Venn Match is designed to lead to real dates in real places — not endless messaging that goes nowhere. Meet people who share your vibe, in your city, on your schedule.
        </Text>
      </View>

      <View style={styles.links}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
          <Text style={styles.link}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Venn Match 2025. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing[6],
    paddingTop: spacing[16],
    paddingBottom: spacing[12],
  },
  hero: {
    marginBottom: spacing[10],
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.muted,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing[8],
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing[3],
  },
  body: {
    fontSize: fontSize.base,
    color: colors.offwhite,
    lineHeight: 24,
    marginBottom: spacing[2],
  },
  links: {
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[8],
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: 999,
  },
  ctaText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.bg,
  },
  link: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing[10],
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
