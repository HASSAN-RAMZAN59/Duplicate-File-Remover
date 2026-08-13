import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import GroupSvg from '../assets/Group.svg';
import Board2Svg from '../assets/board2.svg';
import Board3Svg from '../assets/board3.svg';
import ForwardSvg from '../assets/forward.svg';
import { permissionService } from '../services/permissionService';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ROUTES } from '../navigation/routes';
import { useTranslation } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export const OnboardingScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const SLIDES = [
    {
      id: '1',
      title: t('slide1Title', 'Find & Remove Duplicates'),
      subtitle: t('slide1Subtitle', 'Quickly find duplicate photos, videos, and documents that are taking up unnecessary space.'),
    },
    {
      id: '2',
      title: t('slide2Title', 'Organize Your Gallery'),
      subtitle: t('slide2Subtitle', 'Sort your files by category and keep your most important memories organized and easy to find.'),
    },
    {
      id: '3',
      title: t('slide3Title', 'Fast and Secure'),
      subtitle: t('slide3Subtitle', 'Clean your device in seconds. Your personal files are always protected during the scan.'),
    },
  ];

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      if (idx !== undefined && idx !== null) {
        setCurrentIndex(idx);
      }
    }
  }).current;

  const finishOnboarding = async () => {
    await storageService.setItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, true);

    const permissionsResult = await permissionService.checkAllPermissions();

    let targetRoute = ROUTES.HOME;
    if (!permissionsResult.areAllGranted) {
      targetRoute = ROUTES.PERMISSIONS;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
    } else {
      finishOnboarding();
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const renderSlideItem = ({ item }) => {
    let IllustrationComponent = null;

    if (item.id === '1') {
      IllustrationComponent = <GroupSvg width={287.65} height={237.36} />;
    } else if (item.id === '2') {
      IllustrationComponent = (
        <Board2Svg width={287.65} height={(287.65 * 200) / 351} />
      );
    } else if (item.id === '3') {
      IllustrationComponent = (
        <Board3Svg width={287.65} height={(287.65 * 163) / 365} />
      );
    }

    return (
      <View style={styles.slideContainer}>
        <View style={styles.illustrationWrapper}>{IllustrationComponent}</View>

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{item.title}</Text>
          <Text style={styles.subtitleText}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlideItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
      />

      <View style={styles.footerContainer}>
        {/* Pagination Indicators */}
        <View style={styles.paginationContainer}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? t('getStarted', 'Get Started') : t('next', 'Next')}
          </Text>
          <ForwardSvg width={12} height={12} style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
  },
  illustrationWrapper: {
    width: 287.65,
    height: 237.36,
    marginTop: 48,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  textContainer: {
    marginTop: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitleText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 135,
    width: '100%',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 32,
    backgroundColor: '#306FFF',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#333336',
  },
  actionButton: {
    width: 300,
    height: 60,
    backgroundColor: '#306FFF',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
    marginTop: 2,
  },
});
