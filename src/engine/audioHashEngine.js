import { formatBytes, generateFileHash } from './hashEngine';

/**
 * Advanced Audio Duplicate Engine
 * Implements 3-Level Matching:
 * Level 1: 100% Exact Byte Size & Hash
 * Level 2: Clean Base Name Match (strips _1, (1), -copy, etc.) + Size Diff <= 100KB
 * Level 3: Same Extension + Size Difference <= 512 Bytes (ID3 Metadata Tag Copy Variation)
 */

/**
 * Cleans filename copy suffixes, numbers, and tags
 * e.g., "audio_1.mp3" -> "audio"
 * e.g., "audio (1).mp3" -> "audio"
 * e.g., "audio_copy.mp3" -> "audio"
 */
const getCleanBaseName = (filename = '') => {
  const lastDot = filename.lastIndexOf('.');
  const nameWithoutExt = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  return nameWithoutExt
    .replace(/\s*\(\d+\)|_\d+|-\d+|\.\d+|_copy|-copy|_duplicate|\s+copy|\s+\d+/gi, '')
    .toLowerCase()
    .trim();
};

/**
 * Calculates duplicate audio groups from raw audio files with 3-Level Matching.
 * 
 * @param {Array<Object>} rawAudioFiles 
 * @returns {Array<Object>}
 */
export const calculateAudioDuplicates = (rawAudioFiles = []) => {
  if (!Array.isArray(rawAudioFiles) || rawAudioFiles.length === 0) {
    console.log('[AudioHashEngine] No raw audio files provided for scanning.');
    return [];
  }

  const totalRawCount = rawAudioFiles.length;
  console.log(`[AudioHashEngine] Evaluating ${totalRawCount} raw audio tracks across all device folders...`);

  const processedPaths = new Set();
  const finalDuplicateGroups = [];
  let groupCounter = 1;

  // Level 1: Group by Exact File Size
  const sizeMap = {};
  for (const audio of rawAudioFiles) {
    const sizeNum = Number(audio.size || 0);
    if (sizeNum <= 0) continue;
    const sizeKey = sizeNum.toString();
    if (!sizeMap[sizeKey]) {
      sizeMap[sizeKey] = [];
    }
    sizeMap[sizeKey].push({ ...audio, size: sizeNum });
  }

  for (const [sizeKey, group] of Object.entries(sizeMap)) {
    if (group.length > 1) {
      const hashMap = {};
      for (const audio of group) {
        const hash = generateFileHash(audio);
        if (!hashMap[hash]) {
          hashMap[hash] = [];
        }
        hashMap[hash].push(audio);
      }

      for (const [hash, matchingAudios] of Object.entries(hashMap)) {
        if (matchingAudios.length > 1) {
          const formattedFiles = matchingAudios.map((file, idx) => ({
            ...file,
            isOriginal: idx === 0,
            selected: idx !== 0,
          }));

          formattedFiles.forEach((f) => processedPaths.add(f.path));

          const groupSize = Number(matchingAudios[0].size);
          const reclaimableBytes = groupSize * (matchingAudios.length - 1);

          finalDuplicateGroups.push({
            groupId: `audio_group_${groupCounter++}_${hash.slice(0, 12)}`,
            hash: hash,
            fileCount: matchingAudios.length,
            individualSize: groupSize,
            individualSizeFormatted: formatBytes(groupSize),
            reclaimableBytes: reclaimableBytes,
            reclaimableFormatted: formatBytes(reclaimableBytes),
            matchType: '100% Exact Audio Match',
            files: formattedFiles,
          });
        }
      }
    }
  }

  // Filter remaining unprocessed files for Level 2 & Level 3
  const remainingFiles = rawAudioFiles.filter((f) => !processedPaths.has(f.path));

  // Level 2: Clean Base Name Match (Size Diff <= 100KB)
  const nameMap = {};
  for (const audio of remainingFiles) {
    const cleanName = getCleanBaseName(audio.name || audio.title);
    if (!cleanName || cleanName.length < 2) continue;
    if (!nameMap[cleanName]) {
      nameMap[cleanName] = [];
    }
    nameMap[cleanName].push(audio);
  }

  for (const [cleanName, candidates] of Object.entries(nameMap)) {
    if (candidates.length < 2) continue;

    const cluster = [candidates[0]];
    const baseSize = Number(candidates[0].size || 0);

    for (let i = 1; i < candidates.length; i++) {
      const candSize = Number(candidates[i].size || 0);
      const sizeDiff = Math.abs(candSize - baseSize);
      if (sizeDiff <= 102400) { // 100KB variation allowed for tags/copies
        cluster.push(candidates[i]);
      }
    }

    if (cluster.length > 1) {
      const formattedFiles = cluster.map((file, idx) => ({
        ...file,
        isOriginal: idx === 0,
        selected: idx !== 0,
      }));

      formattedFiles.forEach((f) => processedPaths.add(f.path));

      const groupSize = Number(cluster[0].size);
      const reclaimableBytes = groupSize * (cluster.length - 1);

      finalDuplicateGroups.push({
        groupId: `audio_group_${groupCounter++}_similar_${cleanName}`,
        hash: `similar_${cleanName}`,
        fileCount: cluster.length,
        individualSize: groupSize,
        individualSizeFormatted: formatBytes(groupSize),
        reclaimableBytes: reclaimableBytes,
        reclaimableFormatted: formatBytes(reclaimableBytes),
        matchType: 'Duplicate Audio Match',
        files: formattedFiles,
      });
    }
  }

  // Level 3: Same Extension + Size Difference <= 512 Bytes (Un-named exact audio copies)
  const unhandledFiles = rawAudioFiles.filter((f) => !processedPaths.has(f.path));
  for (let i = 0; i < unhandledFiles.length; i++) {
    const fileA = unhandledFiles[i];
    if (processedPaths.has(fileA.path)) continue;

    const cluster = [fileA];
    const sizeA = Number(fileA.size || 0);
    const extA = (fileA.extension || '').toLowerCase();

    for (let j = i + 1; j < unhandledFiles.length; j++) {
      const fileB = unhandledFiles[j];
      if (processedPaths.has(fileB.path)) continue;

      const sizeB = Number(fileB.size || 0);
      const extB = (fileB.extension || '').toLowerCase();

      if (extA === extB && Math.abs(sizeA - sizeB) <= 512) {
        cluster.push(fileB);
      }
    }

    if (cluster.length > 1) {
      const formattedFiles = cluster.map((file, idx) => ({
        ...file,
        isOriginal: idx === 0,
        selected: idx !== 0,
      }));

      formattedFiles.forEach((f) => processedPaths.add(f.path));

      const groupSize = Number(cluster[0].size);
      const reclaimableBytes = groupSize * (cluster.length - 1);

      finalDuplicateGroups.push({
        groupId: `audio_group_${groupCounter++}_tagmatch_${i}`,
        hash: `tagmatch_${i}`,
        fileCount: cluster.length,
        individualSize: groupSize,
        individualSizeFormatted: formatBytes(groupSize),
        reclaimableBytes: reclaimableBytes,
        reclaimableFormatted: formatBytes(reclaimableBytes),
        matchType: 'Audio Tag/Content Match',
        files: formattedFiles,
      });
    }
  }

  console.log(`[AudioHashEngine] Total Duplicate Audio Groups Detected: ${finalDuplicateGroups.length}`);

  return finalDuplicateGroups;
};

export const audioHashEngine = {
  calculateAudioDuplicates,
};
