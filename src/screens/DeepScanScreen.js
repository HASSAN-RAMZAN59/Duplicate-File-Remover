import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';
import { runDeepScan } from '../engine/deepScanEngine';
import { deleteBatch } from '../engine/fileDeleter';
import { formatBytes } from '../engine/hashEngine';

export const DeepScanScreen = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // Trigger Deep Scan
  const handleStartDeepScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentCategory('Initializing...');

    try {
      const results = await runDeepScan((progress, categoryName) => {
        setScanProgress(progress);
        setCurrentCategory(categoryName);
      });

      setScanResults(results);
    } catch (error) {
      console.error('[DeepScanScreen] Scan failed:', error);
      Alert.alert('Scan Failed', 'Could not complete system deep scan.');
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-run Deep Scan on Screen Load
  useEffect(() => {
    handleStartDeepScan();
  }, []);

  // 1-Tap Clean All Selected Duplicates Handler
  const handleCleanAll = () => {
    if (!scanResults || scanResults.allPreselectedFiles.length === 0) {
      Alert.alert('No Duplicates', 'There are no duplicates selected to clean.');
      return;
    }

    const fileCount = scanResults.allPreselectedFiles.length;
    const formattedSize = scanResults.totalReclaimableFormatted;

    Alert.alert(
      '⚡ 1-Tap Clean All',
      `Are you sure you want to permanently delete all ${fileCount} duplicate items and free up ${formattedSize} of storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean All Now',
          style: 'destructive',
          onPress: async () => {
            setIsCleaning(true);

            try {
              const res = await deleteBatch(scanResults.allPreselectedFiles);

              Alert.alert(
                'Deep Clean Successful 🎉',
                `Removed ${res.deletedCount} duplicate items and freed ${res.freedFormatted} of storage!`
              );

              // Re-run scan to refresh state
              handleStartDeepScan();
            } catch (err) {
              Alert.alert('Cleanup Warning', 'Some files could not be removed.');
            } finally {
              setIsCleaning(false);
            }
          },
        },
      ]
    );
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.scanCard}>
          <Text style={styles.scanIcon}>🔍</Text>
          <Text style={styles.scanTitle}>Deep Storage Inspection</Text>
          <Text style={styles.scanSubtitle}>
            Full system scan across Photos, Videos, Audios, Documents, Contacts, and Cache.
          </Text>

          {isScanning ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color={COLORS.primaryLight || '#3B82F6'} style={{ marginBottom: 16 }} />
              <Text style={styles.progressText}>
                Scanning {currentCategory}... {scanProgress}%
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
              </View>
            </View>
          ) : scanResults ? (
            <View style={styles.summaryContainer}>
              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{scanResults.totalDuplicateCount}</Text>
                  <Text style={styles.metricLabel}>Duplicates</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <Text style={styles.metricValueHighlight}>
                    {scanResults.totalReclaimableFormatted}
                  </Text>
                  <Text style={styles.metricLabel}>Space Reclaimable</Text>
                </View>
              </View>

              {scanResults.totalDuplicateCount > 0 ? (
                <TouchableOpacity
                  style={[styles.cleanAllButton, isCleaning && styles.disabledButton]}
                  onPress={handleCleanAll}
                  disabled={isCleaning}
                  activeOpacity={0.85}
                >
                  {isCleaning ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.cleanAllButtonText}>
                      ⚡ 1-Tap Clean All ({scanResults.totalReclaimableFormatted})
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.cleanStatusBadge}>
                  <Text style={styles.cleanStatusText}>✨ Storage Completely Clean!</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.rescanButton}
                onPress={handleStartDeepScan}
                activeOpacity={0.7}
              >
                <Text style={styles.rescanButtonText}>🔄 Re-Scan System</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartDeepScan}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>⚡ Start Deep Scan Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Breakdown Cards */}
        <Text style={styles.sectionHeader}>Category Scan Breakdown</Text>

        {scanResults && scanResults.categoryResults ? (
          Object.values(scanResults.categoryResults).map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={styles.categoryCard}
              onPress={() =>
                navigation.navigate(ROUTES.DUPLICATE_VIEWER, {
                  categoryType: cat.name,
                })
              }
              activeOpacity={0.75}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <View style={styles.catDetails}>
                <Text style={styles.catTitle}>{cat.name}</Text>
                <Text style={styles.catSubtitle}>
                  {cat.duplicateCount} Duplicate(s) Found
                </Text>
              </View>
              <View style={styles.catRight}>
                <Text style={styles.catBytes}>{cat.reclaimableFormatted}</Text>
                <Text style={styles.catArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.loadingBreakdown}>
            <ActivityIndicator size="small" color={COLORS.secondary || '#38BDF8'} />
            <Text style={styles.loadingBreakdownText}>Preparing breakdown metrics...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || '#0A0F1D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder || '#1E293B',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground || '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight ? COLORS.primaryLight + '60' : '#3B82F6',
  },
  backIconText: {
    fontSize: 22,
    color: COLORS.textPrimary || '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  scanCard: {
    backgroundColor: COLORS.cardBackground || '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder || '#334155',
    marginBottom: 24,
  },
  scanIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary || '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: COLORS.primary || '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textPrimary || '#FFFFFF',
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
    backgroundColor: COLORS.secondary || '#38BDF8',
  },
  summaryContainer: {
    width: '100%',
    alignItems: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder || '#334155',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  metricValueHighlight: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.success || '#10B981',
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textMuted || '#64748B',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.cardBorder || '#334155',
  },
  cleanAllButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  cleanAllButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cleanStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  cleanStatusText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 14,
  },
  rescanButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  rescanButtonText: {
    color: COLORS.secondary || '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
    marginBottom: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground || '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder || '#334155',
  },
  catIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  catDetails: {
    flex: 1,
  },
  catTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
    marginBottom: 2,
  },
  catSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted || '#64748B',
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catBytes: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success || '#10B981',
    marginRight: 8,
  },
  catArrow: {
    fontSize: 20,
    color: COLORS.textMuted || '#64748B',
  },
  loadingBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingBreakdownText: {
    color: COLORS.textMuted || '#64748B',
    fontSize: 13,
    marginLeft: 10,
  },
});
