import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import { permissionService } from '../services/permissionService';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ROUTES } from '../navigation/routes';
import { useTranslation } from '../context/LanguageContext';
import MainPermissionSvg from '../assets/permsiion/main.svg';
import ContactPermissionSvg from '../assets/permsiion/contact.svg';
import MusicPermissionSvg from '../assets/permsiion/music.svg';
import PhotoPermissionSvg from '../assets/permsiion/photo.svg';
import AllFilesPermissionSvg from '../assets/permsiion/Background+Border.svg';

export const PermissionScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const {
    isAudioGranted,
    isPhotosGranted,
    isStorageGranted,
    isContactsGranted,
    isAllFilesGranted,
    areAllPermissionsGranted,
    requestAudio,
    requestPhotos,
    requestContacts,
    requestAllFiles,
    openSettings,
  } = usePermissions();

  const handleContinue = async () => {
    if (!areAllPermissionsGranted) {
      if (!isContactsGranted) {
        const resContacts = await requestContacts();
        if (resContacts === 'BLOCKED') {
          await openSettings();
          return;
        }
      }
      if (!isAudioGranted) {
        const resAudio = await requestAudio();
        if (resAudio === 'BLOCKED') {
          await openSettings();
          return;
        }
      }
      if (!isPhotosGranted) {
        const resPhotos = await requestPhotos();
        if (resPhotos === 'BLOCKED') {
          await openSettings();
          return;
        }
      }
      if (!isAllFilesGranted) {
        await requestAllFiles();
        return;
      }
    }

    // Strict Check: Verify all 4 permissions with permissionService
    const checkResults = await permissionService.checkAllPermissions();
    if (checkResults.areAllGranted) {
      const hasCompleted = await storageService.getItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING);
      const isCompleted = hasCompleted === true || hasCompleted === 'true';
      const targetRoute = isCompleted ? ROUTES.HOME : ROUTES.ONBOARDING;

      navigation.reset({
        index: 0,
        routes: [{ name: targetRoute }],
      });
    } else {
      Alert.alert(
        t('permissionsRequiredTitle', 'Permissions Required'),
        t('permissionsRequiredBody', 'All 4 permissions (Contacts, Music & Audio, Photos & Videos, All Files Access) must be granted to continue.'),
        [
          { text: t('cancel', 'Cancel'), style: 'cancel' },
          { text: t('openSettings', 'Open Settings'), onPress: openSettings },
        ]
      );
    }
  };

  const handleToggleContacts = async (value) => {
    if (value && !isContactsGranted) {
      const status = await requestContacts();
      if (status === 'BLOCKED' || status === 'UNAVAILABLE') {
        await openSettings();
      }
    } else if (!value && isContactsGranted) {
      await openSettings();
    }
  };

  const handleToggleAudio = async (value) => {
    if (value && !isAudioGranted) {
      const status = await requestAudio();
      if (status === 'BLOCKED' || status === 'UNAVAILABLE') {
        await openSettings();
      }
    } else if (!value && isAudioGranted) {
      await openSettings();
    }
  };

  const handleTogglePhotos = async (value) => {
    if (value && !isPhotosGranted) {
      const status = await requestPhotos();
      if (status === 'BLOCKED' || status === 'UNAVAILABLE') {
        await openSettings();
      }
    } else if (!value && isPhotosGranted) {
      await openSettings();
    }
  };

  const handleToggleAllFiles = async (value) => {
    if (value && !isAllFilesGranted) {
      await requestAllFiles();
    } else if (!value && isAllFilesGranted) {
      await openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />

      <View style={styles.container}>
        {/* App Badge Header */}
        <View style={styles.badgeSection}>
          <MainPermissionSvg width={52} height={52} />
          <Text style={styles.appNameText}>{t('appPermissions', 'App Permissions')}</Text>
        </View>

        {/* PERMISSION CARDS (Fills available space nicely) */}
        <View style={styles.cardsContainer}>
          {/* 1. Contacts */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleToggleContacts(!isContactsGranted)}
          >
            <View style={styles.iconWrapper}>
              <ContactPermissionSvg width={42} height={42} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.cardTitle}>{t('contacts', 'Contacts')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('contactsSubtitle', 'Required to scan and remove duplicate files from your device.')}
              </Text>
            </View>
            <Switch
              value={isContactsGranted}
              onValueChange={handleToggleContacts}
              trackColor={{ false: '#3F3F46', true: '#306FFF' }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>

          {/* 2. Music & Audio */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleToggleAudio(!isAudioGranted)}
          >
            <View style={styles.iconWrapper}>
              <MusicPermissionSvg width={42} height={42} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.cardTitle}>{t('musicAudio', 'Music & Audio')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('musicSubtitle', 'Required to identify duplicate images and videos in your media library.')}
              </Text>
            </View>
            <Switch
              value={isAudioGranted}
              onValueChange={handleToggleAudio}
              trackColor={{ false: '#3F3F46', true: '#306FFF' }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>

          {/* 3. Photos & Videos */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleTogglePhotos(!isPhotosGranted)}
          >
            <View style={styles.iconWrapper}>
              <PhotoPermissionSvg width={42} height={42} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.cardTitle}>{t('photosVideos', 'Photos & Videos')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('photosSubtitle', 'Stay updated on scan results and scheduled cleanup reminders.')}
              </Text>
            </View>
            <Switch
              value={isPhotosGranted}
              onValueChange={handleTogglePhotos}
              trackColor={{ false: '#3F3F46', true: '#306FFF' }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>

          {/* 4. All Files Access */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => handleToggleAllFiles(!isAllFilesGranted)}
          >
            <View style={styles.iconWrapper}>
              <AllFilesPermissionSvg width={42} height={42} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.cardTitle}>{t('allFilesAccess', 'All Files Access')}</Text>
              <Text style={styles.cardSubtitle}>
                {t('allFilesSubtitle', 'Required for Full Device Scan and Deep Duplicate File Cleaning.')}
              </Text>
            </View>
            <Switch
              value={isAllFilesGranted}
              onValueChange={handleToggleAllFiles}
              trackColor={{ false: '#3F3F46', true: '#306FFF' }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Continue Button Pinned slightly above bottom */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !areAllPermissionsGranted && styles.disabledButton]}
            onPress={handleContinue}
            disabled={!areAllPermissionsGranted}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>{t('continue', 'Continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  badgeSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  appIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E1E22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  androidIconText: {
    fontSize: 26,
  },
  appNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 74,
    marginBottom: 10,
  },
  iconWrapper: {
    marginRight: 12,
  },
  labelContainer: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 15,
  },
  bottomButtonContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  continueButton: {
    backgroundColor: '#306FFF',
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#2A2A2A',
    opacity: 0.8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
