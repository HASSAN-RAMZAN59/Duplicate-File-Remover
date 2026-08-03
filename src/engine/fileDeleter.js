import { NativeModules } from 'react-native';
import { formatBytes } from './hashEngine';

/**
 * 1. Safely deletes a batch of selected duplicate files from physical device storage.
 * Follows multi-Android version MediaStore deletion policies (Android 6 - Android 15).
 * 
 * @param {Array<Object|string>} filesOrPaths Array of file objects OR file path strings
 * @returns {Promise<Object>} { success: boolean, deletedCount: number, freedBytes: number, freedFormatted: string, errors: Array }
 */
export const deleteSelectedFiles = async (filesOrPaths = []) => {
  if (!Array.isArray(filesOrPaths) || filesOrPaths.length === 0) {
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
  const NativeFileDeleter = NativeModules.NativeFileDeleter;
  const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;

  for (const item of filesOrPaths) {
    const rawPath = typeof item === 'string' ? item : item.path;
    const size = typeof item === 'object' && item.size ? Number(item.size) : 0;

    if (!rawPath) continue;

    let cleanPath = rawPath;
    if (cleanPath.startsWith('file://')) {
      cleanPath = cleanPath.substring(7);
    }
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch (e) {}

    let isDeleted = false;

    // Primary Execution: Multi-Android Native MediaStore Deletion Module
    try {
      if (NativeFileDeleter && typeof NativeFileDeleter.deleteFileNative === 'function') {
        isDeleted = await NativeFileDeleter.deleteFileNative(cleanPath);
      }
    } catch (nativeErr) {
      console.warn('[FileDeleter] NativeFileDeleter error:', nativeErr);
    }

    // Fallback Execution: RNFS unlink & scanFile
    if (!isDeleted && RNFS) {
      try {
        if (typeof RNFS.unlink === 'function') {
          await RNFS.unlink(cleanPath);
        }
        if (typeof RNFS.scanFile === 'function') {
          await RNFS.scanFile(cleanPath);
        }
      } catch (rnfsErr) {
        console.warn('[FileDeleter] RNFS fallback error:', rnfsErr);
      }
    }

    // Rescan Verification: Confirm if file exists on disk
    let stillExists = true;
    try {
      if (RNFS && typeof RNFS.exists === 'function') {
        stillExists = await RNFS.exists(cleanPath);
      }
    } catch (e) {}

    console.log(`[FileDeleter] Rescan Verification for ${cleanPath}: stillExists = ${stillExists}`);

    if (!stillExists || isDeleted) {
      deletedCount += 1;
      freedBytes += size;
    } else {
      errors.push({ path: cleanPath, error: 'File still exists on disk after deletion attempt' });
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

/**
 * 2. Removes a batch of selected duplicate contacts from the device contact list.
 * 
 * @param {Array<Object|string>} contactsOrIds Array of contact objects OR recordID strings
 * @returns {Promise<Object>} { success: boolean, deletedCount: number, freedBytes: number, freedFormatted: string, errors: Array }
 */
export const deleteSelectedContacts = async (contactsOrIds = []) => {
  if (!Array.isArray(contactsOrIds) || contactsOrIds.length === 0) {
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
  const ContactsNative = NativeModules.RNContacts || NativeModules.Contacts;

  for (const item of contactsOrIds) {
    const contactData = typeof item === 'object' && item.contactData ? item.contactData : item;
    const recordID = typeof item === 'string' ? item : (item.id || item.recordID);

    try {
      if (ContactsNative && typeof ContactsNative.deleteContact === 'function') {
        await ContactsNative.deleteContact(contactData);
        deletedCount += 1;
        freedBytes += 1024;
      }
    } catch (error) {
      console.warn('[FileDeleter] Failed to delete contact from phonebook:', recordID, error);
      errors.push({ recordID, error: error.message });
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

/**
 * 3. Unified Deletion Router
 * Automatically handles batch deletion for files or contacts.
 * 
 * @param {Array<Object>} selectedItems List of items marked for deletion
 * @returns {Promise<Object>} Overall deletion result summary
 */
export const deleteBatch = async (selectedItems = []) => {
  const fileItems = [];
  const contactItems = [];

  for (const item of selectedItems) {
    if (item.category === 'Contacts' || item.contactData) {
      contactItems.push(item);
    } else {
      fileItems.push(item);
    }
  }

  const [fileRes, contactRes] = await Promise.all([
    deleteSelectedFiles(fileItems),
    deleteSelectedContacts(contactItems),
  ]);

  const totalCount = fileRes.deletedCount + contactRes.deletedCount;
  const totalFreedBytes = fileRes.freedBytes + contactRes.freedBytes;

  return {
    success: fileRes.success && contactRes.success,
    deletedCount: totalCount,
    freedBytes: totalFreedBytes,
    freedFormatted: formatBytes(totalFreedBytes),
  };
};

export const fileDeleter = {
  deleteSelectedFiles,
  deleteSelectedContacts,
  deleteBatch,
};
