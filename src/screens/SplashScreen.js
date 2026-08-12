import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Easing } from 'react-native';
import { ROUTES } from '../navigation/routes';
import { storageService } from '../services/storageService';
import { permissionService } from '../services/permissionService';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const SplashScreen = ({ navigation }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      // 1. Check if onboarding was completed previously
      const hasCompleted = await storageService.getItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING);
      const permResult = await permissionService.checkAllPermissions();

      // 2. Animate bottom progress bar from 0% to 100% over 2.5s
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start(() => {
        if (!isMounted) return;

        const isCompleted = hasCompleted === true || hasCompleted === 'true';

        if (isCompleted) {
          // Skip onboarding on subsequent app launches
          let targetRoute = ROUTES.HOME;
          if (!permResult.areAllGranted) {
            targetRoute = ROUTES.PERMISSIONS;
          }
          navigation.reset({
            index: 0,
            routes: [{ name: targetRoute }],
          });
        } else {
          // First time launch: go to Language -> Permissions -> Onboarding
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.LANGUAGE }],
          });
        }
      });
    };


    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [navigation, progressAnim]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#141414" translucent={false} />

      <View style={styles.textContainer}>
        <Text style={styles.title}>Remove Duplicates Files</Text>
        <Text style={styles.subtitle}>Check & Delete Duplicates Files</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: barWidth }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  textContainer: {
    position: 'absolute',
    bottom: '22%',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 45,
    width: '82%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#383838',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
});

