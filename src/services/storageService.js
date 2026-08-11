import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Storage Service Wrapper for persistent key-value storage.
 */
export const storageService = {
  /**
   * Set item in storage
   */
  setItem: async (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Error saving to storage [${key}]:`, error);
      return false;
    }
  },

  /**
   * Get item from storage
   */
  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Error reading from storage [${key}]:`, error);
      return null;
    }
  },

  /**
   * Remove item from storage
   */
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from storage [${key}]:`, error);
      return false;
    }
  },
};

