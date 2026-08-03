import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';

const CATEGORIES = [
  { id: 'images', name: 'Images', icon: '🖼️' },
  { id: 'videos', name: 'Videos', icon: '🎥' },
  { id: 'audio', name: 'Audio', icon: '🎵' },
  { id: 'documents', name: 'Documents', icon: '📄' },
  { id: 'contacts', name: 'Contacts', icon: '👥' },
  { id: 'others', name: 'Others', icon: '📦' },
];

export const HomeScreen = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleCategoryPress = (category) => {
    navigation.navigate(ROUTES.DUPLICATE_VIEWER, {
      categoryType: category.name,
    });
  };

  const handleDeepScan = () => {
    navigation.navigate(ROUTES.DEEP_SCAN);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.drawerButton}
          onPress={() => navigation.openDrawer()}
          activeOpacity={0.7}
          accessibilityLabel="Open Navigation Drawer"
        >
          <Text style={styles.hamburgerIconText}>☰</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Duplicate File Remover</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Storage Cleaner</Text>
        <Text style={styles.subtitle}>Select a category to find duplicate files</Text>

        <View style={styles.grid}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.card}
              onPress={() => handleCategoryPress(category)}
            >
              <Text style={styles.cardIcon}>{category.icon}</Text>
              <Text style={styles.cardText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleDeepScan}
          disabled={isScanning}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Start Full Scan'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || '#FFFFFF',
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
  drawerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground || '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight + '60',
  },
  hamburgerIconText: {
    fontSize: 24,
    color: COLORS.textPrimary || '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 26,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  container: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary || '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary || '#666666',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.cardBackground || '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary || '#000000',
  },
  scanButton: {
    backgroundColor: COLORS.primary || '#3B82F6',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
