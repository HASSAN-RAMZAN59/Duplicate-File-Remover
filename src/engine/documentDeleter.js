import { deleteBatch } from './fileDeleter';
import { deleteFileFromDevice } from './fileScanner';

/**
 * Document Deletion & Storage Manager
 * Cross-Android version deletion engine for Document files (Android 6 to 15+)
 */

/**
 * Deletes a single document file from physical storage
 * @param {string} filePath 
 * @returns {Promise<boolean>}
 */
export const deleteSingleDocument = async (filePath) => {
  if (!filePath) return false;
  return await deleteFileFromDevice(filePath);
};

/**
 * Deletes a batch of document files from physical storage
 * @param {Array<Object>} documentsList List of document objects to delete
 * @returns {Promise<{ success: boolean, deletedPaths: Array<string>, failedPaths: Array<string> }>}
 */
export const deleteDocumentBatch = async (documentsList = []) => {
  if (!Array.isArray(documentsList) || documentsList.length === 0) {
    return { success: false, deletedPaths: [], failedPaths: [] };
  }

  return await deleteBatch(documentsList);
};

export const documentDeleter = {
  deleteSingleDocument,
  deleteDocumentBatch,
};
