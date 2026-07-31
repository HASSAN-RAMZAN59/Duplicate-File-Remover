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

export const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.drawerButton}
          onPress={() => navigation.openDrawer()}
          activeOpacity={0.7}
          accessibilityLabel="Open Navigation Drawer"
        >
          <Text style={styles.hamburgerIconText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <Text style={styles.title}>100% Local File Scanning</Text>
          <Text style={styles.subtitle}>
            Your privacy is our highest priority. All scanning processes take place strictly on your local device.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>1. Zero Data Collection</Text>
          <Text style={styles.paragraph}>
            Duplicate File Remover does NOT upload, transmit, or store any of your personal files, photos, contacts, or document contents to external cloud servers.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>2. Storage Permissions Usage</Text>
          <Text style={styles.paragraph}>
            Storage access is requested strictly to locate, analyze, and present duplicate files for deletion upon your explicit request.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>3. Security Guarantees</Text>
          <Text style={styles.paragraph}>
            No background indexing or analytics tracking is conducted without explicit user consent. You retain full control over file deletion at all times.
          </Text>
        </View>

        <Text style={styles.footerNote}>Last Updated: July 2026</Text>
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
  drawerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight + '60',
  },
  hamburgerIconText: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  shieldIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 16,
    marginBottom: 20,
  },
});
