import { NativeModules, Image } from 'react-native';
import { formatBytes } from './hashEngine';

/**
 * Computes Full File MD5 Checksum from physical disk using RNFS.hash
 * Returns null if file is unreadable, empty, or missing (Strict error handling).
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

  // EXPLICIT ERROR HANDLING: Do NOT return fallback hash string
  return null;
};

/**
 * Extracts Image Dimensions (Width x Height) asynchronously
 * Returns null if dimensions cannot be retrieved
 * 
 * @param {string} imagePath 
 * @returns {Promise<{width: number, height: number}|null>}
 */
export const getImageDimensions = (imagePath) => {
  return new Promise((resolve) => {
    if (!imagePath) return resolve(null);

    let uri = imagePath;
    if (!uri.startsWith('file://') && uri.startsWith('/')) {
      uri = `file://${uri}`;
    }

    try {
      Image.getSize(
        uri,
        (width, height) => {
          if (width > 0 && height > 0) {
            resolve({ width, height });
          } else {
            resolve(null);
          }
        },
        () => resolve(null)
      );
    } catch (e) {
      resolve(null);
    }
  });
};

/**
 * Multi-Level Strict Verification Engine for Image Duplicates
 * 
 * Step 1 (Size Check): Group images ONLY if they have the EXACT SAME size down to the byte.
 * Step 2 (Full MD5 Hash): Compute real full file MD5 hash from raw bytes. Exclude files with failed MD5.
 * Step 3 (Dimensions Check Fallback): Cross-check Image Dimensions (Width x Height). Reject if dimensions mismatch.
 * 
 * @param {Array<Object>} rawImages Array of raw image file objects
 * @returns {Promise<Array<Object>>} Array of verified DuplicateGroup objects
 */
