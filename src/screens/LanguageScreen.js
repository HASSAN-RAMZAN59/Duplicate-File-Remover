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
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ROUTES } from '../navigation/routes';

const FlagIcon = ({ id }) => {
  switch (id) {
    case 'en':
      // UK Flag: Circular Navy background with White & Red Crosses
      return (
        <View style={styles.flagContainer}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#012169' }]} />
          {/* White Diagonals */}
          <View style={[styles.diagonal, { transform: [{ rotate: '30deg' }], backgroundColor: '#FFFFFF', height: 6, top: 14 }]} />
          <View style={[styles.diagonal, { transform: [{ rotate: '-30deg' }], backgroundColor: '#FFFFFF', height: 6, top: 14 }]} />
          {/* Red Diagonals */}
          <View style={[styles.diagonal, { transform: [{ rotate: '30deg' }], backgroundColor: '#C8102E', height: 3, top: 15.5 }]} />
          <View style={[styles.diagonal, { transform: [{ rotate: '-30deg' }], backgroundColor: '#C8102E', height: 3, top: 15.5 }]} />
          {/* White Cross */}
          <View style={[styles.crossH, { backgroundColor: '#FFFFFF', height: 10, top: 12 }]} />
          <View style={[styles.crossV, { backgroundColor: '#FFFFFF', width: 10, left: 12 }]} />
          {/* Red Cross */}
          <View style={[styles.crossH, { backgroundColor: '#C8102E', height: 5, top: 14.5 }]} />
          <View style={[styles.crossV, { backgroundColor: '#C8102E', width: 5, left: 14.5 }]} />
        </View>
      );

    case 'ar':
      // UAE Flag
      return (
        <View style={[styles.flagContainer, { flexDirection: 'row' }]}>
          <View style={{ width: '32%', height: '100%', backgroundColor: '#FF0000', zIndex: 2 }} />
          <View style={{ width: '68%', height: '100%', flexDirection: 'column' }}>
            <View style={{ flex: 1, backgroundColor: '#00732F' }} />
            <View style={{ flex: 1, backgroundColor: '#F5F5F5' }} />
            <View style={{ flex: 1, backgroundColor: '#282828' }} />
          </View>
        </View>
      );

    case 'fr':
      // French Flag: Blue, White, Red
      return (
        <View style={[styles.flagContainer, { flexDirection: 'row' }]}>
          <View style={{ flex: 1, backgroundColor: '#0052B4' }} />
          <View style={{ flex: 1, backgroundColor: '#F0F0F0' }} />
          <View style={{ flex: 1, backgroundColor: '#D80027' }} />
        </View>
      );

    case 'de':
      // German Flag: Black, Red, Yellow
      return (
        <View style={[styles.flagContainer, { flexDirection: 'column' }]}>
          <View style={{ flex: 1, backgroundColor: '#3D3D3D' }} />
          <View style={{ flex: 1, backgroundColor: '#D80027' }} />
          <View style={{ flex: 1, backgroundColor: '#FFDA44' }} />
        </View>
      );

    case 'zh':
      // Chinese Flag: Red with Yellow Star
      return (
        <View style={[styles.flagContainer, { backgroundColor: '#EE1C25', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#FFFF00', fontSize: 18, fontWeight: 'bold', marginTop: -2 }}>★</Text>
        </View>
      );

    case 'pt':
      // Portugal Flag: Green 40%, Red 60%
      return (
        <View style={[styles.flagContainer, { flexDirection: 'row' }]}>
          <View style={{ width: '40%', height: '100%', backgroundColor: '#02934D' }} />
          <View style={{ width: '60%', height: '100%', backgroundColor: '#DB1B1B' }} />
          <View style={styles.portugalEmblem} />
        </View>
      );

    case 'es':
      // Spanish Flag: Red 25%, Yellow 50%, Red 25%
      return (
        <View style={[styles.flagContainer, { flexDirection: 'column' }]}>
          <View style={{ flex: 1, backgroundColor: '#D80027' }} />
          <View style={{ flex: 2, backgroundColor: '#FFDA44' }} />
          <View style={{ flex: 1, backgroundColor: '#D80027' }} />
        </View>
      );

    case 'ru':
      // Russian Flag: White, Blue, Red
      return (
        <View style={[styles.flagContainer, { flexDirection: 'column' }]}>
          <View style={{ flex: 1, backgroundColor: '#F0F0F0' }} />
          <View style={{ flex: 1, backgroundColor: '#0052B4' }} />
          <View style={{ flex: 1, backgroundColor: '#D80027' }} />
        </View>
      );

    default:
      return null;
  }
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
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    const loadSavedLanguage = async () => {
      const savedLang = await storageService.getItem(STORAGE_KEYS.SELECTED_LANGUAGE);
      if (savedLang) {
        setSelectedLanguage(savedLang);
      }
    };
    loadSavedLanguage();
  }, []);

  const handleNext = async () => {
    // 1. Save selected language
    await storageService.setItem(STORAGE_KEYS.SELECTED_LANGUAGE, selectedLanguage);

    // 2. Check permissions status
    const permissionsResult = await permissionService.checkAllPermissions();

    let targetRoute = ROUTES.MAIN_DRAWER;
    if (!permissionsResult.areAllGranted) {
      targetRoute = ROUTES.PERMISSIONS;
    }


    navigation.reset({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" translucent={false} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Language</Text>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Next</Text>
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
                onPress={() => setSelectedLanguage(lang.id)}
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
  diagonal: {
    position: 'absolute',
    width: '140%',
    left: '-20%',
  },
  crossH: {
    position: 'absolute',
    width: '100%',
    left: 0,
  },
  crossV: {
    position: 'absolute',
    height: '100%',
    top: 0,
  },
  portugalEmblem: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F6C752',
    left: 10,
    top: 10,
    borderWidth: 2,
    borderColor: '#E83838',
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
