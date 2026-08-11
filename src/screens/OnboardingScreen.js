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
import { permissionService } from '../services/permissionService';
import { ROUTES } from '../navigation/routes';

const { width } = Dimensions.get('window');

const SLIDES = [{ id: '1' }, { id: '2' }, { id: '3' }];

export const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const finishOnboarding = async () => {
    const permissionsResult = await permissionService.checkAllPermissions();

    let targetRoute = ROUTES.MAIN_DRAWER;
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
      setCurrentIndex(nextIdx);
    } else {
      finishOnboarding();
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const renderSlideItem = () => {
    // Blank container for all slides as requested
    return <View style={styles.slideContainer} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" translucent={false} />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlideItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Get Started →' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    width: 358,
    height: 60,
    backgroundColor: '#306FFF',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
