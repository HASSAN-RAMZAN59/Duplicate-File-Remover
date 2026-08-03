import { Platform, NativeModules, PermissionsAndroid } from 'react-native';

/**
 * Comprehensive File Extensions by Category
 */
export const CATEGORY_EXTENSIONS = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.svg'],
  VIDEOS: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.3gp', '.webm', '.m4v', '.ts', '.m2ts', '.mpg', '.mpeg', '.3g2', '.vob', '.divx'],
  AUDIO: ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.wma', '.opus', '.amr'],
  DOCUMENTS: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv', '.rtf'],
  OTHERS: ['.zip', '.rar', '.7z', '.apk', '.iso', '.dat', '.tmp', '.log', '.bak', '.db', '.bin'],
};

/**
 * Public Mobile Storage Directory Paths for Android & iOS
 */
const STORAGE_ROOT_PATHS = [
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/DCIM/Camera',
  '/storage/emulated/0/DCIM/Video',
  '/storage/emulated/0/DCIM/100ANDRO',
  '/storage/emulated/0/DCIM/Screenshots',
  '/storage/emulated/0/DCIM/ScreenRecorder',
  '/storage/emulated/0/Movies',
  '/storage/emulated/0/Movies/Instagram',
  '/storage/emulated/0/Movies/Facebook',
  '/storage/emulated/0/Movies/CapCut',
  '/storage/emulated/0/Movies/Screenrecords',
  '/storage/emulated/0/Videos',
  '/storage/emulated/0/Video',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Download/Video',
  '/storage/emulated/0/Download/Telegram',
  '/storage/emulated/0/Pictures',
  '/storage/emulated/0/Pictures/Screenshots',
  '/storage/emulated/0/Pictures/Telegram',
  '/storage/emulated/0/Pictures/Instagram',
  '/storage/emulated/0/Pictures/Facebook',
  '/storage/emulated/0/Music',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Video',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Images',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Documents',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
  '/storage/emulated/0/Telegram/Telegram Video',
];

/**
 * Ensures Native Android Permission is Granted for Target Category
 */
const ensureCategoryPermission = async (categoryType) => {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 33) {
      const catUpper = categoryType.toUpperCase();
      let targetPerm = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      if (catUpper === 'VIDEOS') {
        targetPerm = PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO;
      } else if (catUpper === 'AUDIO') {
        targetPerm = PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO;
      }

      const hasPerm = await PermissionsAndroid.check(targetPerm);
      if (!hasPerm) {
        const res = await PermissionsAndroid.request(targetPerm);
        return res === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } else {
      const hasPerm = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      if (!hasPerm) {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return res === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }
  } catch (err) {
    console.warn('[FileScanner] Permission check error:', err);
    return true;
  }
};

/**
 * Helper to extract extension from filename
 */
const getExtension = (filename = '') => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.substring(lastDotIndex).toLowerCase();
};

/**
 * Helper to check if file/folder is Trash, Cache, Thumbnail, or Hidden dot file
 */
const isHiddenOrTrash = (name = '', path = '') => {
  if (name.startsWith('.')) return true;
  const lowerPath = path.toLowerCase();
  if (
    lowerPath.includes('/.trash') ||
    lowerPath.includes('/.thumbnails') ||
    lowerPath.includes('/.cache') ||
    lowerPath.includes('/.pending') ||
    lowerPath.includes('/android/data')
  ) {
    return true;
  }
  return false;
};

/**
 * Recursive Directory Crawler
 * Scans directories and subfolders up to maxDepth (4 levels).
 */
const scanDirectoryRecursive = async (RNFS, dirPath, extList, scannedFilesMap, categoryType, depth = 0, maxDepth = 4) => {
  if (depth > maxDepth) return;

  try {
    const items = await RNFS.readDir(dirPath);
    if (!Array.isArray(items)) return;

    for (const item of items) {
      try {
        if (isHiddenOrTrash(item.name, item.path)) {
          continue;
        }

        const isFile = typeof item.isFile === 'function' ? item.isFile() : !item.isDirectory;

        if (isFile) {
          const ext = getExtension(item.name);
          if (extList.length === 0 || extList.includes(ext)) {
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

            // Avoid duplicate scan entries for same file path
            if (!scannedFilesMap.has(filePath) && fileSize > 0) {
              scannedFilesMap.set(filePath, {
                id: filePath,
                name: item.name,
                path: filePath,
                size: fileSize,
                extension: ext,
                category: categoryType,
                modificationTime: item.mtime ? new Date(item.mtime).getTime() : Date.now(),
              });
            }
          }
        } else if (typeof item.isDirectory === 'function' ? item.isDirectory() : item.isDirectory) {
          // Recurse into subfolder
          await scanDirectoryRecursive(RNFS, item.path, extList, scannedFilesMap, categoryType, depth + 1, maxDepth);
        }
      } catch (err) {
        // Skip inaccessible item
      }
    }
  } catch (e) {
    // Skip missing directory
  }
};

