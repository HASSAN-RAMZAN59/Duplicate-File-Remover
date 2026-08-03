import { Platform, NativeModules, PermissionsAndroid } from 'react-native';
import { getActiveSettings } from '../services/settingsService';

/**
 * Supported Image Extensions
 */
export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.bmp',
  '.svg',
];

/**
 * Top Storage Directories for Image Scans (Includes Documents, Downloads, Pictures, DCIM, WhatsApp, Editors)
 */
const IMAGE_STORAGE_PATHS = [
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/DCIM/Camera',
  '/storage/emulated/0/DCIM/Screenshots',
  '/storage/emulated/0/DCIM/100ANDRO',
  '/storage/emulated/0/Pictures',
  '/storage/emulated/0/Pictures/Screenshots',
  '/storage/emulated/0/Pictures/Instagram',
  '/storage/emulated/0/Pictures/Facebook',
  '/storage/emulated/0/Pictures/Telegram',
  '/storage/emulated/0/Pictures/WhatsApp',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/Document',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Download/Telegram',
  '/storage/emulated/0/Download/WhatsApp',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Images',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
  '/storage/emulated/0/Telegram/Telegram Images',
  '/storage/emulated/0/Movies',
  '/storage/emulated/0/Media',
];

/**
 * Ensures Native Android Permissions for Image Scanning
 */
const ensureImagePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 33) {
      const hasImg = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      if (!hasImg) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      }
      // Also request ALL_FILES_ACCESS on Android 11+ to ensure Documents/ & Download/ images are readable
      const NativeFileDeleter = NativeModules.NativeFileDeleter;
      if (NativeFileDeleter && typeof NativeFileDeleter.isAllFilesPermissionGranted === 'function') {
        const isAllGranted = await NativeFileDeleter.isAllFilesPermissionGranted();
        if (!isAllGranted && typeof NativeFileDeleter.requestAllFilesPermission === 'function') {
          await NativeFileDeleter.requestAllFilesPermission();
        }
      }
      return true;
    } else if (Platform.Version >= 30) {
      const NativeFileDeleter = NativeModules.NativeFileDeleter;
      if (NativeFileDeleter && typeof NativeFileDeleter.isAllFilesPermissionGranted === 'function') {
        const isAllGranted = await NativeFileDeleter.isAllFilesPermissionGranted();
        if (!isAllGranted && typeof NativeFileDeleter.requestAllFilesPermission === 'function') {
          await NativeFileDeleter.requestAllFilesPermission();
        }
      }
      const hasPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      if (!hasPerm) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      }
      return true;
    } else {
      const hasPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      if (!hasPerm) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
      }
      return true;
    }
  } catch (err) {
    console.warn('[ImageScanner] Permission error:', err);
    return true;
  }
};

/**
 * Recursive Directory Traversal for Image Scanning (maxDepth = 8)
 * Ensures photos in Documents/, Download/, Pictures/, DCIM/, WhatsApp, etc. are all fetched.
 */
const scanDirectoryRecursive = async (RNFS, dirPath, scannedFilesMap, depth = 0, maxDepth = 8) => {
  if (depth > maxDepth) return;

  try {
    const items = await RNFS.readDir(dirPath);
    if (!Array.isArray(items)) return;

    for (const item of items) {
      try {
        if (item.name.startsWith('.')) continue;

        const lowerPath = (item.path || '').toLowerCase();
        if (
          lowerPath.includes('/.trash') ||
          lowerPath.includes('/.thumbnails') ||
          lowerPath.includes('/.cache') ||
          lowerPath.includes('/android/data')
        ) {
          continue;
        }

        const isFile = typeof item.isFile === 'function' ? item.isFile() : !item.isDirectory;

        if (isFile) {
          const lastDot = item.name.lastIndexOf('.');
          const ext = lastDot !== -1 ? item.name.substring(lastDot).toLowerCase() : '';

          if (IMAGE_EXTENSIONS.includes(ext)) {
            let rawPath = item.path || '';
            if (rawPath.startsWith('file://')) {
              rawPath = rawPath.substring(7);
            }
            try {
              rawPath = decodeURIComponent(rawPath);
            } catch (e) {}

            const filePath = rawPath.startsWith('/sdcard/')
              ? rawPath.replace('/sdcard/', '/storage/emulated/0/')
              : rawPath;

            const fileSize = Number(item.size || 0);
            const settings = getActiveSettings();
            const minSizeThreshold = settings && settings.ignoreSmallFiles ? 102400 : 0;

            if (!scannedFilesMap.has(filePath) && fileSize > minSizeThreshold) {
              const fileTimestamp = item.mtime ? new Date(item.mtime).getTime() : Date.now();
              scannedFilesMap.set(filePath, {
                id: filePath,
                name: item.name,
                path: filePath,
                size: fileSize,
                extension: ext,
                category: 'Images',
                dateModified: fileTimestamp,
                modificationTime: fileTimestamp,
              });
            }
          }
        } else if (typeof item.isDirectory === 'function' ? item.isDirectory() : item.isDirectory) {
          await scanDirectoryRecursive(RNFS, item.path, scannedFilesMap, depth + 1, maxDepth);
        }
      } catch (err) {
        // Skip inaccessible item
      }
    }
  } catch (e) {
    // Skip unreadable directory
  }
};

/**
 * Main Exhaustive Image Scanner Function
 * Crawls root storage, Documents/, Downloads/, DCIM/, Pictures/ and all subdirectories.
 * 
 * @returns {Promise<Array<Object>>} List of fetched raw image objects
 */
export const scanImageFiles = async () => {
  await ensureImagePermission();
  const scannedFilesMap = new Map();

  console.log('[ImageScanner] Starting Exhaustive Storage Traversal for Images (Documents, Download, DCIM, Pictures)...');

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

    if (RNFS && typeof RNFS.readDir === 'function') {
      const rootStoragePath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';

      // Step 1: Scan Root Storage (Covers Documents/, Download/, etc.)
      try {
        await scanDirectoryRecursive(RNFS, rootStoragePath, scannedFilesMap, 0, 8);
      } catch (rootErr) {
        console.warn('[ImageScanner] Root scan warning, proceeding to folder list scan:', rootErr);
      }

      // Step 2: Traverse Top-Level Folders for complete coverage
      for (const rootDir of IMAGE_STORAGE_PATHS) {
        await scanDirectoryRecursive(RNFS, rootDir, scannedFilesMap, 0, 8);
      }
    } else {
      console.warn('[ImageScanner] Native RNFS module unavailable on runtime platform.');
    }
  } catch (error) {
    console.error('[ImageScanner] Critical error during image scan:', error);
  }

  const rawImageList = Array.from(scannedFilesMap.values());
  // Sort newest images first
  rawImageList.sort((a, b) => (b.dateModified || 0) - (a.dateModified || 0));

  console.log(`[ImageScanner] Exhaustive Image Scan Complete. Total Images Detected: ${rawImageList.length}`);

  return rawImageList;
};

export const imageScanner = {
  scanImageFiles,
  IMAGE_EXTENSIONS,
};
