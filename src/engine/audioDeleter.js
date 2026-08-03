import { NativeModules, Platform } from 'react-native';
import { formatBytes } from './hashEngine';

/**
 * Audio Specific Deletion & Scoped Storage Manager
 * Handles multi-Android version deletion policies (Android 6 to Android 15).
 */

/**
 * Deletes a single audio file from storage and MediaStore SQL index.
 * 
 * @param {string} filePath 
 * @returns {Promise<boolean>} True if physical deletion succeeded
 */
export const deleteAudioFile = async (filePath) => {
  if (!filePath) return false;

  const NativeFileDeleter = NativeModules.NativeFileDeleter;
  const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

  let cleanPath = filePath;
  if (cleanPath.startsWith('file://')) {
    cleanPath = cleanPath.substring(7);
  }
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch (e) {}

  let isDeleted = false;

  // 1. Native Android MediaStore ContentResolver & System Intent Prompt Delete (Android 10 - 15)
  try {
    if (NativeFileDeleter && typeof NativeFileDeleter.deleteFileNative === 'function') {
      isDeleted = await NativeFileDeleter.deleteFileNative(cleanPath);
      console.log('[AudioDeleter] NativeFileDeleter result:', cleanPath, '=>', isDeleted);
    }
  } catch (nativeErr) {
    console.warn('[AudioDeleter] NativeFileDeleter error:', nativeErr);
  }

  // 2. Fallback Deletion via RNFS (Android 9 & below)
  if (!isDeleted && RNFS) {
    try {
      if (typeof RNFS.unlink === 'function') {
        await RNFS.unlink(cleanPath);
      }
      if (typeof RNFS.scanFile === 'function') {
        await RNFS.scanFile(cleanPath);
      }
    } catch (rnfsErr) {
      console.warn('[AudioDeleter] RNFS fallback error:', rnfsErr);
    }
  }

  // 3. Rescan Verification Check
  let stillExists = true;
  try {
    if (RNFS && typeof RNFS.exists === 'function') {
      stillExists = await RNFS.exists(cleanPath);
    }
  } catch (e) {}

  console.log(`[AudioDeleter] Rescan Verification for ${cleanPath}: stillExists = ${stillExists}`);

  return !stillExists || isDeleted;
};

/**
 * Deletes a batch of selected duplicate audio files.
 * 
 * @param {Array<Object|string>} audioFiles List of audio file objects or path strings
 * @returns {Promise<Object>} Summary of deletion result
 */
export const deleteSelectedAudioFiles = async (audioFiles = []) => {
  if (!Array.isArray(audioFiles) || audioFiles.length === 0) {
    return {
      success: true,
      deletedCount: 0,
      freedBytes: 0,
      freedFormatted: '0 B',
      errors: [],
    };
  }

  let deletedCount = 0;
  let freedBytes = 0;
  const errors = [];

  for (const item of audioFiles) {
    const rawPath = typeof item === 'string' ? item : item.path;
    const size = typeof item === 'object' && item.size ? Number(item.size) : 0;

    if (!rawPath) continue;

    const success = await deleteAudioFile(rawPath);
    if (success) {
      deletedCount += 1;
      freedBytes += size;
    } else {
      errors.push({ path: rawPath, error: 'Failed to delete audio file from disk' });
    }
  }

  return {
    success: errors.length === 0 && deletedCount > 0,
    deletedCount,
    freedBytes,
    freedFormatted: formatBytes(freedBytes),
    errors,
  };
};

export const audioDeleter = {
  deleteAudioFile,
  deleteSelectedAudioFiles,
};
