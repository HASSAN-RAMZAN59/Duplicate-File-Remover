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
} from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import { ROUTES } from '../navigation/routes';

export const PermissionScreen = ({ navigation }) => {
  const {
    isStorageGranted,
    isContactsGranted,
    areAllPermissionsGranted,
    requestStorage,
    requestContacts,
    openSettings,
  } = usePermissions();

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.HOME }],
    });
  };

  const handleToggleContacts = async (value) => {
    if (value && !isContactsGranted) {
      await requestContacts();
    } else if (!value && isContactsGranted) {
      await openSettings();
    }
  };

  const handleToggleStorage = async (value) => {
    if (value && !isStorageGranted) {
      await requestStorage();
    } else if (!value && isStorageGranted) {
      await openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <Text style={styles.headerTitle}>App Permissions</Text>

        {/* App Badge Header */}
        <View style={styles.badgeSection}>
          <View style={styles.appIconBadge}>
            <Text style={styles.androidIconText}>🤖</Text>
          </View>
          <Text style={styles.appNameText}>Duplicate File Remover</Text>
        </View>

        {/* PERMISSION CARDS */}

        {/* 1. Contacts */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => handleToggleContacts(!isContactsGranted)}
        >
          <View style={styles.whitePlaceholderBox} />
          <View style={styles.labelContainer}>
            <Text style={styles.cardTitle}>Contacts</Text>
            <Text style={styles.cardSubtitle}>
              Required to scan and remove duplicate files from your device.
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
          onPress={() => handleToggleStorage(!isStorageGranted)}
        >
          <View style={styles.whitePlaceholderBox} />
          <View style={styles.labelContainer}>
            <Text style={styles.cardTitle}>Music & Audio</Text>
            <Text style={styles.cardSubtitle}>
              Required to identify duplicate images and videos in your media library.
            </Text>
          </View>
          <Switch
            value={isStorageGranted}
            onValueChange={handleToggleStorage}
            trackColor={{ false: '#3F3F46', true: '#306FFF' }}
            thumbColor="#FFFFFF"
          />
        </TouchableOpacity>

        {/* 3. Photos & Videos */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => handleToggleStorage(!isStorageGranted)}
        >
          <View style={styles.whitePlaceholderBox} />
          <View style={styles.labelContainer}>
            <Text style={styles.cardTitle}>Photos & Videos</Text>
            <Text style={styles.cardSubtitle}>
              Stay updated on scan results and scheduled cleanup reminders.
            </Text>
          </View>
          <Switch
            value={isStorageGranted}
            onValueChange={handleToggleStorage}
            trackColor={{ false: '#3F3F46', true: '#306FFF' }}
            thumbColor="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={{ flex: 1, minHeight: 40 }} />

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !areAllPermissionsGranted && styles.disabledButton]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 28,
  },
  badgeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#1E1E22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  androidIconText: {
    fontSize: 32,
  },
  appNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    padding: 16,
    marginBottom: 14,
  },
  whitePlaceholderBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 14,
  },
  labelContainer: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  continueButton: {
    backgroundColor: '#306FFF',
    width: '100%',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#306FFF60',
    opacity: 0.8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
