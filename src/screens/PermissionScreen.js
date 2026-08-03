import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';
import { storageService } from '../services/storageService';

export const PermissionScreen = ({ navigation }) => {
  const {
    isStorageGranted,
    isContactsGranted,
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
        routes: [{ name: ROUTES.MAIN_DRAWER }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Permission Screen</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isStorageGranted && styles.buttonGranted]}
            onPress={requestStorage}
            disabled={isStorageGranted}
          >
            <Text style={styles.buttonText}>
              {isStorageGranted ? '✓ Storage Permission Granted' : 'Grant Storage Permission'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isContactsGranted && styles.buttonGranted]}
            onPress={requestContacts}
            disabled={isContactsGranted}
          >
            <Text style={styles.buttonText}>
              {isContactsGranted ? '✓ Contacts Permission Granted' : 'Grant Contacts Permission'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={openSettings}>
            <Text style={styles.secondaryButtonText}>Open Device Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !areAllPermissionsGranted && styles.disabledButton]}
          disabled={!areAllPermissionsGranted}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {areAllPermissionsGranted ? 'Continue to Home' : 'Grant All Permissions to Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || '#0A0F1D',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.textPrimary || '#FFFFFF',
    marginBottom: 36,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 36,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonGranted: {
    backgroundColor: '#10B981', // Green background when granted
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
