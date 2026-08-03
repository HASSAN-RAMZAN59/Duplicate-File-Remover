import { Platform, NativeModules } from 'react-native';

/**
 * File Extensions by Category
 */
export const CATEGORY_EXTENSIONS = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.svg'],
  VIDEOS: ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.3gp', '.webm'],
  AUDIO: ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.wma', '.opus'],
  DOCUMENTS: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv', '.rtf'],
  OTHERS: ['.zip', '.rar', '.7z', '.apk', '.iso', '.dat', '.tmp', '.log', '.bak', '.db', '.bin'],
};

/**
 * Root Mobile Storage Directory Paths for Android & iOS
 */
const STORAGE_ROOT_PATHS = [
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/Pictures',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Music',
  '/storage/emulated/0/Movies',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Images',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Video',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video',
];

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
    lowerPath.includes('/trash') ||
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
 * Scans directories and subfolders up to maxDepth.
 */
const scanDirectoryRecursive = async (RNFS, dirPath, extList, scannedFilesMap, depth = 0, maxDepth = 2) => {
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
            const filePath = item.path;
            const fileSize = Number(item.size || 0);
            const normPath = filePath.toLowerCase().replace(/^file:\/\//, '');

            // Avoid duplicate scan entries for same file path
            if (!scannedFilesMap.has(normPath) && fileSize > 0) {
              scannedFilesMap.set(normPath, {
                id: filePath,
                name: item.name,
                path: filePath,
                size: fileSize,
                extension: ext,
                modificationTime: item.mtime ? new Date(item.mtime).getTime() : Date.now(),
              });
            }
          }
        } else if (typeof item.isDirectory === 'function' ? item.isDirectory() : item.isDirectory) {
          // Recurse into subfolder
          await scanDirectoryRecursive(RNFS, item.path, extList, scannedFilesMap, depth + 1, maxDepth);
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

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

    if (RNFS && typeof RNFS.readDir === 'function') {
      for (const rootDir of STORAGE_ROOT_PATHS) {
        await scanDirectoryRecursive(RNFS, rootDir, extList, scannedFilesMap, 0, 2);
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
 * Strips URI prefixes and notifies Android MediaStore to refresh.
 * 
 * @param {string} filePath 
 * @returns {Promise<boolean>}
 */
export const deleteFileFromDevice = async (filePath) => {
  if (!filePath) return false;

  // Clean file:// scheme prefix for raw Java File path
  const cleanPath = filePath.startsWith('file://')
    ? filePath.replace('file://', '')
    : filePath;

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;
    if (RNFS && typeof RNFS.unlink === 'function') {
      await RNFS.unlink(cleanPath);
      console.log('[FileScanner] Successfully deleted file from storage:', cleanPath);

      // Refresh Android MediaStore Database so image disappears from Gallery
      if (typeof RNFS.scanFile === 'function') {
        try {
          await RNFS.scanFile(cleanPath);
        } catch (scanErr) {}
      }
      return true;
    }
  } catch (error) {
    console.warn('[FileScanner] Could not unlink file from storage:', cleanPath, error);
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
