import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { ONBOARDING_SLIDES } from '../constants/onboardingData';
import { OnboardingSlide } from '../components/onboarding/OnboardingSlide';
import { Button } from '../components/common/Button';
import { COLORS } from '../constants/colors';
import { storageService } from '../services/storageService';
import { ROUTES } from '../navigation/routes';

const { width } = Dimensions.get('window');

export const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex && index >= 0 && index < ONBOARDING_SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const finishOnboarding = async () => {
    await storageService.setOnboardingCompleted();
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.HOME }],
    });
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIdx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setCurrentIndex(nextIdx);
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Text style={styles.stepCounter}>
          {currentIndex + 1} / {ONBOARDING_SLIDES.length}
        </Text>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OnboardingSlide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Controls */}
        <Button
          title={isLastSlide ? 'Get Started' : 'Next'}
          variant="primary"
          icon={isLastSlide ? '🚀' : null}
          onPress={handleNext}
          style={styles.nextButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    height: 50,
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryLight,
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  flatList: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 28,
    backgroundColor: COLORS.primary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: COLORS.cardBorder,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 16,
  },
});
