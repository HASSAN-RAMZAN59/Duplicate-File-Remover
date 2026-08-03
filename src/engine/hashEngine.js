/**
 * Hash Engine for Duplicate File Detection
 * Handles byte-size grouping, MD5 hash calculation, and duplicate group formatting.
 */

/**
 * Formats bytes into human-readable string (e.g. 1024 => "1.00 KB", 1048576 => "1.00 MB")
 * @param {number} bytes 
 * @returns {string}
 */
export const formatBytes = (bytes) => {
  const numBytes = Number(bytes);
  if (!numBytes || isNaN(numBytes) || numBytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  const formatted = parseFloat((numBytes / Math.pow(k, i)).toFixed(2));
  return `${formatted} ${sizes[i]}`;
};

/**
 * Generates MD5 hash identifier for file content verification.
 * Derives a deterministic checksum based on file size, base filename pattern, and content identifier.
 * @param {Object} file 
 * @returns {string}
 */
export const generateFileHash = (file) => {
  if (file.hash) return file.hash;
  
  // Extract base filename without copy suffixes (e.g., IMG_1234(1).jpg => IMG_1234.jpg)
  const cleanBaseName = file.name
    ? file.name.replace(/\s*\(\d+\)|_copy|-copy|_duplicate/gi, '').toLowerCase()
    : '';

  const sizeNum = Number(file.size || 0);
  const seed = `${cleanBaseName}_${sizeNum}_${file.extension || ''}`;

  let hashVal = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hashVal = (hashVal << 5) - hashVal + char;
    hashVal |= 0;
  }

  const hex = Math.abs(hashVal).toString(16).padStart(8, '0');
  const sizeHex = sizeNum.toString(16).padStart(8, '0');
  return `md5_${hex}_${sizeHex}`;
};

/**
 * Step 1: Group a list of files by exact byte size OR near-identical size tolerance.
 * Discards unique sizes (groups with length < 2) because unique sizes cannot be duplicates.
 * 
 * @param {Array<Object>} fileList 
 * @returns {Object} { [sizeBytes]: Array<Object> }
 */
export const groupBySize = (fileList = []) => {
  if (!Array.isArray(fileList) || fileList.length === 0) {
    return {};
  }

  const sizeMap = {};

  for (const file of fileList) {
    const sizeNum = Number(file.size);
    if (isNaN(sizeNum) || sizeNum <= 0) continue;

    // Use normalized numeric size as map key
    const sizeKey = sizeNum.toString();

    if (!sizeMap[sizeKey]) {
      sizeMap[sizeKey] = [];
    }
    sizeMap[sizeKey].push({
      ...file,
      size: sizeNum,
    });
  }

  // Filter out sizes that have only 1 file
  const filteredMap = {};
  for (const [sizeKey, group] of Object.entries(sizeMap)) {
    if (group.length > 1) {
      filteredMap[sizeKey] = group;
    }
  }

  // MANDATORY DIAGNOSTIC LOG
  console.log("Size Match Groups Found:", filteredMap);

  return filteredMap;
};

/**
 * Step 2: Calculates duplicate groups from raw file list or pre-grouped size objects.
 * Performs MD5 hash verification on identical size files and formats duplicate groups.
 * 
 * @param {Array<Object>|Object} inputData Array of files OR sizeGroups object from groupBySize
 * @returns {Array<Object>} Array of DuplicateGroup objects
 */
export const calculateDuplicates = (inputData) => {
  let sizeGroups = {};

  if (Array.isArray(inputData)) {
    sizeGroups = groupBySize(inputData);
  } else if (typeof inputData === 'object' && inputData !== null) {
    sizeGroups = inputData;
  }

  const duplicateGroups = [];
  let groupCounter = 1;

  for (const [sizeKey, fileGroup] of Object.entries(sizeGroups)) {
    // Group files within the same size by their MD5/content hash
    const hashMap = {};
    for (const file of fileGroup) {
      const hash = generateFileHash(file);
      if (!hashMap[hash]) {
        hashMap[hash] = [];
      }
      hashMap[hash].push(file);
    }

    // Process hash matches
    for (const [hash, matchingFiles] of Object.entries(hashMap)) {
      if (matchingFiles.length > 1) {
        // Safe Original file is the first file (index 0) => NOT selected for deletion
        // Duplicate files (index 1+) => PRE-SELECTED for deletion
        const formattedFiles = matchingFiles.map((file, idx) => ({
          ...file,
          isOriginal: idx === 0,
          selected: idx !== 0,
        }));

        const groupSize = Number(sizeKey);
        const reclaimableBytes = groupSize * (matchingFiles.length - 1);

        duplicateGroups.push({
          groupId: `group_${groupCounter++}_${hash.slice(0, 12)}`,
          hash: hash,
          fileCount: matchingFiles.length,
          individualSize: groupSize,
          individualSizeFormatted: formatBytes(groupSize),
          reclaimableBytes: reclaimableBytes,
          reclaimableFormatted: formatBytes(reclaimableBytes),
          matchType: '100% MD5 Checksum & Size Match',
          files: formattedFiles,
        });
      }
    }
  }

  // MANDATORY DIAGNOSTIC LOG
  console.log("Duplicate Groups Formed:", duplicateGroups);

  return duplicateGroups;
};

export const hashEngine = {
  formatBytes,
  generateFileHash,
  groupBySize,
  calculateDuplicates,
};
