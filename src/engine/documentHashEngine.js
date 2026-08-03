import { calculateDuplicates, formatBytes, generateFileHash } from './hashEngine';

/**
 * Calculates Document Duplicate Groups from raw document list
 * 
 * 1. Fast Filter: Group document files by EXACT byte size
 * 2. Exact Verification: Compute MD5 hash on potential duplicate groups
 * 3. Result Formatting: Mark 1 original document safe (unchecked) while duplicates are auto-selected (checked)
 * 
 * @param {Array<Object>} rawDocuments Array of raw document objects
 * @returns {Array<Object>} Array of DuplicateGroup objects
 */
export const calculateDocumentDuplicates = (rawDocuments = []) => {
  if (!Array.isArray(rawDocuments) || rawDocuments.length === 0) {
    console.log('[DocumentHashEngine] No document files provided for scanning.');
    return [];
  }

  // Delegate 2-level duplicate matching logic (Exact Size + MD5 Checksum & Similar Base Name)
  const groups = calculateDuplicates(rawDocuments);

  // Guarantee proper category tagging and metadata structure
  const formattedGroups = groups.map((group) => {
    const formattedFiles = group.files.map((file, idx) => ({
      ...file,
      category: 'Documents',
      isOriginal: idx === 0,
      selected: idx !== 0,
    }));

    return {
      ...group,
      category: 'Documents',
      files: formattedFiles,
    };
  });

  console.log(`[DocumentHashEngine] Total Document Duplicate Groups Matched: ${formattedGroups.length}`);

  return formattedGroups;
};

export const documentHashEngine = {
  calculateDocumentDuplicates,
};
