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
   * Check status of storage permission (Images, Videos, Audio)
   */
  checkPermission: async (type) => {
    try {
      if (type === PERMISSION_TYPES.STORAGE) {
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            const [imgRes, vidRes, audRes] = await Promise.all([
              check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES),
              check(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO),
              check(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO),
            ]);

            const isAnyGranted =
              imgRes === RESULTS.GRANTED ||
              vidRes === RESULTS.GRANTED ||
              audRes === RESULTS.GRANTED;

            return isAnyGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
          }
          const res = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
          return normalizeStatus(res);
        } else if (Platform.OS === 'ios') {
          const res = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
          return normalizeStatus(res);
        }
      }

      if (type === PERMISSION_TYPES.CONTACTS) {
        if (Platform.OS === 'android') {
          const res = await check(PERMISSIONS.ANDROID.READ_CONTACTS);
          return normalizeStatus(res);
        } else if (Platform.OS === 'ios') {
          const res = await check(PERMISSIONS.IOS.CONTACTS);
          return normalizeStatus(res);
        }
      }

      return PERMISSION_STATUS.DENIED;
    } catch (error) {
      console.warn(`[PermissionService] Check failed for ${type}:`, error);
      return PERMISSION_STATUS.DENIED;
    }
  },

  /**
   * Request system storage & media permissions explicitly (Images, Videos, Audio)
   */
  requestPermission: async (type) => {
    try {
      if (type === PERMISSION_TYPES.STORAGE) {
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            // Request ALL 3 media permissions on Android 13+ (Images, Videos, Audio)
            const [imgRes, vidRes, audRes] = await Promise.all([
              request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES),
              request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO),
              request(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO),
            ]);

            const isAnyGranted =
              imgRes === RESULTS.GRANTED ||
              vidRes === RESULTS.GRANTED ||
              audRes === RESULTS.GRANTED;

            return isAnyGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
          }
          const res = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
          return normalizeStatus(res);
        } else if (Platform.OS === 'ios') {
          const res = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
          return normalizeStatus(res);
        }
      }

      if (type === PERMISSION_TYPES.CONTACTS) {
        if (Platform.OS === 'android') {
          const res = await request(PERMISSIONS.ANDROID.READ_CONTACTS);
          return normalizeStatus(res);
        } else if (Platform.OS === 'ios') {
          const res = await request(PERMISSIONS.IOS.CONTACTS);
          return normalizeStatus(res);
        }
      }

      return PERMISSION_STATUS.DENIED;
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
