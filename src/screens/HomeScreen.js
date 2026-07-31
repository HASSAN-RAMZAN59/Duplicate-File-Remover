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
    Alert.alert(category.name, `Scanning for ${category.name} duplicates...`);
  };

  const handleDeepScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      Alert.alert('Scan Complete', 'Deep scan finished.');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Home Screen</Text>

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
