import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { storageService } from '../services/storageService';
import { permissionService } from '../services/permissionService';
import { updateSetting } from '../services/settingsService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ROUTES } from '../navigation/routes';
import { useTranslation } from '../context/LanguageContext';

const FlagIcon = ({ id }) => {
  const flags = {
    'en': '🇬🇧',
    'ar': '🇦🇪',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'zh': '🇨🇳',
    'pt': '🇵🇹',
    'es': '🇪🇸',
    'ru': '🇷🇺',
  };
  return (
    <View style={[styles.flagContainer, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ fontSize: 24 }}>{flags[id]}</Text>
    </View>
  );
};

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'ar', name: 'Arabic' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'zh', name: 'Chinese' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'es', name: 'Spanish' },
  { id: 'ru', name: 'Russian' },
];

export const LanguageScreen = ({ navigation }) => {
  const { language, changeLanguage, t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en');

  useEffect(() => {
    if (language) {
      setSelectedLanguage(language);
    }
  }, [language]);

  const handleSelectLanguage = (langId) => {
    setSelectedLanguage(langId);
    changeLanguage(langId);
  };

  const handleNext = async () => {
    // 1. Save selected language in storage & settingsService
    await changeLanguage(selectedLanguage);

    // Reset onboarding completed flag so all 3 onboarding slides play after permission screen
    await storageService.setItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, false);

    // 2. Navigate to Permissions screen next
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.PERMISSIONS }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" translucent={false} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('selectLanguage', 'Select Language')}</Text>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>{t('next', 'Next')}</Text>
          </TouchableOpacity>
        </View>

        {/* Language List */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.languageCard,
                  isSelected ? styles.selectedCard : styles.unselectedCard,
                ]}
                onPress={() => handleSelectLanguage(lang.id)}
                activeOpacity={0.85}
              >
                <View style={styles.leftSection}>
                  <View style={styles.flagBadge}>
                    <FlagIcon id={lang.id} />
                  </View>
                  <Text
                    style={[
                      styles.languageName,
                      isSelected ? styles.selectedText : styles.unselectedText,
                    ]}
                  >
                    {lang.name}
                  </Text>
                </View>

                {/* Radio Button */}
                <View
                  style={[
                    styles.radioOuter,
                    isSelected ? styles.radioOuterSelected : styles.radioOuterUnselected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  nextBtn: {
    backgroundColor: '#316FFF',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  unselectedCard: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#383838',
  },
  selectedCard: {
    backgroundColor: '#316FFF',
    borderWidth: 1,
    borderColor: '#316FFF',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  flagContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    position: 'relative',
  },

  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  unselectedText: {
    color: '#E0E0E0',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterUnselected: {
    borderColor: '#777777',
  },
  radioOuterSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
