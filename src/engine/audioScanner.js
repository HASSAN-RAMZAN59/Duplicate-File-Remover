import { Platform, NativeModules, PermissionsAndroid } from 'react-native';

/**
 * Standard Audio File Extensions (Includes Chat, Music & Voice Notes)
 */
export const AUDIO_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.ogg',
  '.opus',
  '.flac',
  '.amr',
  '.3gp',
  '.wma',
  '.3ga',
  '.m4r',
  '.mp2',
  '.mp1',
  '.mid',
  '.midi',
  '.aiff',
  '.pcm',
  '.caf',
];

/**
 * Storage Directories for Universal Audio Traversal
 */
const TOP_LEVEL_STORAGE_PATHS = [
  '/storage/emulated/0/Music',
  '/storage/emulated/0/Recordings',
  '/storage/emulated/0/Recordings/Call',
  '/storage/emulated/0/Recordings/Voice',
  '/storage/emulated/0/CallRecordings',
  '/storage/emulated/0/VoiceRecorder',
  '/storage/emulated/0/Voice Recorder',
  '/storage/emulated/0/ColorOS/recording',
  '/storage/emulated/0/MIUI/sound_recorder',
  '/storage/emulated/0/Audio',
  '/storage/emulated/0/Sounds',
  '/storage/emulated/0/Ringtones',
  '/storage/emulated/0/Notifications',
  '/storage/emulated/0/Alarms',
  '/storage/emulated/0/Podcasts',
  '/storage/emulated/0/Documents',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Download/Telegram',
  '/storage/emulated/0/Download/WhatsApp',
  '/storage/emulated/0/SHAREit',
  '/storage/emulated/0/SHAREit/.status',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Voice Notes',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio/Sent',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio/Private',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Voice Notes',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio/Sent',
  '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio/Private',
  '/storage/emulated/0/Telegram',
  '/storage/emulated/0/Telegram/Telegram Audio',
  '/storage/emulated/0/Media',
];

/**
 * Verifies & Requests Android Media Permissions
 */
const ensureAudioPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 33) {
      const results = await Promise.all([
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES),
      ]);

      const [hasAud, hasImg] = results;

      if (!hasAud || !hasImg) {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ]);
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
    console.warn('[AudioScanner] Permission error:', err);
    return true;
  }
};

/**
 * Extracts clean track title from filename
 */
const extractTitle = (filename = '') => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
};

/**
 * Universal Recursive Directory Traversal for Audio Scanning (maxDepth = 15)
 */
const scanDirectoryExhaustive = async (RNFS, dirPath, scannedFilesMap, depth = 0, maxDepth = 15) => {
  if (depth > maxDepth) return;

  try {
    const items = await RNFS.readDir(dirPath);
    if (!Array.isArray(items)) return;

    for (const item of items) {
      try {
        const lowerPath = (item.path || '').toLowerCase();
        
        // Skip ONLY restricted Android/data (throws OS exception on Android 11+) and .cache/.pending
        if (
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

          if (AUDIO_EXTENSIONS.includes(ext)) {
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

            if (!filePath || scannedFilesMap.has(filePath)) continue;

            let fileSize = Number(item.size || 0);
            if (fileSize <= 0 && RNFS && typeof RNFS.stat === 'function') {
              try {
                const statObj = await RNFS.stat(filePath);
                fileSize = Number(statObj.size || 0);
              } catch (statErr) {}
            }

            if (fileSize > 0) {
              scannedFilesMap.set(filePath, {
                id: filePath,
                title: extractTitle(item.name),
                name: item.name,
                path: filePath,
                contentUri: `file://${filePath}`,
                size: fileSize,
                extension: ext,
                category: 'Audio',
                duration: 0,
                dateModified: item.mtime ? new Date(item.mtime).getTime() : Date.now(),
              });
            }
          }
        } else if (isDirectory) {
          await scanDirectoryExhaustive(RNFS, item.path, scannedFilesMap, depth + 1, maxDepth);
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
 * Universal & Exhaustive Audio Scanner Entry Point
 * Performs File System Deep Traversal across root storage & all subfolders.
 * 
 * @returns {Promise<Array<Object>>} Extracted audio track objects
 */
export const scanAudioFiles = async () => {
  await ensureAudioPermission();
  const scannedFilesMap = new Map();

  console.log('[AudioScanner] Starting Exhaustive Storage Traversal for Audio Files...');

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

    if (RNFS && typeof RNFS.readDir === 'function') {
      const rootStoragePath = RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';

      // Step 1: Root Storage Scan
      try {
        await scanDirectoryExhaustive(RNFS, rootStoragePath, scannedFilesMap, 0, 15);
      } catch (rootErr) {
        console.warn('[AudioScanner] Root scan warning, proceeding to deep folder list scan:', rootErr);
      }

      // Step 2: Traverse Top-Level Folders for complete coverage
      for (const rootDir of TOP_LEVEL_STORAGE_PATHS) {
        await scanDirectoryExhaustive(RNFS, rootDir, scannedFilesMap, 0, 15);
      }
    } else {
      console.warn('[AudioScanner] Native RNFS module unavailable on runtime platform.');
    }
  } catch (error) {
    console.error('[AudioScanner] Critical error during audio scan:', error);
  }

  const rawAudioList = Array.from(scannedFilesMap.values());
  // Sort newest audio tracks first
  rawAudioList.sort((a, b) => (b.dateModified || 0) - (a.dateModified || 0));

  console.log(`[AudioScanner] EXHAUSTIVE DEEP SCAN COMPLETE. Total Audio Files Detected: ${rawAudioList.length}`);

  return rawAudioList;
};

export const audioScanner = {
  scanAudioFiles,
  AUDIO_EXTENSIONS,
};
