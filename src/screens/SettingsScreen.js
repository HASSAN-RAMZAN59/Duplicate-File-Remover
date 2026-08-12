import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ToastAndroid,
  Platform,
  Linking,
} from 'react-native';
import { ROUTES } from '../navigation/routes';
import { loadSettings, updateSetting, DEFAULT_SETTINGS } from '../services/settingsService';

const AUTO_SCAN_OPTIONS = ['Off', 'Daily', 'Weekly', 'Monthly'];

export const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAutoScanModalVisible, setIsAutoScanModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      const active = await loadSettings();
      if (isMounted) {
        setSettings(active);
        setIsLoaded(true);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      fetchSettings();
    });

    fetchSettings();
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleToggle = async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await updateSetting(key, value);
    if (Platform.OS === 'android' && ToastAndroid) {
      ToastAndroid.show(`Setting updated`, ToastAndroid.SHORT);
    }
  };

  const handleSelectAutoScan = async (option) => {
    await handleToggle('automaticScanning', option);
    setIsAutoScanModalVisible(false);
  };

  const handleRateUs = () => {
    if (Platform.OS === 'android' && ToastAndroid) {
      ToastAndroid.show('Thank you for supporting us!', ToastAndroid.SHORT);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" translucent={false} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Go Back"
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setting</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: GENERAL */}
        <Text style={styles.sectionHeader}>GENERAL</Text>
        <View style={styles.cardContainer}>
          {/* Language */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(ROUTES.LANGUAGE)}
          >
            <View style={styles.placeholderBox} />
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>Language</Text>
            </View>
            <View style={styles.valueGroup}>
              <Text style={styles.valueText}>{settings.language || 'English'}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: SCANNING SETTINGS */}
        <Text style={styles.sectionHeader}>SCANNING SETTINGS</Text>
        <View style={styles.cardContainer}>
          {/* Ignore Small Files */}
          <View style={styles.row}>
            <View style={styles.placeholderBox} />
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>Ignore Small Files</Text>
              <Text style={styles.rowSubtitle}>Exclude files under 1MB</Text>
            </View>
            <Switch
              value={!!settings.ignoreSmallFiles}
              onValueChange={(val) => handleToggle('ignoreSmallFiles', val)}
              trackColor={{ false: '#3F3F46', true: '#306FFF' }}
              thumbColor="#FFFFFF"
              disabled={!isLoaded}
            />
          </View>

          <View style={styles.divider} />

          {/* Automatic Scanning */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => setIsAutoScanModalVisible(true)}
          >
            <View style={styles.placeholderBox} />
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>Automatic Scanning</Text>
            </View>
            <View style={styles.valueGroup}>
              <Text style={styles.valueText}>{settings.automaticScanning || 'Weekly'}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 3: SUPPORT & ABOUT */}
        <Text style={styles.sectionHeader}>SUPPORT & ABOUT</Text>
        <View style={styles.cardContainer}>
          {/* Rate Us */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={handleRateUs}>
            <View style={styles.placeholderBox} />
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>Rate Us</Text>
            </View>
            <Text style={styles.externalIcon}>↗</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
          >
            <View style={styles.placeholderBox} />
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Version */}
          <View style={styles.row}>
            <View style={styles.placeholderBox} />
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>Version</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Automatic Scanning Frequency Selection Modal */}
      <Modal
        visible={isAutoScanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAutoScanModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAutoScanModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Automatic Scanning</Text>
                <Text style={styles.modalSubtitle}>Select scan frequency</Text>

                {AUTO_SCAN_OPTIONS.map((option) => {
                  const isSelected = (settings.automaticScanning || 'Weekly') === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => handleSelectAutoScan(option)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {option}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E22',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E5E2E1',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 8,
  },
  cardContainer: {
    backgroundColor: '#191C1D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  placeholderBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2A2A2E',
    marginRight: 14,
  },
  labelContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#E5E2E1',
    marginRight: 6,
  },
  chevron: {
    fontSize: 18,
    color: '#E5E2E1',
    fontWeight: '400',
  },
  externalIcon: {
    fontSize: 16,
    color: '#E5E2E1',
  },
  versionText: {
    fontSize: 14,
    color: '#E5E2E1',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2E',
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#191C1D',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E5E2E1',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 18,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#161618',
  },
  optionRowSelected: {
    backgroundColor: '#191C1D',
    borderWidth: 1,
    borderColor: '#E5E2E1',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#D4D4D8',
  },
  optionTextSelected: {
    color: '#E5E2E1',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#E5E2E1',
    fontWeight: 'bold',
  },
});
