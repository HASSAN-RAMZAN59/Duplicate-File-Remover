import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';

export const HelpScreen = ({ navigation }) => {
  const faqs = [
    {
      q: 'How does Duplicate File Remover identify duplicates?',
      a: 'The application scans file content byte-by-byte using cryptographic hashing algorithms to ensure only exact duplicates are flagged.',
    },
    {
      q: 'Is it safe to delete the detected files?',
      a: 'Yes, the app keeps at least one original copy untouched while allowing you to safely clean extra duplicates.',
    },
    {
      q: 'Why does the app require Storage permission?',
      a: 'Storage permission is essential for indexing your photos, videos, audio, and documents to find redundant files.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate(ROUTES.HOME)}
          activeOpacity={0.7}
          accessibilityLabel="Go Back to Home"
        >
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>❓</Text>
          <Text style={styles.bannerTitle}>How can we help you?</Text>
          <Text style={styles.bannerSub}>Find quick answers or contact our technical support team.</Text>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map((item, idx) => (
          <View key={idx} style={styles.faqCard}>
            <Text style={styles.question}>Q: {item.q}</Text>
            <Text style={styles.answer}>{item.a}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Need Direct Support?</Text>
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>✉️ Contact Engineering Team</Text>
          <Text style={styles.supportDesc}>
            Encountered an issue or have a feature request? Reach out to support@duplicatefileremover.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight + '60',
  },
  backIconText: {
    fontSize: 22,
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
  },
  banner: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 24,
  },
  bannerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  faqCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  question: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginBottom: 6,
  },
  answer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  supportCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 4,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  supportDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