/**
 * Main Real File Scanner Function
 * Fetches raw file metadata from device storage with active diagnostic console logs.
 * 
 * @param {string} categoryType - 'Images' | 'Videos' | 'Audio' | 'Documents' | 'Others'
 * @returns {Promise<Array<Object>>} List of fetched raw file objects
 */
export const scanCategoryFiles = async (categoryType = 'Images') => {
  const normCategory = categoryType ? categoryType.toUpperCase() : 'IMAGES';
  const extList = CATEGORY_EXTENSIONS[normCategory] || [];
  const scannedFilesMap = new Map();

  // Ensure category permission is active before scanning
  await ensureCategoryPermission(categoryType);

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

    if (RNFS && typeof RNFS.readDir === 'function') {
      for (const rootDir of STORAGE_ROOT_PATHS) {
        await scanDirectoryRecursive(RNFS, rootDir, extList, scannedFilesMap, categoryType, 0, 4);
      }
    } else {
      console.warn('[FileScanner] Native RNFS module unavailable on runtime platform.');
    }
  } catch (error) {
    console.error('[FileScanner] Critical error during storage scan:', error);
  }

  const rawFileList = Array.from(scannedFilesMap.values());

  // DIAGNOSTIC CONSOLE LOGS
  console.log(`[FileScanner] Total Raw ${categoryType} Fetched:`, rawFileList.length);

  return rawFileList;
};

/**
 * Separate Scanner for 'Others' Category
 * @returns {Promise<Array<Object>>}
 */
export const scanOthersCategory = async () => {
  return scanCategoryFiles('Others');
};

/**
 * Deletes a file from physical device storage.
 * Uses custom NativeFileDeleter (ContentResolver + File.delete) for guaranteed deletion across Android 6-15.
 * 
 * @param {string} filePath 
 * @returns {Promise<boolean>}
 */
export const deleteFileFromDevice = async (filePath) => {
  if (!filePath) return false;

  // 1. Primary Native Android Deletion via MediaStore ContentResolver & File.delete
  try {
    const NativeFileDeleter = NativeModules.NativeFileDeleter;
    if (NativeFileDeleter && typeof NativeFileDeleter.deleteFileNative === 'function') {
      const isDeleted = await NativeFileDeleter.deleteFileNative(filePath);
      console.log('[FileScanner] NativeFileDeleter result for:', filePath, '=>', isDeleted);
      if (isDeleted) return true;
    }
  } catch (nativeErr) {
    console.warn('[FileScanner] NativeFileDeleter warning:', nativeErr);
  }

  // 2. Fallback to RNFS unlink & scanFile
  let cleanPath = filePath;
  if (cleanPath.startsWith('file://')) {
    cleanPath = cleanPath.substring(7);
  }
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch (e) {}

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;
    if (RNFS) {
      if (typeof RNFS.unlink === 'function') {
        try {
          await RNFS.unlink(cleanPath);
        } catch (unlinkErr) {}
      }

      if (typeof RNFS.scanFile === 'function') {
        try {
          await RNFS.scanFile(cleanPath);
        } catch (scanErr) {}
      }

      if (typeof RNFS.exists === 'function') {
        const stillExists = await RNFS.exists(cleanPath);
        return !stillExists;
      }
      return true;
    }
  } catch (error) {
    console.error('[FileScanner] RNFS delete error for:', cleanPath, error);
    return false;
  }
  return false;
};

export const fileScanner = {
  scanCategoryFiles,
  scanOthersCategory,
  deleteFileFromDevice,
  CATEGORY_EXTENSIONS,
};
