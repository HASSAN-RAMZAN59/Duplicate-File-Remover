import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../constants/translations';
import { storageService } from '../services/storageService';
import { updateSetting } from '../services/settingsService';
import { STORAGE_KEYS } from '../constants/storageKeys';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLang = await storageService.getItem(STORAGE_KEYS.SELECTED_LANGUAGE);
        if (savedLang && TRANSLATIONS[savedLang]) {
          setLanguageState(savedLang);
        }
      } catch (e) {
        console.warn('[LanguageContext] Error loading language:', e);
      }
    };
    loadSavedLanguage();
  }, []);

  const changeLanguage = async (newLang) => {
    if (TRANSLATIONS[newLang]) {
      setLanguageState(newLang);
      await storageService.setItem(STORAGE_KEYS.SELECTED_LANGUAGE, newLang);
      
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
      if (langNames[newLang]) {
        await updateSetting('language', langNames[newLang]);
      }
    }
  };

  const t = (key, defaultText = '') => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS['en'];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const fallbackDict = TRANSLATIONS['en'];
    if (fallbackDict && fallbackDict[key]) {
      return fallbackDict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if component is rendered outside provider
    return {
      language: 'en',
      changeLanguage: () => {},
      t: (key, defaultText = '') => TRANSLATIONS.en[key] || defaultText || key,
    };
  }
  return context;
};
