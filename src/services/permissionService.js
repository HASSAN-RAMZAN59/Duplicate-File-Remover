import { Platform } from 'react-native';
import {
  check,
  request,
  openSettings,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';

export const PERMISSION_TYPES = {
  STORAGE: 'STORAGE',
  CONTACTS: 'CONTACTS',
};

export const PERMISSION_STATUS = {
  GRANTED: 'GRANTED',
  DENIED: 'DENIED',
  BLOCKED: 'BLOCKED',
  UNAVAILABLE: 'UNAVAILABLE',
};

/**
 * Maps cross-platform request to specific OS native permission keys.
 */
const getPlatformPermissionKey = (type) => {
  if (type === PERMISSION_TYPES.STORAGE) {
    if (Platform.OS === 'android') {
      // Android 13+ uses READ_MEDIA_IMAGES / READ_MEDIA_VIDEO, fallback to READ_EXTERNAL_STORAGE
      if (Platform.Version >= 33) {
        return PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
      }
      return PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
    } else if (Platform.OS === 'ios') {
      return PERMISSIONS.IOS.PHOTO_LIBRARY;
    }
  }

  if (type === PERMISSION_TYPES.CONTACTS) {
    if (Platform.OS === 'android') {
      return PERMISSIONS.ANDROID.READ_CONTACTS;
    } else if (Platform.OS === 'ios') {
      return PERMISSIONS.IOS.CONTACTS;
    }
  }

  return null;
};

/**
 * Normalizes library status string to internal PERMISSION_STATUS enum.
 */
const normalizeStatus = (result) => {
  switch (result) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return PERMISSION_STATUS.GRANTED;
    case RESULTS.DENIED:
      return PERMISSION_STATUS.DENIED;
    case RESULTS.BLOCKED:
      return PERMISSION_STATUS.BLOCKED;
    case RESULTS.UNAVAILABLE:
    default:
      return PERMISSION_STATUS.UNAVAILABLE;
  }
};

export const permissionService = {
  /**
   * Check status of a single permission
   */
  checkPermission: async (type) => {
    try {
      const permissionKey = getPlatformPermissionKey(type);
      if (!permissionKey) {
        // Fallback status if outside mobile runtime environment
        return PERMISSION_STATUS.DENIED;
      }
      const res = await check(permissionKey);
      return normalizeStatus(res);
    } catch (error) {
      console.warn(`[PermissionService] Check failed for ${type}:`, error);
      return PERMISSION_STATUS.DENIED;
    }
  },

  /**
   * Request system permission explicitly
   */
  requestPermission: async (type) => {
    try {
      const permissionKey = getPlatformPermissionKey(type);
      if (!permissionKey) {
        return PERMISSION_STATUS.DENIED;
      }
      const res = await request(permissionKey);
      return normalizeStatus(res);
    } catch (error) {
      console.warn(`[PermissionService] Request failed for ${type}:`, error);
      return PERMISSION_STATUS.DENIED;
    }
  },

  /**
   * Check both core permissions (Storage & Contacts)
   */
  checkAllPermissions: async () => {
    const storageStatus = await permissionService.checkPermission(PERMISSION_TYPES.STORAGE);
    const contactsStatus = await permissionService.checkPermission(PERMISSION_TYPES.CONTACTS);

    return {
      storage: storageStatus,
      contacts: contactsStatus,
      areAllGranted:
        storageStatus === PERMISSION_STATUS.GRANTED &&
        contactsStatus === PERMISSION_STATUS.GRANTED,
    };
  },

  /**
   * Open App System Settings for permanently blocked permissions
   */
  openAppSettings: async () => {
    try {
      await openSettings();
    } catch (error) {
      console.error('[PermissionService] Failed to open settings:', error);
    }
  },
};
