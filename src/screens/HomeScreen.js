import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { COLORS } from '../constants/colors';

const CATEGORIES = [
  {
    id: 'images',
    name: 'Images',
    icon: '🖼️',
    count: '128 Files',
    size: '420 MB',
    color: '#3B82F6',
  },
  {
    id: 'videos',
    name: 'Videos',
    icon: '🎥',
    count: '14 Files',
    size: '1.2 GB',
    color: '#8B5CF6',
  },
  {
    id: 'audio',
    name: 'Audio',
    icon: '🎵',
    count: '42 Tracks',
    size: '215 MB',
    color: '#EC4899',
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: '📄',
    count: '35 Files',
    size: '85 MB',
    color: '#10B981',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    icon: '👥',
    count: '8 Duplicates',
    size: 'Cleanable',
    color: '#F59E0B',
  },
  {
    id: 'others',
    name: 'Others',
    icon: '📦',
    count: '19 Files',
    size: '110 MB',
    color: '#6366F1',
  },
];

export const HomeScreen = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleCategoryPress = (category) => {
    Alert.alert(
      `${category.name} Duplicate Scanner`,
      `Placeholder navigation for ${category.name}. Found ${category.count} (${category.size}) potential duplicates.`,
      [{ text: 'OK' }]
    );
  };

  const handleDeepScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      Alert.alert(
        'Deep Scan Completed! 🚀',
        'Analyzed 2,450 files and contacts. Found 246 duplicate items occupying ~2.03 GB of storage.',
        [{ text: 'Review Duplicates' }]
      );
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* App Bar Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>Duplicate Remover</Text>
            <Text style={styles.appStatus}>System Status: Ready to Clean</Text>
          </View>
          <TouchableOpacity style={styles.settingsIconBtn}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard Storage Widget */}
        <Card style={styles.dashboardCard}>
          <View style={styles.dashboardHeader}>
            <View style={styles.dashboardTextGroup}>
              <Text style={styles.dashboardTitle}>Storage Cleaned</Text>
              <Text style={styles.dashboardNumber}>4.8 GB</Text>
            </View>
            <View style={styles.storageGauge}>
              <Text style={styles.gaugeText}>68%</Text>
              <Text style={styles.gaugeLabel}>Used</Text>
            </View>
          </View>

          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: '68%' }]} />
          </View>
          <View style={styles.storageFooter}>
            <Text style={styles.storageInfo}>Total Space: 128.0 GB</Text>
            <Text style={styles.storageInfo}>Free: 41.0 GB</Text>
          </View>
        </Card>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scan Categories</Text>
          <Text style={styles.sectionSubtitle}>Select category to inspect duplicates</Text>
        </View>

        {/* 6 Category Grid Layout */}
        <View style={styles.gridContainer}>
          {CATEGORIES.map((category) => (
            <Card
              key={category.id}
              style={styles.gridCard}
              onPress={() => handleCategoryPress(category)}
            >
              <View
                style={[
                  styles.categoryIconBg,
                  { backgroundColor: category.color + '20' },
                ]}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.count}</Text>
              <Text style={[styles.categorySize, { color: category.color }]}>
                {category.size}
              </Text>
            </Card>
          ))}
        </View>

        {/* Deep Scan Action CTA */}
        <View style={styles.actionContainer}>
          <Button
            title={isScanning ? 'Deep Scanning System...' : 'Start Full Deep Scan'}
            variant="primary"
            icon={isScanning ? null : '🔍'}
            loading={isScanning}
            onPress={handleDeepScan}
            style={styles.deepScanBtn}
          />
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
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  appStatus: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: 2,
  },
  settingsIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  settingsIcon: {
    fontSize: 20,
  },
  dashboardCard: {
    backgroundColor: COLORS.cardBackground,
    marginBottom: 24,
    padding: 20,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dashboardTextGroup: {},
  dashboardTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dashboardNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  storageGauge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  gaugeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  gaugeLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  storageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storageInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    marginBottom: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  categorySize: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: 8,
  },
  deepScanBtn: {
    width: '100%',
    paddingVertical: 18,
  },
});
