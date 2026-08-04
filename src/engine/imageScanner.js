import { Platform, NativeModules, PermissionsAndroid } from 'react-native';

/**
 * Supported Image Extensions for Scanner
 * Strictly: [.jpg, .jpeg, .png, .webp, .heic]
 */
export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
];

/**
 * All Storage Folders for Traversal
 * Universal Deep Traversal across all internal storage locations (/storage/emulated/0/)
 */
const IMAGE_STORAGE_PATHS = [
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/DCIM/Camera',
  '/storage/emulated/0/DCIM/Screenshots',
  '/storage/emulated/0/DCIM/100ANDRO',
  '/storage/emulated/0/DCIM/Restored',
  '/storage/emulated/0/Pictures',
  '/storage/emulated/0/Pictures/Screenshots',
  '/storage/emulated/0/Pictures/Instagram',
  '/storage/emulated/0/Pictures/Facebook',
  '/storage/emulated/0/Pictures/Telegram',
  '/storage/emulated/0/Pictures/WhatsApp',
  '/storage/emulated/0/Pictures/PhotoEditor',
  '/storage/emulated/0/Pictures/PicsArt',
  '/storage/emulated/0/Pictures/Snapseed',
  '/storage/emulated/0/Pictures/Lightroom',
  '/storage/emulated/0/Pictures/Canva',
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
 * Path Normalization Helper
 */
const normalizePath = (rawPath = '') => {
  if (!rawPath) return '';
  let clean = rawPath;
  if (clean.startsWith('file://')) {
    clean = clean.substring(7);
  }
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {}

  if (clean.startsWith('/sdcard/')) {
    clean = clean.replace('/sdcard/', '/storage/emulated/0/');
  }
  return clean;
};

/**
 * Force MediaScanner Refresh for Key Directories (Documents, Download, etc.)
 * Ensures freshly copied or moved images are instantly indexed and accessible.
 */
const forceMediaScannerRefresh = async (RNFS) => {
  if (!RNFS || typeof RNFS.scanFile !== 'function') return;

  const refreshTargets = [
    '/storage/emulated/0/Documents',
    '/storage/emulated/0/Download',
    '/storage/emulated/0/Pictures',
    '/storage/emulated/0/DCIM',
  ];

  for (const dirPath of refreshTargets) {
    try {
      await RNFS.scanFile(dirPath);
    } catch (e) {
      // Ignore scanner errors for non-existent paths
    }
  }
};

/**
 * Recursive Directory Traversal for Image Scanning (Universal Deep Traversal)
 * Scans directories and subfolders recursively up to maxDepth (15 levels).
 * Includes Documents/, Download/, WhatsApp/Media, PhotoEditor, DCIM, Pictures, etc.
 */
const scanDirectoryRecursive = async (RNFS, dirPath, scannedFilesMap, depth = 0, maxDepth = 15) => {
  if (depth > maxDepth) return;

  try {
    const items = await RNFS.readDir(dirPath);
    if (!Array.isArray(items)) return;

    for (const item of items) {
      try {
        if (item.name.startsWith('.')) continue;

        const lowerPath = (item.path || '').toLowerCase();
        // Skip hidden/system caches and restricted Android/data
        if (
          lowerPath.includes('/.trash') ||
          lowerPath.includes('/.thumbnails') ||
          lowerPath.includes('/.cache') ||
          lowerPath.includes('/.pending') ||
          lowerPath.includes('/android/data')
        ) {
          continue;
        }

        const isDirectory = typeof item.isDirectory === 'function' ? item.isDirectory() : Boolean(item.isDirectory);
        const isFile = typeof item.isFile === 'function' ? item.isFile() : !isDirectory;

        if (isFile) {
          const lastDot = item.name.lastIndexOf('.');
          const ext = lastDot !== -1 ? item.name.substring(lastDot).toLowerCase() : '';

          if (IMAGE_EXTENSIONS.includes(ext)) {
            const filePath = normalizePath(item.path || '');
            if (!filePath || scannedFilesMap.has(filePath)) continue;

            let fileSize = Number(item.size || 0);
            if (fileSize <= 0 && RNFS && typeof RNFS.stat === 'function') {
              try {
                const statObj = await RNFS.stat(filePath);
                fileSize = Number(statObj.size || 0);
              } catch (statErr) {}
            }

            if (fileSize > 0) {
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
                dateAdded: fileTimestamp,
              });
            }
          }
        } else if (isDirectory) {
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
 * Combines Native Android MediaStore index query + Physical Filesystem Recursive Crawler
 * Crawls ALL internal storage folders (/storage/emulated/0/) recursively including
 * Documents/, Download/, WhatsApp/Media, PhotoEditor, Pictures/, DCIM/, and all subdirectories.
 * 
 * @returns {Promise<Array<Object>>} List of fetched raw image objects
 */
export const scanImageFiles = async () => {
  await ensureImagePermission();
  const scannedFilesMap = new Map();

  console.log('[ImageScanner] Starting Universal Dual-Engine Traversal for Images (MediaStore Query + Filesystem Crawler)...');

  // Step 1: Query Native Android MediaStore for instant complete device indexing
  try {
    const NativeFileDeleter = NativeModules.NativeFileDeleter;
    if (NativeFileDeleter && typeof NativeFileDeleter.queryImagesNative === 'function') {
      const nativeImages = await NativeFileDeleter.queryImagesNative();
      if (Array.isArray(nativeImages) && nativeImages.length > 0) {
        console.log(`[ImageScanner] Native MediaStore query fetched ${nativeImages.length} images.`);
        for (const img of nativeImages) {
          const normPath = normalizePath(img.path);
          if (normPath && !scannedFilesMap.has(normPath) && Number(img.size || 0) > 0) {
            scannedFilesMap.set(normPath, {
              ...img,
              id: normPath,
              path: normPath,
              size: Number(img.size),
            });
          }
        }
      }
    }
  } catch (nativeScanErr) {
    console.warn('[ImageScanner] Native MediaStore query warning:', nativeScanErr);
  }

  // Step 2: Physical Filesystem Crawler (RNFS) for un-indexed or newly created copies
  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

    if (RNFS && typeof RNFS.readDir === 'function') {
      const rootStoragePath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';

      // Force MediaScanner refresh for freshly copied/moved images
      await forceMediaScannerRefresh(RNFS);

      // Deep Traversal starting from Root Storage (/storage/emulated/0/)
      try {
        await scanDirectoryRecursive(RNFS, rootStoragePath, scannedFilesMap, 0, 15);
      } catch (rootErr) {
        console.warn('[ImageScanner] Root scan warning, proceeding to folder list scan:', rootErr);
      }

      // Traversal of key target folders (Documents/, Download/, WhatsApp/, PhotoEditor, etc.)
      for (const rootDir of IMAGE_STORAGE_PATHS) {
        await scanDirectoryRecursive(RNFS, rootDir, scannedFilesMap, 0, 15);
      }
    } else {
      console.warn('[ImageScanner] Native RNFS module unavailable on runtime platform.');
    }
  } catch (error) {
    console.error('[ImageScanner] Critical error during image scan:', error);
  }

  const rawImageList = Array.from(scannedFilesMap.values());
  // Sort newest images first by default
  rawImageList.sort((a, b) => (b.dateModified || 0) - (a.dateModified || 0));

  console.log(`[ImageScanner] Universal Image Scan Complete. Total Raw Images Detected: ${rawImageList.length}`);

  return rawImageList;
};

export const imageScanner = {
  scanImageFiles,
  IMAGE_EXTENSIONS,
};