export const calculateImageDuplicates = async (rawImages = []) => {
  if (!Array.isArray(rawImages) || rawImages.length === 0) {
    console.log('[ImageHashEngine] No raw images provided for duplicate evaluation.');
    return [];
  }

  console.log(`[ImageHashEngine] ==================== START IMAGE AUDIT ====================`);
  console.log(`[ImageHashEngine] Total raw images to evaluate: ${rawImages.length}`);

  // -------------------------------------------------------------------------
  // STEP 1: Strict Exact Byte Size Grouping
  // -------------------------------------------------------------------------
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

  // Keep size groups with at least 2 candidates
  const potentialSizeGroups = Object.values(sizeMap).filter((group) => group.length > 1);
  console.log(`[ImageHashEngine] Step 1 Complete: Potential byte-size candidate groups: ${potentialSizeGroups.length}`);

  if (potentialSizeGroups.length === 0) {
    console.log(`[ImageHashEngine] 0 duplicate candidate groups found by exact byte size.`);
    return [];
  }

  // -------------------------------------------------------------------------
  // STEP 2: Full Stream MD5 Hash Computation
  // -------------------------------------------------------------------------
  const verifiedDuplicateGroups = [];
  let groupCounter = 1;

  for (const sizeGroup of potentialSizeGroups) {
    const md5Map = {};

    for (const image of sizeGroup) {
      const realMd5 = await computeRealFileMd5(image.path);

      // Exclude files that failed hash computation or returned null
      if (!realMd5) {
        console.log(`[ImageHashEngine] Excluded unreadable image from grouping: "${image.path}"`);
        continue;
      }

      if (!md5Map[realMd5]) {
        md5Map[realMd5] = [];
      }
      md5Map[realMd5].push({ ...image, realMd5 });
    }

    // Process each MD5 candidate group
    for (const [md5Hash, candidateFiles] of Object.entries(md5Map)) {
      if (candidateFiles.length < 2) continue;

      // ---------------------------------------------------------------------
      // STEP 3: Image Dimensions Verification & False Positive Filtering
      // ---------------------------------------------------------------------
      const referenceImage = candidateFiles[0];
      const referenceDim = await getImageDimensions(referenceImage.path);

      const verifiedFiles = [referenceImage];
      const rejectedFiles = [];

      for (let i = 1; i < candidateFiles.length; i++) {
        const targetImage = candidateFiles[i];
        const targetDim = await getImageDimensions(targetImage.path);

        console.log(`[ImageHashEngine] Evaluating Candidate Pair:`);
        console.log(`  File A: "${referenceImage.path}" (${referenceImage.size} B, MD5: ${md5Hash})`);
        console.log(`  File B: "${targetImage.path}" (${targetImage.size} B, MD5: ${targetImage.realMd5})`);

        let isDimensionValid = true;
        if (referenceDim && targetDim) {
          console.log(`  Dimensions A: ${referenceDim.width}x${referenceDim.height} | Dimensions B: ${targetDim.width}x${targetDim.height}`);
          if (referenceDim.width !== targetDim.width || referenceDim.height !== targetDim.height) {
            isDimensionValid = false;
          }
        }

        if (isDimensionValid && md5Hash === targetImage.realMd5) {
          console.log(`  Result: [MATCH] Verified 100% Identical Image Duplicate`);
          verifiedFiles.push(targetImage);
        } else {
          const reason = !isDimensionValid
            ? `Dimensions Mismatch (${referenceDim.width}x${referenceDim.height} vs ${targetDim.width}x${targetDim.height})`
            : `Hash Mismatch (${md5Hash} vs ${targetImage.realMd5})`;
          console.log(`  Result: [MISMATCH - False Positive Blocked] Reason: ${reason}`);
          rejectedFiles.push({ file: targetImage, reason });
        }
      }

      // Only create group if at least 2 files pass all 3 verification steps
      if (verifiedFiles.length > 1) {
        // Chronological Sorting & Path Priority:
        // Rule: The OLDEST file (lowest dateModified timestamp) MUST BE set as Original (Unchecked).
        // Rule: All NEWER files (higher timestamp/copies) MUST BE set as Duplicates (Auto-Selected).
        const getPathPriority = (filePath = '') => {
          const lower = filePath.toLowerCase();
          if (lower.includes('/dcim/camera/')) return 1;
          if (lower.includes('/dcim/')) return 2;
          if (lower.includes('/pictures/')) return 3;
          if (lower.includes('/whatsapp/')) return 4;
          if (lower.includes('/documents/')) return 5;
          if (lower.includes('/download/')) return 6;
          return 10;
        };

        verifiedFiles.sort((a, b) => {
          const timeA = Number(a.dateModified || a.modificationTime || 0);
          const timeB = Number(b.dateModified || b.modificationTime || 0);

          // 1. Primary: Sort by timestamp ASCENDING (Oldest file first)
          if (timeA !== timeB && timeA > 0 && timeB > 0) {
            return timeA - timeB;
          }

          // 2. Fallback: Path hierarchy priority (Camera > Pictures > WhatsApp > Documents > Download)
          return getPathPriority(a.path) - getPathPriority(b.path);
        });

        console.log(`[ImageHashEngine] Verified Group Sorted Chronologically (Oldest File Selected as Original):`);
        verifiedFiles.forEach((f, index) => {
          console.log(`  [${index === 0 ? 'ORIGINAL (SAFE)' : 'DUPLICATE (SELECTED)'}] "${f.path}" | Timestamp: ${f.dateModified || f.modificationTime}`);
        });

        const groupSize = Number(verifiedFiles[0].size);
        const reclaimableBytes = groupSize * (verifiedFiles.length - 1);

        const formattedFiles = verifiedFiles.map((file, idx) => ({
          ...file,
          isOriginal: idx === 0,
          selected: idx !== 0,
          category: 'Images',
        }));

        verifiedDuplicateGroups.push({
          groupId: `img_group_${groupCounter++}_${md5Hash.slice(0, 10)}`,
          hash: md5Hash,
          fileCount: verifiedFiles.length,
          individualSize: groupSize,
          individualSizeFormatted: formatBytes(groupSize),
          reclaimableBytes: reclaimableBytes,
          reclaimableFormatted: formatBytes(reclaimableBytes),
          matchType: '100% Verified MD5 Exact Match',
          categoryName: 'Images',
          files: formattedFiles,
        });
      }
    }
  }

  console.log(`[ImageHashEngine] ==================== END IMAGE AUDIT ====================`);
  console.log(`[ImageHashEngine] Total Verified 100% Duplicate Image Groups: ${verifiedDuplicateGroups.length}`);

  return verifiedDuplicateGroups;
};

export const imageHashEngine = {
  computeRealFileMd5,
  getImageDimensions,
  calculateImageDuplicates,
};
