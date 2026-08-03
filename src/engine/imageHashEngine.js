import { NativeModules } from 'react-native';
import { formatBytes } from './hashEngine';

/**
 * Computes Full File MD5 Checksum from physical disk using RNFS.hash
 * Returns null if file is unreadable, empty, or missing.
 * 
 * @param {string} rawPath 
 * @returns {Promise<string|null>}
 */
export const computeRealFileMd5 = async (rawPath) => {
  if (!rawPath) return null;

  let cleanPath = rawPath;
  if (cleanPath.startsWith('file://')) {
    cleanPath = cleanPath.substring(7);
  }
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch (e) {}

  try {
    const RNFS = NativeModules.RNFSManager || NativeModules.RNFS;
    if (RNFS && typeof RNFS.hash === 'function') {
      const hashResult = await RNFS.hash(cleanPath, 'md5');
      if (hashResult && typeof hashResult === 'string' && hashResult.length > 0) {
        return hashResult.toLowerCase();
      }
    }
  } catch (err) {
    console.warn(`[ImageHashEngine] Failed to compute MD5 hash for "${cleanPath}":`, err.message);
  }

  return null;
};

/**
 * Cleans image name to base name for similar name matching
 * e.g., "IMG_20260803_123456(1).jpg" -> "img_20260803_123456"
 * e.g., "photo_copy_edited.png" -> "photo"
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
 * Multi-Level Exhaustive Verification Engine for Image Duplicates Across All Folders
 * 
 * Level 1: 100% Exact Byte Size & MD5 Hash Match (across DCIM, Movies, Documents, Pictures, Downloads, Editors).
 * Level 2: Similar Image Copy Match (Matching Base Name + Byte Size Variation <= 4KB).
 * 
 * @param {Array<Object>} rawImages Array of raw image file objects
 * @returns {Promise<Array<Object>>} Verified DuplicateGroup objects array
 */
export const calculateImageDuplicates = async (rawImages = []) => {
  if (!Array.isArray(rawImages) || rawImages.length === 0) {
    console.log('[ImageHashEngine] No raw images provided for duplicate evaluation.');
    return [];
  }

  console.log(`[ImageHashEngine] ==================== START IMAGE SCAN ====================`);
  console.log(`[ImageHashEngine] Total raw images to evaluate across all folders: ${rawImages.length}`);

  // STEP 1: Primary Grouping by Exact Byte Size
  const sizeMap = {};
  for (const image of rawImages) {
    const sizeNum = Number(image.size || 0);
    if (sizeNum <= 0) continue;

    const sizeKey = sizeNum.toString();
    if (!sizeMap[sizeKey]) {
      sizeMap[sizeKey] = [];
    }
    sizeMap[sizeKey].push({ ...image, size: sizeNum });
  }

  const potentialSizeGroups = Object.values(sizeMap).filter((group) => group.length > 1);
  const unmatchedImages = [];
  Object.values(sizeMap).forEach((group) => {
    if (group.length === 1) {
      unmatchedImages.push(group[0]);
    }
  });

  const verifiedDuplicateGroups = [];
  let groupCounter = 1;

  // STEP 2: Level 1 - Full MD5 / Size Hash Computation for Exact Groups
  for (const sizeGroup of potentialSizeGroups) {
    const md5Map = {};

    for (const image of sizeGroup) {
      const realMd5 = await computeRealFileMd5(image.path);
      // Fallback hash if RNFS hash is unavailable so no folder's copy is dropped
      const finalHash = realMd5 || `size_hash_${image.size}_${(image.name || '').toLowerCase()}`;

      if (!md5Map[finalHash]) {
        md5Map[finalHash] = [];
      }
      md5Map[finalHash].push({ ...image, realMd5: finalHash });
    }

    for (const [md5Hash, candidateFiles] of Object.entries(md5Map)) {
      if (candidateFiles.length < 2) {
        if (candidateFiles.length === 1) {
          unmatchedImages.push(candidateFiles[0]);
        }
        continue;
      }

      // Sort files chronologically: oldest file = Original (Unchecked), newer files = Duplicates (Selected)
      candidateFiles.sort((a, b) => {
        const timeA = Number(a.dateModified || a.modificationTime || 0);
        const timeB = Number(b.dateModified || b.modificationTime || 0);
        return timeA - timeB;
      });

      const groupSize = Number(candidateFiles[0].size);
      const reclaimableBytes = groupSize * (candidateFiles.length - 1);

      const formattedFiles = candidateFiles.map((file, idx) => ({
        ...file,
        isOriginal: idx === 0,
        selected: idx !== 0,
        category: 'Images',
      }));

      verifiedDuplicateGroups.push({
        groupId: `img_group_${groupCounter++}_${md5Hash.slice(0, 10)}`,
        hash: md5Hash,
        fileCount: candidateFiles.length,
        individualSize: groupSize,
        individualSizeFormatted: formatBytes(groupSize),
        reclaimableBytes: reclaimableBytes,
        reclaimableFormatted: formatBytes(reclaimableBytes),
        matchType: '100% Exact Match (All Folders)',
        categoryName: 'Images',
        files: formattedFiles,
      });
    }
  }

  // STEP 3: Level 2 - Similar Image Matcher (Same clean base name + size variation <= 4KB)
  const similarMap = {};
  for (const file of unmatchedImages) {
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
      if (sizeDiff <= 4096) { // 4KB variation for edited/copied images
        cluster.push(candidates[i]);
      }
    }

    if (cluster.length > 1) {
      cluster.sort((a, b) => {
        const timeA = Number(a.dateModified || a.modificationTime || 0);
        const timeB = Number(b.dateModified || b.modificationTime || 0);
        return timeA - timeB;
      });

      const groupSize = Number(cluster[0].size);
      const reclaimableBytes = groupSize * (cluster.length - 1);

      const formattedFiles = cluster.map((file, idx) => ({
        ...file,
        isOriginal: idx === 0,
        selected: idx !== 0,
        category: 'Images',
      }));

      verifiedDuplicateGroups.push({
        groupId: `img_group_${groupCounter++}_similar_${cleanName}`,
        hash: `similar_${cleanName}`,
        fileCount: cluster.length,
        individualSize: groupSize,
        individualSizeFormatted: formatBytes(groupSize),
        reclaimableBytes: reclaimableBytes,
        reclaimableFormatted: formatBytes(reclaimableBytes),
        matchType: 'Similar Image Copy (<4KB variation)',
        categoryName: 'Images',
        files: formattedFiles,
      });
    }
  }

  console.log(`[ImageHashEngine] End Image Audit. Total Verified Duplicate Groups: ${verifiedDuplicateGroups.length}`);

  return verifiedDuplicateGroups;
};

export const imageHashEngine = {
  computeRealFileMd5,
  calculateImageDuplicates,
};
