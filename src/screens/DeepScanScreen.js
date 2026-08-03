import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';

export const DeepScanScreen = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const startScan = () => {
    setIsScanning(true);
    setScanProgress(15);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

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

        <Text style={styles.headerTitle}>Deep Scan & Clean</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.scanCard}>
          <Text style={styles.scanIcon}>🔍</Text>
          <Text style={styles.scanTitle}>Deep Storage Inspection</Text>
          <Text style={styles.scanSubtitle}>
            Scan internal memory, SD card, cache data, and hidden duplicated files.
          </Text>

          {isScanning ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color={COLORS.primaryLight} style={{ marginBottom: 16 }} />
              <Text style={styles.progressText}>Scanning Storage Engine... {scanProgress}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startScan}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>⚡ Start Deep Scan Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Features Checklist */}
        <Text style={styles.sectionHeader}>Included Scanners</Text>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📸</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Exact & Similar Photos</Text>
            <Text style={styles.featureDesc}>Detect duplicate photos taken in burst mode</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🎥</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Duplicate Videos</Text>
            <Text style={styles.featureDesc}>Find identical video files saving GBs of space</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📁</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Documents & Archives</Text>
            <Text style={styles.featureDesc}>Scans PDF, DOCX, ZIP files for redundant copies</Text>
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
  scanCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 24,
  },
  scanIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
