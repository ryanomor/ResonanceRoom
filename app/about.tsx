import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import { colors, fontSize, spacing, radius } from '../src/theme';

const HERO_IMAGE =
  'https://images.pexels.com/photos/16374127/pexels-photo-16374127.jpeg?auto=compress&cs=tinysrgb&w=1200';
const EVENTS_IMAGE =
  'https://images.pexels.com/photos/6174132/pexels-photo-6174132.jpeg?auto=compress&cs=tinysrgb&w=1200';
const COMMUNITY_IMAGE =
  'https://images.pexels.com/photos/6174144/pexels-photo-6174144.jpeg?auto=compress&cs=tinysrgb&w=1200';

const EVENT_STEPS = [
  {
    emoji: '🎯',
    title: 'The Low-Pressure Icebreaker',
    body: "When you arrive, you'll log into the Venn app. The host will drop fun, personality-driven trivia questions like \"What's your ideal Sunday morning?\" or \"What's your ultimate travel style?\"",
  },
  {
    emoji: '⚡',
    title: 'Instant Matching',
    body: 'As soon as you lock in your answer, the app does the heavy lifting. It instantly shows you everyone else in the room who answered the exact same way.',
  },
  {
    emoji: '💬',
    title: 'Mini "Speed-Dates"',
    body: 'You\'ll get a few minutes to head over, meet your "matches," and chat about your answers. Because you already know you have something in common, the conversation flows naturally.',
  },
  {
    emoji: '🤫',
    title: "The Secret 'Like'",
    body: 'If you click with someone, secretly hit "Like" in the app. If the feeling is mutual, you\'ll get a match at the end of the night!',
  },
  {
    emoji: '🥳',
    title: 'Mix & Mingle',
    body: 'After the game wraps up, the floor is open. Keep talking to your matches in person, or catch up with them in the app later.',
  },
];

export default function AboutScreen() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>SKIP THE SWIPE</Text>
        <Text style={styles.title}>
          Find your <Text style={styles.titleAccent}>Venn</Text> match
        </Text>
        <Text style={styles.subtitle}>Where real connections begin</Text>
      </View>

      <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} />

      {/* About This Group */}
      <View style={styles.section}>
        <Text style={styles.heading}>About This Group</Text>
        <Text style={styles.body}>
          Are you tired of the endless swiping, the ghosting, and the exhausting digital small
          talk? Welcome to the antidote.
        </Text>
        <Text style={styles.body}>
          Venn is a community for people who want to skip the screen and actually meet people in
          real life. We are a group of young professionals, creatives, and locals who believe the
          best connections happen over shared laughs, not algorithms. Whether you are looking for
          romance, a new best friend, or just a fun night out, this is your zone.
        </Text>
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            No awkward cold approaches. No pressure to drink. Just good vibes and a room full of
            people who already share your wave.
          </Text>
        </View>
      </View>

      {/* What We Do */}
      <View style={styles.section}>
        <Image source={{ uri: EVENTS_IMAGE }} style={styles.sectionImage} />
        <Text style={styles.heading}>What We Do At Our Events</Text>
        <Text style={styles.body}>
          We host live, interactive social trivia nights at some of the coolest venues around the
          city. Here is exactly what to expect when you show up:
        </Text>
        {EVENT_STEPS.map((step, index) => (
          <View key={step.title} style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepEmoji}>{step.emoji}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                {index + 1}. {step.title}
              </Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Who You'll Meet */}
      <View style={styles.section}>
        <Image source={{ uri: COMMUNITY_IMAGE }} style={styles.communityImage} />
        <Text style={styles.heading}>Who You'll Meet Here</Text>
        <Text style={styles.body}>
          This group is for anyone in their 20s and 30s who values real conversation and genuine
          connection. Our members are authentic, curious, open-minded, and ready to socialize in a
          structured, safe environment where nobody feels left out.
        </Text>
        <Text style={styles.body}>
          If you're ready to find out where you overlap with the coolest people in the city, sign
          up and grab a spot at our next event. Let's find your Venn match.
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.links}>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.8}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.ctaText}>Grab a Spot at Our Next Event</Text>
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
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing[8],
    alignItems: 'center',
  },
  heroKicker: {
    fontFamily: 'Poppins_700Bold',
    fontSize: fontSize.sm,
    letterSpacing: 3,
    color: colors.accent,
    marginBottom: spacing[3],
  },
  title: {
    fontFamily: 'Poppins_900Black',
    fontSize: fontSize['4xl'],
    lineHeight: 50,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  titleAccent: {
    color: colors.primary,
  },
  subtitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: fontSize.md,
    color: colors.muted,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: radius.xl,
    marginBottom: spacing[10],
  },
  section: {
    marginBottom: spacing[10],
  },
  sectionImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    marginBottom: spacing[5],
  },
  communityImage: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: radius.lg,
    marginBottom: spacing[5],
  },
  heading: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: fontSize['2xl'],
    color: colors.white,
    marginBottom: spacing[3],
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: fontSize.base,
    color: colors.offwhite,
    lineHeight: 26,
    marginBottom: spacing[3],
  },
  callout: {
    backgroundColor: colors.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing[4],
    marginTop: spacing[2],
  },
  calloutText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: fontSize.md,
    color: colors.primary,
    lineHeight: 24,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  stepBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: fontSize.base,
    color: colors.white,
    marginBottom: spacing[1],
  },
  stepBody: {
    fontFamily: 'Poppins_400Regular',
    fontSize: fontSize.sm,
    color: colors.muted,
    lineHeight: 22,
  },
  links: {
    alignItems: 'center',
    gap: spacing[5],
    marginTop: spacing[4],
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: radius.full,
  },
  ctaText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: fontSize.md,
    color: colors.bg,
  },
  link: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: fontSize.base,
    color: colors.primary,
  },
  footer: {
    marginTop: spacing[10],
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
