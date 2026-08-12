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
  StatusBar,
  Image,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ROUTES } from '../navigation/routes';
import { runDeepScan } from '../engine/deepScanEngine';
import { deleteBatch } from '../engine/fileDeleter';
import BackArrowSvg from '../assets/back arrow.svg';
import ImagesCategorySvg from '../assets/full scan/Overlay.svg';
import VideosCategorySvg from '../assets/full scan/video.svg';
import AudioCategorySvg from '../assets/full scan/audio.svg';
import DocumentsCategorySvg from '../assets/full scan/document.svg';
import ContactsCategoryImage from '../assets/full scan/Vector.png';
import OthersCategorySvg from '../assets/full scan/zip.svg';

/**
 * Circular Progress Meter matching design screenshot
 */
const CircularProgressMeter = ({ size = 160, strokeWidth = 14, valueString = '0 B' }) => {
  const parts = valueString.split(' ');
  const valText = parts[0] || '0';
  const unitText = parts[1] || 'B';

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc filled ~75% of circumference
  const strokeDashoffset = circumference * 0.25;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background Dark Circle Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#26262B"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Active Bright White Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFFFFF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' }}>{valText}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginTop: 2 }}>{unitText}</Text>
      </View>
    </View>
  );
};

const getCategoryIcon = (name) => {
  const norm = (name || '').toLowerCase();
  if (norm.includes('image') || norm.includes('photo')) {
    return <ImagesCategorySvg width={44} height={44} />;
  }
  if (norm.includes('video')) {
    return <VideosCategorySvg width={44} height={44} />;
  }
  if (norm.includes('audio') || norm.includes('music')) {
    return <AudioCategorySvg width={44} height={44} />;
  }
  if (norm.includes('doc')) {
    return <DocumentsCategorySvg width={44} height={44} />;
  }
  if (norm.includes('contact')) {
    return (
      <View style={{ width: 44, height: 44, backgroundColor: 'rgba(182, 68, 23, 0.2)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Image source={require('../assets/full scan/Vector.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
      </View>
    );
  }
  if (norm.includes('other')) {
    return <OthersCategorySvg width={44} height={44} />;
  }
  return null;
};

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

  // Clean All Handler
  const handleCleanAll = () => {
    if (!scanResults || !scanResults.allPreselectedFiles || scanResults.allPreselectedFiles.length === 0) {
      Alert.alert('No Duplicates', 'There are no duplicates selected to clean.');
      return;
    }

    const fileCount = scanResults.allPreselectedFiles.length;
    const formattedSize = scanResults.totalReclaimableFormatted;

    Alert.alert(
      'Clean All Duplicates',
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

  const categoryList = scanResults && scanResults.categoryResults
    ? Object.values(scanResults.categoryResults)
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate(ROUTES.HOME)}
          activeOpacity={0.7}
          accessibilityLabel="Go Back"
        >
          <BackArrowSvg width={32} height={32} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DupClean</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isScanning ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#306FFF" style={{ marginBottom: 20 }} />
            <Text style={styles.scanningTitle}>Scanning {currentCategory}...</Text>
            <Text style={styles.scanningSubtitle}>{scanProgress}% Complete</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
            </View>
          </View>
        ) : (
          <>
            {/* Top Center Circular Progress Section */}
            <View style={styles.topSection}>
              <CircularProgressMeter
                size={160}
                strokeWidth={14}
                valueString={scanResults?.totalReclaimableFormatted || '0 B'}
              />

              <Text style={styles.scanCompleteTitle}>Scan Complete</Text>
              <Text style={styles.scanCompleteSubtitle}>
                You can reclaim {scanResults?.totalReclaimableFormatted || '0 B'} of space.
              </Text>
            </View>

            {/* Primary Action Button: Clean All Now */}
            <TouchableOpacity
              style={[styles.cleanAllButton, isCleaning && styles.disabledButton]}
              onPress={handleCleanAll}
              disabled={isCleaning}
              activeOpacity={0.85}
            >
              {isCleaning ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text style={styles.cleanAllButtonText}>Clean All Now</Text>
              )}
            </TouchableOpacity>

            {/* Categories Section Header */}
            <Text style={styles.categoriesHeader}>Categories</Text>

            {/* Category Cards List */}
            {categoryList.length > 0 ? (
              categoryList.map((cat) => (
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
                  <View style={styles.iconWrapper}>
                    {getCategoryIcon(cat.name) || <View style={styles.whitePlaceholderBox} />}
                  </View>

                  <View style={styles.categoryDetails}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <Text style={styles.categoryFileCount}>{cat.duplicateCount} files</Text>
                  </View>

                  <View style={styles.categoryRight}>
                    <Text style={styles.categorySize}>{cat.reclaimableFormatted}</Text>
                    <Text style={styles.categoryViewText}>View</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No Categories Found</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  scanningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scanningSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  progressBar: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2A2E',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#306FFF',
    borderRadius: 4,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  scanCompleteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  scanCompleteSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
  cleanAllButton: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  disabledButton: {
    opacity: 0.7,
  },
  cleanAllButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: '#1E1E22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    marginRight: 14,
  },
  whitePlaceholderBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 14,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryFileCount: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 3,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categorySize: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryViewText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
