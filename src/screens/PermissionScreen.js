import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionCard } from '../components/common/PermissionCard';
import { Button } from '../components/common/Button';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';
import { storageService } from '../services/storageService';

export const PermissionScreen = ({ navigation }) => {
  const {
    storageStatus,
    contactsStatus,
    areAllPermissionsGranted,
    requestStorage,
    requestContacts,
    openSettings,
  } = usePermissions();

  const handleContinue = async () => {
    const isOnboardingDone = await storageService.isOnboardingCompleted();

    if (!isOnboardingDone) {
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.ONBOARDING }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.HOME }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerBadge}>STEP 1 OF 2</Text>
          <Text style={styles.title}>Required Permissions</Text>
          <Text style={styles.subtitle}>
            To detect and clean duplicate files across your device, please grant the following permissions.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <PermissionCard
            title="Storage & Media Access"
            subtitle="Android MediaStore / iOS Photo Library"
            description="Required to scan device storage for duplicate photos, videos, audio tracks, and documents."
            icon="📁"
            status={storageStatus}
            onRequestPermission={requestStorage}
            onOpenSettings={openSettings}
          />

          <PermissionCard
            title="Contacts Access"
            subtitle="Android & iOS Address Book"
            description="Required to identify duplicate contacts with identical names or matching telephone numbers."
            icon="📇"
            status={contactsStatus}
            onRequestPermission={requestContacts}
            onOpenSettings={openSettings}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.privacyNote}>
            🔒 Your privacy is fully protected. Files and contacts are scanned strictly on-device and are never uploaded anywhere.
          </Text>
          <Button
            title={areAllPermissionsGranted ? 'Continue to App' : 'Grant Permissions to Continue'}
            variant="primary"
            disabled={!areAllPermissionsGranted}
            onPress={handleContinue}
            style={styles.continueButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 24,
    marginTop: 12,
  },
  headerBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  cardsContainer: {
    flex: 1,
  },
  footer: {
    marginTop: 16,
  },
  privacyNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
  },
});
