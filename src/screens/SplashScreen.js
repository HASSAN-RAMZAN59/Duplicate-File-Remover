import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { COLORS } from '../constants/colors';
import { storageService } from '../services/storageService';
import { permissionService } from '../services/permissionService';
import { ROUTES } from '../navigation/routes';

export const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      const startTime = Date.now();

      // 1. Perform async checks for permissions & storage
      const permissionsResult = await permissionService.checkAllPermissions();
      const isOnboardingDone = await storageService.isOnboardingCompleted();

      // 2. Ensure minimum 2-second splash screen duration
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(2000 - elapsedTime, 0);

      setTimeout(() => {
        if (!isMounted) return;

        if (!permissionsResult.areAllGranted) {
          // Route 1: Storage or Contacts permissions not granted
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.PERMISSIONS }],
          });
        } else if (!isOnboardingDone) {
          // Route 2: Permissions granted, but onboarding not complete
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.ONBOARDING }],
          });
        } else {
          // Route 3: Permissions granted and onboarding completed
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.MAIN_DRAWER }],
          });
        }
      }, remainingTime);
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <Text style={styles.logoIcon}>🔍</Text>
      </View>
      <Text style={styles.title}>Duplicate File Remover</Text>
      <Text style={styles.subtitle}>Smart Storage Optimizer</Text>

      <View style={styles.footer}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Initializing system engines...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 48,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 12,
    letterSpacing: 0.3,
  },
});
