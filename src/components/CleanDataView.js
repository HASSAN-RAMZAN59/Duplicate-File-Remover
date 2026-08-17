import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LottieView from 'lottie-react-native';
import RNFS from 'react-native-fs';
import BackArrowSvg from '../assets/back arrow.svg';
import { formatBytes } from '../engine/hashEngine';
import { useTranslation } from '../context/LanguageContext';

/**
 * CleanDataView - Screen shown after user deletes duplicate files (matching Pic 2).
 * Displays completed Lottie animation, success message, and storage clearance stats in green.
 */
export const CleanDataView = ({ cleanedSize = '0 B', onGoBack }) => {
  const { t } = useTranslation();
  const [availableSpaceStr, setAvailableSpaceStr] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchAvailableSpace = async () => {
      try {
        const fsInfo = await RNFS.getFSInfo();
        if (isMounted && fsInfo && fsInfo.freeSpace) {
          setAvailableSpaceStr(formatBytes(fsInfo.freeSpace));
        }
      } catch (err) {
        console.warn('Error fetching FS info for CleanDataView:', err);
      }
    };
    fetchAvailableSpace();

    // 3-second automatic auto-navigate timer to return to previous flow
    const autoNavigateTimer = setTimeout(() => {
      if (isMounted && typeof onGoBack === 'function') {
        onGoBack();
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(autoNavigateTimer);
    };
  }, [onGoBack]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onGoBack}
          activeOpacity={0.7}
          accessibilityLabel="Go Back"
        >
          <BackArrowSvg width={32} height={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cleanData', 'Clean Data')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.headerDivider} />

      {/* Center Body matching Pic 2 */}
      <View style={styles.centerContainer}>
        {/* Lottie Animation in place of white box placeholder */}
        <View style={styles.lottieWrapper}>
          <LottieView
            source={require('../assets/completed.json')}
            autoPlay
            loop={true}
            style={styles.lottie}
          />
        </View>

        {/* Success Title */}
        <Text style={styles.titleText}>{t('clearedSuccessfully', 'Cleared successfully!')}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitleText}>{t('everythingLooksGood', 'Everything looks good')}</Text>

        {/* Green Storage Clearance Line */}
        <Text style={styles.greenStatsText}>
          {availableSpaceStr ? `${availableSpaceStr} ${t('available', 'Available')}-` : ''}
          {t('cleanDataLabel', 'Clean data')} {cleanedSize}
        </Text>
      </View>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#27272A',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  lottieWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  lottie: {
    width: 220,
    height: 220,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  greenStatsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00FF41',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
