import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeModules,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import RNFS from 'react-native-fs';
import { useFocusEffect } from '@react-navigation/native';
import { ROUTES } from '../navigation/routes';
import { formatBytes } from '../engine/hashEngine';
import { useTranslation } from '../context/LanguageContext';

import SettingSvg from '../assets/home screen/setting.svg';
import DocsSvg from '../assets/home screen/docs.svg';
import FullScanSvg from '../assets/home screen/full scan.svg';
import PhotosSvg from '../assets/home screen/photos.svg';
import SafeScanSvg from '../assets/home screen/safescan.svg';
import SearchSvg from '../assets/home screen/search.svg';
import VideosSvg from '../assets/home screen/videos.svg';
import AudioSvg from '../assets/home screen/audio.svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width } = Dimensions.get('window');

// Reusable White Placeholder for Icons
const PlaceholderIcon = ({ size = 20, borderRadius = 4 }) => (
  <View style={{ width: size, height: size, backgroundColor: '#FFFFFF', borderRadius, opacity: 0.9 }} />
);

export const HomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [usedPercentage, setUsedPercentage] = useState(0);
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const [categoryStats, setCategoryStats] = useState({
    photos: 'Calculating...',
    videos: 'Calculating...',
    audio: 'Calculating...',
    docs: 'Calculating...',
  });

  useEffect(() => {
    animatedProgress.addListener((v) => {
      setDisplayPercentage(Math.round(v.value));
    });
    return () => {
      animatedProgress.removeAllListeners();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStorageStats();
    }, [])
  );

  const fetchStorageStats = async () => {
    try {
      // 1. Get Overall Storage (Circle)
      const fsInfo = await RNFS.getFSInfo();
      const usedSpace = fsInfo.totalSpace - fsInfo.freeSpace;
      let percentage = Math.round((usedSpace / fsInfo.totalSpace) * 100);
      if (percentage < 0) percentage = 0;
      if (percentage > 100) percentage = 100;
      setUsedPercentage(percentage);

      Animated.timing(animatedProgress, {
        toValue: percentage,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // 2. Get Category Sizes Natively
      if (NativeModules.NativeFileDeleter && NativeModules.NativeFileDeleter.getCategorySizes) {
        const sizes = await NativeModules.NativeFileDeleter.getCategorySizes();
        setCategoryStats({
          photos: sizes.photos ? formatBytes(sizes.photos) : '0 B',
          videos: sizes.videos ? formatBytes(sizes.videos) : '0 B',
          audio: sizes.audio ? formatBytes(sizes.audio) : '0 B',
          docs: sizes.docs ? formatBytes(sizes.docs) : '0 B',
        });
      } else {
        setCategoryStats({ photos: '0 B', videos: '0 B', audio: '0 B', docs: '0 B' });
      }
    } catch (error) {
      console.warn('Error fetching storage stats:', error);
      setCategoryStats({ photos: '0 B', videos: '0 B', audio: '0 B', docs: '0 B' });
    }
  };

  const [selectedCategories, setSelectedCategories] = useState(['photos']);

  const toggleCategorySelection = (categoryId) => {
    setSelectedCategories([categoryId]);
  };

  const handleFullScan = () => {
    navigation.navigate(ROUTES.DEEP_SCAN, {
      selectedCategoryIds: ['photos', 'videos', 'audio', 'docs', 'contacts', 'others'],
    });
  };

  const handleScanNow = () => {
    navigation.navigate(ROUTES.DEEP_SCAN, {
      selectedCategoryIds: selectedCategories,
    });
  };

  const circumference = 2 * Math.PI * 45; // 2 * pi * r
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>DupClean</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate(ROUTES.SETTINGS)}
          activeOpacity={0.7}
        >
          <SettingSvg width={22} height={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Storage Circle */}
        <View style={styles.progressContainer}>
          <Svg width={140} height={140} viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="45" stroke="#2A2A2E" strokeWidth="6" fill="transparent" />
            <AnimatedCircle
              cx="50"
              cy="50"
              r="45"
              stroke="#FFFFFF"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="50, 50"
            />
          </Svg>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressPercentage}>{displayPercentage}%</Text>
            <Text style={styles.progressLabel}>{t('storageUsed', 'USED')}</Text>
          </View>
        </View>

        {/* Text Section */}
        <Text style={styles.readyTitle}>{t('readyTitle', 'Ready to clean up?')}</Text>
        <Text style={styles.readySubtitle}>
          {t('readySubtitle', 'Scan your device to find and remove duplicate files, freeing up valuable space.')}
        </Text>

        {/* Full System Scan Button */}
        <TouchableOpacity style={styles.fullSystemScanBtn} activeOpacity={0.8} onPress={handleFullScan}>
          <FullScanSvg width={18} height={18} />
          <Text style={styles.fullSystemScanText}>{t('deepScan', 'Full System Scan')}</Text>
        </TouchableOpacity>

        {/* Categories Grid */}
        <View style={styles.grid}>
          {[
            { id: 'photos', name: t('similarPhotos', 'Photos'), size: categoryStats.photos, icon: <PhotosSvg width={24} height={24} /> },
            { id: 'videos', name: t('duplicateVideos', 'Videos'), size: categoryStats.videos, icon: <VideosSvg width={24} height={24} /> },
            { id: 'audio', name: t('audioFiles', 'Audio'), size: categoryStats.audio, icon: <AudioSvg width={24} height={24} /> },
            { id: 'docs', name: t('documents', 'Docs'), size: categoryStats.docs, icon: <DocsSvg width={24} height={24} /> },
          ].map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                activeOpacity={0.8}
                onPress={() => toggleCategorySelection(category.id)}
              >
                {/* Radio Indicator */}
                <View style={styles.radioIndicatorContainer}>
                  <View style={[styles.radioIndicator, isSelected && styles.radioIndicatorActive]}>
                    {isSelected && <View style={styles.radioInnerCircle} />}
                  </View>
                </View>

                <View style={styles.categoryContent}>
                  {category.icon}
                  <View style={styles.categoryTextContainer}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categorySize}>{category.size}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Scan Now Button */}
        <TouchableOpacity style={styles.scanNowBtn} activeOpacity={0.9} onPress={handleScanNow}>
          <SearchSvg width={20} height={20} />
          <Text style={styles.scanNowBtnText}>{t('next', 'Scan Now')}</Text>
        </TouchableOpacity>

        {/* Bottom Safe Scan Info */}
        <View style={styles.safeScanInfoRow}>
          <SafeScanSvg width={14} height={14} />
          <Text style={styles.safeScanText}>{t('safeScanText', 'Safe Scan: System files are protected')}</Text>
        </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  progressContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 28,

    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
    marginTop: 2,
    letterSpacing: 1,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  fullSystemScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: '100%',
    marginBottom: 16,
  },
  fullSystemScanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#161618',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    padding: 12,
    marginBottom: 12,
  },
  categoryCardSelected: {
    borderColor: '#3B82F6',
  },
  radioIndicatorContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  radioIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#6B7280',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioIndicatorActive: {
    borderColor: '#3B82F6',
  },
  radioInnerCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTextContainer: {
    marginLeft: 12,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categorySize: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '600',
  },
  scanNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 16,
  },
  scanNowBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  safeScanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeScanText: {
    color: '#D1D5DB',
    fontSize: 13,
    marginLeft: 8,
  },
});
