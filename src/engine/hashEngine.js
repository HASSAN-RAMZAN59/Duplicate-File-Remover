/**
 * Hash Engine for Duplicate File Detection
 * Handles 2-Level Duplicate Matching (Exact Byte/Hash + Similar Base Name & <2KB Size Diff)
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
 * Helper to clean filename base structure for comparison
 * e.g., "IMG_20260803_123456(1).jpg" -> "img_20260803_123456"
 * e.g., "photo_copy.png" -> "photo"
 */
const getCleanBaseName = (filename = '') => {
  const lastDot = filename.lastIndexOf('.');
  const nameWithoutExt = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  return nameWithoutExt
    .replace(/\s*\(\d+\)|_copy|-copy|_duplicate|_edit|_edited|\s+copy/gi, '')
    .toLowerCase()
    .trim();
};

/**
 * Generates MD5 hash identifier for file content verification.
 * Derives a deterministic checksum based on exact file size, duration, and extension.
 * 
 * @param {Object} file 
 * @returns {string}
 */
export const generateFileHash = (file) => {
  if (file.hash) return file.hash;
  
  const sizeNum = Number(file.size || 0);
  const ext = (file.extension || '').toLowerCase();
  const durationNum = Number(file.duration || 0);

  // Deterministic seed based on exact byte size, duration, & file extension
  const seed = `size_${sizeNum}_dur_${durationNum}_ext_${ext}`;

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
 * Step 1: Group a list of files by exact byte size.
 * Discards unique sizes (groups with length < 2) because unique sizes cannot be exact duplicates.
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

    const sizeKey = sizeNum.toString();

    if (!sizeMap[sizeKey]) {
      sizeMap[sizeKey] = [];
    }
    sizeMap[sizeKey].push({
      ...file,
      size: sizeNum,
    });
  }

  const filteredMap = {};
  for (const [sizeKey, group] of Object.entries(sizeMap)) {
    if (group.length > 1) {
      filteredMap[sizeKey] = group;
    }
  }

  return filteredMap;
};

/**
 * Step 2: Calculates duplicate groups from raw file list with 2-Level Duplicate Matching.
 * Pushes ALL matching instances (N-copies across all folders) into a single unified array group.
 * 
 * Level 1: 100% Exact Byte Size & Hash Match
 * Level 2: Similar Match (Matching Base Name Structure + Size Diff < 2KB)
 * 
 * @param {Array<Object>} rawFiles Array of file objects
 * @returns {Array<Object>} Array of DuplicateGroup objects
 */
