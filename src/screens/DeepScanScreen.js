import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ROUTES } from '../navigation/routes';
import { runDeepScan } from '../engine/deepScanEngine';
import { deleteBatch } from '../engine/fileDeleter';
import BackArrowSvg from '../assets/back arrow.svg';
import ImagesCategorySvg from '../assets/full scan/Overlay.svg';
import VideosCategorySvg from '../assets/full scan/video.svg';
import AudioCategorySvg from '../assets/full scan/audio.svg';
import DocumentsCategorySvg from '../assets/full scan/document.svg';
import ContactsCategorySvg from '../assets/full scan/ful scan contact.svg';
import OthersCategorySvg from '../assets/full scan/zip.svg';
import LottieView from 'lottie-react-native';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Circular Progress Meter matching design screenshot
 */
const CircularProgressMeter = ({ valueString = '0 B' }) => {
  const parts = valueString.split(' ');
  const valText = parts[0] || '0';
  const unitText = parts[1] || 'B';

  const anim = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * 45;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 0.75,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: 140, height: 140, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={140} height={140} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx="50"
          cy="50"
          r="45"
          stroke="#26262B"
          strokeWidth="6"
          fill="none"
        />
        <AnimatedCircle
          cx="50"
          cy="50"
          r="45"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: 'normal', color: '#FFFFFF' }}>{valText}</Text>
        <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#D1D5DB', marginTop: 2, letterSpacing: 1 }}>{unitText}</Text>
      </View>
    </View>
  );
};

/**
 * Small Real-Time Progress Meter for Loading Screen
 */
const SmallProgressMeter = ({ isScanning = true, progress = 0 }) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listenerId = animatedProgress.addListener((v) => {
      setDisplayValue(Math.round(v.value));
    });
    return () => {
      animatedProgress.removeListener(listenerId);
    };
  }, []);

  useEffect(() => {
    animatedProgress.setValue(0);
    const anim = Animated.timing(animatedProgress, {
      toValue: 99,
      duration: 5000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    anim.start();

    return () => anim.stop();
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      Animated.timing(animatedProgress, {
        toValue: 100,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: 60, height: 60, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={60} height={60} viewBox="0 0 60 60" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx="30"
          cy="30"
          r={radius}
          stroke="#2A2A2E"
          strokeWidth="3"
          fill="none"
        />
        <AnimatedCircle
          cx="30"
          cy="30"
          r={radius}
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' }}>
          {displayValue}%
        </Text>
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
      <View style={{ width: 44, height: 44, backgroundColor: 'rgba(182, 68, 23, 0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#FF7B46" />
        </Svg>
      </View>
    );
  }
  if (norm.includes('other')) {
    return <OthersCategorySvg width={44} height={44} />;
  }
  return null;
};

export const DeepScanScreen = ({ navigation, route }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const selectedCategoryIds = route?.params?.selectedCategoryIds;
  const isCancelledRef = useRef(false);

  const handleCancelScan = () => {
    isCancelledRef.current = true;
    navigation.navigate(ROUTES.HOME);
  };

  // Trigger Deep Scan
  const handleStartDeepScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentCategory('Initializing...');

    let shouldKeepScanningState = false;
    try {
      const results = await runDeepScan(
        (progress, categoryName) => {
          setScanProgress(progress);
          setCurrentCategory(categoryName);
        },
        selectedCategoryIds,
        () => isCancelledRef.current
      );

      if (isCancelledRef.current) {
        return;
      }

      setScanResults(results);

      // If single category scan, navigate directly to result screen for that category
      if (selectedCategoryIds && selectedCategoryIds.length === 1) {
        shouldKeepScanningState = true;
        const catResults = results?.categoryResults ? Object.values(results.categoryResults) : [];
        let categoryType = 'Images';
        let initialGroups = null;

        if (catResults.length > 0) {
          categoryType = catResults[0].name;
          initialGroups = catResults[0].groups;
        } else {
          const soloId = selectedCategoryIds[0];
          if (soloId === 'photos') categoryType = 'Images';
          else if (soloId === 'videos') categoryType = 'Videos';
          else if (soloId === 'audio') categoryType = 'Audio';
          else if (soloId === 'docs') categoryType = 'Documents';
        }

        navigation.replace(ROUTES.DUPLICATE_VIEWER, { categoryType, initialGroups });
        return;
      }
    } catch (error) {
      console.error('[DeepScanScreen] Scan failed:', error);
      Alert.alert('Scan Failed', 'Could not complete system deep scan.');
    } finally {
      if (!shouldKeepScanningState && !isCancelledRef.current) {
        setIsScanning(false);
      }
    }
  };

  // Auto-run Deep Scan on Screen Load & handle cleanup on unmount
  useEffect(() => {
    isCancelledRef.current = false;
    handleStartDeepScan();

    return () => {
      isCancelledRef.current = true;
    };
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
          onPress={handleCancelScan}
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
            {/* Top Titles */}
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.scanHeaderTitle}>Scanning Drive...</Text>
              <Text style={styles.scanHeaderSubtitle}>
                Looking for duplicate files and wasted space.
              </Text>
            </View>

            {/* Center Lottie Animation */}
            <View style={styles.lottieContainer}>
              <LottieView
                source={require('../assets/scan.json')}
                autoPlay
                loop
                style={{ width: 220, height: 220 }}
              />
            </View>

            {/* Pill Cancel Scan Button */}
            <TouchableOpacity
              style={styles.cancelScanBtn}
              activeOpacity={0.8}
              onPress={handleCancelScan}
            >
              <Text style={styles.cancelScanText}>Cancel Scan</Text>
            </TouchableOpacity>

            {/* Bottom Real-time Small Progress Circle */}
            <View style={styles.smallProgressMeterContainer}>
              <SmallProgressMeter progress={scanProgress} isScanning={isScanning} />
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
                      initialGroups: cat.groups,
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
    justifyContent: 'space-between',
    paddingVertical: 10,
    minHeight: 500,
  },
  scanHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  scanHeaderSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  lottieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  cancelScanBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#4B5563',
    backgroundColor: '#16161A',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  cancelScanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  smallProgressMeterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
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
    marginBottom: 16,
  },
  scanCompleteTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
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
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 10,
  },
  categoryCard: {
    backgroundColor: '#1E1E22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
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
