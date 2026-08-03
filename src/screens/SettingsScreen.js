import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';

export const SettingsScreen = ({ navigation }) => {
  const [autoScan, setAutoScan] = useState(true);
  const [notifyDuplicates, setNotifyDuplicates] = useState(true);
  const [ignoreSmallFiles, setIgnoreSmallFiles] = useState(false);
  const [smartMatching, setSmartMatching] = useState(true);

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
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>Scanning Preferences</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Auto Background Scan</Text>
              <Text style={styles.settingDesc}>Periodically check storage for new duplicates</Text>
            </View>
            <Switch
              value={autoScan}
              onValueChange={setAutoScan}
              trackColor={{ false: '#334155', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Smart Content Matching</Text>
              <Text style={styles.settingDesc}>Use MD5 checksums for 100% duplicate accuracy</Text>
            </View>
            <Switch
              value={smartMatching}
              onValueChange={setSmartMatching}
              trackColor={{ false: '#334155', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>Ignore Files Under 100 KB</Text>
              <Text style={styles.settingDesc}>Skip small thumbnails & tiny cache items</Text>
            </View>
            <Switch
              value={ignoreSmallFiles}
              onValueChange={setIgnoreSmallFiles}
              trackColor={{ false: '#334155', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        <Text style={styles.sectionHeader}>Notifications & Alerts</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={styles.settingTitle}>High Junk Space Alerts</Text>
              <Text style={styles.settingDesc}>Notify when duplicate files exceed 1 GB</Text>
            </View>
            <Switch
              value={notifyDuplicates}
              onValueChange={setNotifyDuplicates}
              trackColor={{ false: '#334155', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        <Text style={styles.sectionHeader}>System Info</Text>
        <View style={styles.settingCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0 (Build 1001)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scan Engine</Text>
            <Text style={styles.infoValue}>v2.4 High Performance</Text>
          </View>
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
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  settingCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingTextGroup: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
});