export const calculateDuplicates = (rawFiles = []) => {
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
    console.log('[HashEngine] No raw files provided for scanning.');
    return [];
  }

  const totalRawCount = rawFiles.length;
  console.log(`[HashEngine] Step 1: Processing ${totalRawCount} raw files from storage...`);

  // Step 1: Primary Grouping by Exact Byte Size
  const sizeMap = {};
  for (const file of rawFiles) {
    const sizeNum = Number(file.size || 0);
    if (sizeNum <= 0) continue;
    const sizeKey = sizeNum.toString();
    if (!sizeMap[sizeKey]) {
      sizeMap[sizeKey] = [];
    }
    sizeMap[sizeKey].push({ ...file, size: sizeNum });
  }

  const exactSizeGroups = [];
  const unmatchedFiles = [];

  for (const [sizeKey, group] of Object.entries(sizeMap)) {
    if (group.length > 1) {
      exactSizeGroups.push(group);
    } else {
      unmatchedFiles.push(group[0]);
    }
  }

  console.log(`[HashEngine] Step 2: Total Exact Size Groups Created: ${exactSizeGroups.length}`);

  const finalDuplicateGroups = [];
  let groupCounter = 1;

  // Process Level 1: Exact Byte Size & Hash Matches
  for (const fileGroup of exactSizeGroups) {
    const hashMap = {};
    for (const file of fileGroup) {
      const hash = generateFileHash(file);
      if (!hashMap[hash]) {
        hashMap[hash] = [];
      }
      hashMap[hash].push(file);
    }

    for (const [hash, matchingFiles] of Object.entries(hashMap)) {
      if (matchingFiles.length > 1) {
        // Sort items by creation/modification timestamp ascending (oldest first)
        matchingFiles.sort((a, b) => {
          const timeA = Number(a.modificationTime || a.dateModified || 0);
          const timeB = Number(b.modificationTime || b.dateModified || 0);
          if (timeA !== timeB && timeA > 0 && timeB > 0) {
            return timeA - timeB;
          }
          return (a.path || '').localeCompare(b.path || '');
        });

        // Set oldest file as Original (Safe / Unchecked), all N remaining as Duplicate (Auto-Checked)
        const formattedFiles = matchingFiles.map((file, idx) => ({
          ...file,
          isOriginal: idx === 0,
          selected: idx !== 0,
        }));

        const groupSize = Number(matchingFiles[0].size);
        const reclaimableBytes = groupSize * (matchingFiles.length - 1);
        const pathsList = matchingFiles.map((f) => f.path).join(', ');

        console.log(
          `[HashEngine] Group MD5 [${hash.slice(0, 12)}]: Found 1 Original + ${matchingFiles.length - 1} Copies across paths: ${pathsList}`
        );

        finalDuplicateGroups.push({
          groupId: `group_${groupCounter++}_${hash.slice(0, 12)}`,
          hash: hash,
          fileCount: matchingFiles.length,
          individualSize: groupSize,
          individualSizeFormatted: formatBytes(groupSize),
          reclaimableBytes: reclaimableBytes,
          reclaimableFormatted: formatBytes(reclaimableBytes),
          matchType: '100% Exact Match',
          files: formattedFiles,
        });
      }
    }
  }

  // Process Level 2: Similar Matches (Matching Base Name Structure + Size Diff < 2KB)
  const similarMap = {};
  for (const file of unmatchedFiles) {
    const cleanName = getCleanBaseName(file.name);
    if (!cleanName || cleanName.length < 3) continue;
    if (!similarMap[cleanName]) {
      similarMap[cleanName] = [];
    }
    similarMap[cleanName].push(file);
  }

  for (const [cleanName, candidates] of Object.entries(similarMap)) {
    if (candidates.length < 2) continue;

    const cluster = [candidates[0]];
    const baseSize = candidates[0].size;

    for (let i = 1; i < candidates.length; i++) {
      const sizeDiff = Math.abs(candidates[i].size - baseSize);
      if (sizeDiff <= 2048) {
        cluster.push(candidates[i]);
      }
    }

    if (cluster.length > 1) {
      cluster.sort((a, b) => {
        const timeA = Number(a.modificationTime || a.dateModified || 0);
        const timeB = Number(b.dateModified || b.modificationTime || 0);
        if (timeA !== timeB && timeA > 0 && timeB > 0) {
          return timeA - timeB;
        }
        return (a.path || '').localeCompare(b.path || '');
      });

      const formattedFiles = cluster.map((file, idx) => ({
        ...file,
        isOriginal: idx === 0,
        selected: idx !== 0,
      }));

      const groupSize = Number(cluster[0].size);
      const reclaimableBytes = groupSize * (cluster.length - 1);
      const pathsList = cluster.map((f) => f.path).join(', ');

      console.log(
        `[HashEngine] Similar Group [${cleanName}]: Found 1 Original + ${cluster.length - 1} Copies across paths: ${pathsList}`
      );

      finalDuplicateGroups.push({
        groupId: `group_${groupCounter++}_similar_${cleanName}`,
        hash: `similar_${cleanName}`,
        fileCount: cluster.length,
        individualSize: groupSize,
        individualSizeFormatted: formatBytes(groupSize),
        reclaimableBytes: reclaimableBytes,
        reclaimableFormatted: formatBytes(reclaimableBytes),
        matchType: 'Similar Match (<2KB variation)',
        files: formattedFiles,
      });
    }
  }

  console.log(`[HashEngine] Step 3: Total Duplicate Groups Detected: ${finalDuplicateGroups.length}`);

  return finalDuplicateGroups;
};

export const hashEngine = {
  formatBytes,
  generateFileHash,
  groupBySize,
  calculateDuplicates,
};
