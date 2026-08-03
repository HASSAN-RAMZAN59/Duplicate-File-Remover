import { Platform, NativeModules } from 'react-native';
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

const isGrantedOrLimited = (res) =>
  res === RESULTS.GRANTED || res === RESULTS.LIMITED;

export const permissionService = {
  /**
   * Checks if Android 11+ (API 30+) All Files Access is active.
   */
  checkAllFilesAccess: async () => {
    if (Platform.OS === 'android' && Platform.Version >= 30) {
      try {
        const NativeFileDeleter = NativeModules.NativeFileDeleter;
        if (NativeFileDeleter && typeof NativeFileDeleter.isAllFilesPermissionGranted === 'function') {
          return await NativeFileDeleter.isAllFilesPermissionGranted();
        }
      } catch (e) {}
    }
    return true;
  },

  /**
   * Opens Android All Files Access settings page.
   */
  requestAllFilesAccess: async () => {
    if (Platform.OS === 'android' && Platform.Version >= 30) {
      try {
        const NativeFileDeleter = NativeModules.NativeFileDeleter;
        if (NativeFileDeleter && typeof NativeFileDeleter.requestAllFilesPermission === 'function') {
          return await NativeFileDeleter.requestAllFilesPermission();
        }
      } catch (e) {}
    }
    return true;
  },

  /**
   * Check status of storage permission with full Old & New Android version support.
   */
  checkPermission: async (type) => {
    try {
      if (type === PERMISSION_TYPES.STORAGE) {
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            const [imgRes, vidRes, audRes, manageRes, legacyRes] = await Promise.all([
              check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES),
              check(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO),
              check(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO),
              check(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE),
              check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE),
            ]);

            const isAnyGranted =
              isGrantedOrLimited(imgRes) ||
              isGrantedOrLimited(vidRes) ||
              isGrantedOrLimited(audRes) ||
              isGrantedOrLimited(manageRes) ||
              isGrantedOrLimited(legacyRes);

            return isAnyGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
          } else if (Platform.Version >= 30) {
            const [manageRes, legacyRes] = await Promise.all([
              check(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE),
              check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE),
            ]);

            const isAnyGranted =
              isGrantedOrLimited(manageRes) || isGrantedOrLimited(legacyRes);

            return isAnyGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
          } else {
            const res = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
            return normalizeStatus(res);
          }
        } else if (Platform.OS === 'ios') {
          const res = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
          return normalizeStatus(res);
        }
      }

      if (type === PERMISSION_TYPES.CONTACTS) {
        if (Platform.OS === 'android') {
          const readRes = await check(PERMISSIONS.ANDROID.READ_CONTACTS);
          return normalizeStatus(readRes);
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
   * Request storage & contacts permissions sequentially on Android.
   */
  requestPermission: async (type) => {
    try {
      if (type === PERMISSION_TYPES.STORAGE) {
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            const [imgRes, vidRes, audRes] = await Promise.all([
              request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES),
              request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO),
              request(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO),
            ]);

            const isAllFilesOk = await permissionService.checkAllFilesAccess();
            if (!isAllFilesOk) {
              await permissionService.requestAllFilesAccess();
            }

            const isAnyGranted =
              isGrantedOrLimited(imgRes) ||
              isGrantedOrLimited(vidRes) ||
              isGrantedOrLimited(audRes);

            return isAnyGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
          } else if (Platform.Version >= 30) {
            const isAllFilesOk = await permissionService.checkAllFilesAccess();
            if (!isAllFilesOk) {
              await permissionService.requestAllFilesAccess();
            }
            const res = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
            return normalizeStatus(res);
          } else {
            const res = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
            return normalizeStatus(res);
          }
        } else if (Platform.OS === 'ios') {
          const res = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
          return normalizeStatus(res);
        }
      }

      if (type === PERMISSION_TYPES.CONTACTS) {
        if (Platform.OS === 'android') {
          // Request READ_CONTACTS first, then WRITE_CONTACTS sequentially
          const readRes = await request(PERMISSIONS.ANDROID.READ_CONTACTS);
          if (isGrantedOrLimited(readRes)) {
            try {
              await request(PERMISSIONS.ANDROID.WRITE_CONTACTS);
            } catch (e) {
              console.warn('[PermissionService] WRITE_CONTACTS request warning:', e);
            }
          }
          return normalizeStatus(readRes);
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
