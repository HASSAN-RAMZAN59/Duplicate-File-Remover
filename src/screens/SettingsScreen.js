import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Linking,
  Animated,
} from 'react-native';
import { ROUTES } from '../navigation/routes';
import { loadSettings, updateSetting, DEFAULT_SETTINGS } from '../services/settingsService';
import { useTranslation } from '../context/LanguageContext';
import BackArrowSvg from '../assets/back arrow.svg';
import LanguageSvg from '../assets/language.svg';
import IgnoreSvg from '../assets/ignore.svg';
import RateUsSvg from '../assets/rate us.svg';
import PrivacySvg from '../assets/privacy .svg';
import VersionSvg from '../assets/version.svg';
import ExternalLinkSvg from '../assets/version 2.svg';

export const SettingsScreen = ({ navigation }) => {
  const { t, language } = useTranslation();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const langNames = {
    en: 'English',
    ar: 'Arabic',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    pt: 'Portuguese',
    es: 'Spanish',
    ru: 'Russian',
  };

  const showThemedToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
    });
  };

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

  const getOptionLabel = (opt) => {
    switch (opt) {
      case 'Off': return t('off', 'Off');
      case 'Daily': return t('daily', 'Daily');
      case 'Weekly': return t('weekly', 'Weekly');
      case 'Monthly': return t('monthly', 'Monthly');
      default: return opt;
    }
  };

  const handleToggle = async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    await updateSetting(key, value);
    showThemedToast(t('settingUpdated', 'Setting updated successfully'));
  };

  const handleRateUs = () => {
    showThemedToast(t('thankYouSupport', 'Thank you for supporting us!'));
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
          <BackArrowSvg width={32} height={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings', 'Settings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: GENERAL */}
        <Text style={styles.sectionHeader}>{t('general', 'GENERAL')}</Text>
        <View style={styles.cardContainer}>
          {/* Language */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(ROUTES.LANGUAGE)}
          >
            <View style={styles.iconContainer}>
              <LanguageSvg width={20} height={20} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>{t('language', 'Language')}</Text>
            </View>
            <View style={styles.valueGroup}>
              <Text style={styles.valueText}>{langNames[language] || settings.language || 'English'}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: SCANNING SETTINGS */}
        <Text style={styles.sectionHeader}>{t('scanningSettings', 'SCANNING SETTINGS')}</Text>
        <View style={styles.cardContainer}>
          {/* Ignore Small Files */}
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <IgnoreSvg width={20} height={20} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>{t('ignoreSmallFiles', 'Ignore Small Files')}</Text>
              <Text style={styles.rowSubtitle}>{t('excludeSmallFiles', 'Exclude files under 1MB')}</Text>
            </View>
            <Switch
              value={!!settings.ignoreSmallFiles}
              onValueChange={(val) => handleToggle('ignoreSmallFiles', val)}
              trackColor={{ false: '#3F3F46', true: '#306FFF' }}
              thumbColor="#FFFFFF"
              disabled={!isLoaded}
            />
          </View>
        </View>

        {/* SECTION 3: SUPPORT & ABOUT */}
        <Text style={styles.sectionHeader}>{t('supportAbout', 'SUPPORT & ABOUT')}</Text>
        <View style={styles.cardContainer}>
          {/* Rate Us */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={handleRateUs}>
            <View style={styles.iconContainer}>
              <RateUsSvg width={20} height={20} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>{t('rateUs', 'Rate Us')}</Text>
            </View>
            <ExternalLinkSvg width={14} height={14} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
          >
            <View style={styles.iconContainer}>
              <PrivacySvg width={20} height={20} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>{t('privacyPolicy', 'Privacy Policy')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Version */}
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <VersionSvg width={20} height={20} />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.rowTitle}>{t('version', 'Version')}</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Dark Theme Animated Toast Notification */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.toastIconWrapper}>
            <Text style={styles.toastCheckmark}>✓</Text>
          </View>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
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
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
  /* Toast Notification Styles */
  toastContainer: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    backgroundColor: '#1E1E22',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  toastIconWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2e2e2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  toastCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
