import { Platform, NativeModules, PermissionsAndroid } from 'react-native';

/**
 * Supported Document Extensions
 */
export const DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.csv',
  '.rtf',
];

/**
 * Top Storage Directories for Document Scans
 */
const DOCUMENT_STORAGE_PATHS = [
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/Document',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Download/Documents',
  '/storage/emulated/0/Download/Telegram',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Documents',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents',
  '/storage/emulated/0/Telegram/Telegram Documents',
  '/storage/emulated/0/Telegram',
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/Pictures',
  '/storage/emulated/0/Movies',
  '/storage/emulated/0/Audio',
  '/storage/emulated/0/Media',
];

/**
 * Ensures Native Android Permissions for Storage & Documents
 * Requests MANAGE_EXTERNAL_STORAGE (All Files Access) on Android 11+ (API 30+) for unrestricted document reading
 */
const ensureDocumentPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 30) {
      const NativeFileDeleter = NativeModules.NativeFileDeleter;
      if (NativeFileDeleter && typeof NativeFileDeleter.isAllFilesPermissionGranted === 'function') {
        const isAllGranted = await NativeFileDeleter.isAllFilesPermissionGranted();
        console.log('[DocumentScanner] All Files Access Granted:', isAllGranted);
        if (!isAllGranted && typeof NativeFileDeleter.requestAllFilesPermission === 'function') {
          await NativeFileDeleter.requestAllFilesPermission();
        }
      }

      if (Platform.Version >= 33) {
        const hasImg = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        if (!hasImg) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        }
      }
      return true;
    } else {
      const hasPerm = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      if (!hasPerm) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
      }
      return true;
    }
  } catch (err) {
    console.warn('[DocumentScanner] Permission error:', err);
    return true;
  }
};

/**
 * Extracts document title without extension
 */
const extractTitle = (filename = '') => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
};

/**
 * Recursive Directory Traversal for Document Scanning (maxDepth = 8)
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

          if (DOCUMENT_EXTENSIONS.includes(ext)) {
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

            if (!scannedFilesMap.has(filePath) && fileSize > 0) {
              scannedFilesMap.set(filePath, {
                id: filePath,
                title: extractTitle(item.name),
                name: item.name,
                path: filePath,
                contentUri: `file://${filePath}`,
                size: fileSize,
                extension: ext,
                category: 'Documents',
                dateModified: item.mtime ? new Date(item.mtime).getTime() : Date.now(),
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
 * Main Document Scanner Function
 * Crawls root storage and document folders to fetch all document metadata.
 * 
 * @returns {Promise<Array<Object>>} List of fetched document objects
 */
export const scanDocumentFiles = async () => {
  await ensureDocumentPermission();
  const scannedFilesMap = new Map();

  console.log('[DocumentScanner] Starting Document Storage Traversal...');

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

    if (RNFS && typeof RNFS.readDir === 'function') {
      const rootStoragePath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';

      // Step 1: Scan Root Storage
      try {
        await scanDirectoryRecursive(RNFS, rootStoragePath, scannedFilesMap, 0, 8);
      } catch (rootErr) {
        console.warn('[DocumentScanner] Root scan warning, proceeding to folder list scan:', rootErr);
      }

      // Step 2: Scan Top-Level Document Folders
      for (const rootDir of DOCUMENT_STORAGE_PATHS) {
        await scanDirectoryRecursive(RNFS, rootDir, scannedFilesMap, 0, 8);
      }
    } else {
      console.warn('[DocumentScanner] Native RNFS module unavailable on runtime platform.');
    }
  } catch (error) {
    console.error('[DocumentScanner] Critical error during document scan:', error);
  }

  const rawDocumentList = Array.from(scannedFilesMap.values());
  // Sort newest documents first
  rawDocumentList.sort((a, b) => (b.dateModified || 0) - (a.dateModified || 0));

  console.log(`[DocumentScanner] Scan complete. Total documents detected: ${rawDocumentList.length}`);

  return rawDocumentList;
};

export const documentScanner = {
  scanDocumentFiles,
  DOCUMENT_EXTENSIONS,
};
