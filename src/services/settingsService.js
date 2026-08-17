import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@app_settings_v1';

export const DEFAULT_SETTINGS = {
  language: 'English',
  ignoreSmallFiles: false,
  smartMatching: true,
  autoSelectOldest: true,
};

let inMemorySettings = { ...DEFAULT_SETTINGS };

/**
 * Loads persisted settings from AsyncStorage into memory
 * @returns {Promise<Object>}
 */
export const loadSettings = async () => {
  try {
    const jsonStr = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      inMemorySettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('[SettingsService] Failed to load settings from storage:', error);
  }
  return { ...inMemorySettings };
};

/**
 * Gets currently active settings from memory synchronously
 * @returns {Object}
 */
export const getActiveSettings = () => {
  return { ...inMemorySettings };
};

/**
 * Updates a single setting key and persists to AsyncStorage
 * @param {string} key 
 * @param {boolean} value 
 * @returns {Promise<Object>}
 */
export const updateSetting = async (key, value) => {
  try {
    inMemorySettings[key] = value;
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(inMemorySettings));
    console.log(`[SettingsService] Setting updated: "${key}" = ${value}`);
  } catch (error) {
    console.warn(`[SettingsService] Failed to persist setting "${key}":`, error);
  }
  return { ...inMemorySettings };
};

/**
 * Resets settings to default values
 * @returns {Promise<Object>}
 */
export const resetSettings = async () => {
  try {
    inMemorySettings = { ...DEFAULT_SETTINGS };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(inMemorySettings));
  } catch (error) {
    console.warn('[SettingsService] Failed to reset settings:', error);
  }
  return { ...inMemorySettings };
};

export const settingsService = {
  DEFAULT_SETTINGS,
  loadSettings,
  getActiveSettings,
  updateSetting,
  resetSettings,
};
