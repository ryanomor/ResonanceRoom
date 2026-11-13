import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../src/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.lastUpdated}>Last updated: July 15, 2025</Text>

      <View style={styles.section}>
        <Text style={styles.heading}>1. Introduction</Text>
        <Text style={styles.body}>
          Venn Match ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>2. Information We Collect</Text>
        <Text style={styles.subheading}>Account Information</Text>
        <Text style={styles.body}>
          When you create an account, we collect your name, email address, date of birth, gender, city, and profile photos you choose to upload.
        </Text>
        <Text style={styles.subheading}>Usage Data</Text>
        <Text style={styles.body}>
          We collect information about how you interact with the Service, including rooms joined, game responses, matches made, and messages sent.
        </Text>
        <Text style={styles.subheading}>Device Information</Text>
        <Text style={styles.body}>
          We may collect device type, operating system, unique device identifiers, and mobile network information.
        </Text>
        <Text style={styles.subheading}>Location</Text>
        <Text style={styles.body}>
          We collect the city you select for discovering rooms. We do not collect precise GPS location without your explicit consent.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>3. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use the information we collect to:{'\n'}
          {'\n'}{'\u2022'} Provide, maintain, and improve the Service{'\n'}
          {'\u2022'} Match you with other users based on game responses{'\n'}
          {'\u2022'} Enable communication between matched users{'\n'}
          {'\u2022'} Send you notifications related to your account and matches{'\n'}
          {'\u2022'} Monitor and analyze usage trends to improve user experience{'\n'}
          {'\u2022'} Detect, prevent, and address fraud, abuse, or technical issues{'\n'}
          {'\u2022'} Comply with legal obligations
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>4. Sharing of Information</Text>
        <Text style={styles.body}>
          We do not sell your personal information. We may share your information in the following circumstances:{'\n'}
          {'\n'}{'\u2022'} With other users as part of the matching and chat features{'\n'}
          {'\u2022'} With service providers who assist in operating the Service{'\n'}
          {'\u2022'} When required by law or to protect our rights{'\n'}
          {'\u2022'} In connection with a merger, acquisition, or sale of assets
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>5. Data Security</Text>
        <Text style={styles.body}>
          We implement industry-standard security measures to protect your personal information, including encryption in transit and at rest. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>6. Data Retention</Text>
        <Text style={styles.body}>
          We retain your personal information for as long as your account is active or as needed to provide you the Service. You may request deletion of your account and associated data at any time by contacting us.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>7. Your Rights</Text>
        <Text style={styles.body}>
          Depending on your jurisdiction, you may have the right to:{'\n'}
          {'\n'}{'\u2022'} Access the personal data we hold about you{'\n'}
          {'\u2022'} Request correction of inaccurate data{'\n'}
          {'\u2022'} Request deletion of your data{'\n'}
          {'\u2022'} Object to or restrict processing of your data{'\n'}
          {'\u2022'} Data portability{'\n'}
          {'\u2022'} Withdraw consent at any time
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>8. Third-Party Services</Text>
        <Text style={styles.body}>
          The Service may contain links to or integrate with third-party services (e.g., payment processors, authentication providers). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>9. Children's Privacy</Text>
        <Text style={styles.body}>
          The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a minor, we will take steps to delete it promptly.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>10. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy within the app or sending a notification. Your continued use of the Service after changes are posted constitutes acceptance of the revised policy.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>11. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions or concerns about this Privacy Policy or our data practices, please contact us at support@vennmatch.com.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push('/about')}>
          <Text style={styles.link}>About Venn Match</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing[2],
  },
  lastUpdated: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[6],
  },
  heading: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing[2],
  },
  subheading: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.offwhite,
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  body: {
    fontSize: fontSize.base,
    color: colors.offwhite,
    lineHeight: 24,
    marginBottom: spacing[2],
  },
  footer: {
    marginTop: spacing[10],
    alignItems: 'center',
  },
  link: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
