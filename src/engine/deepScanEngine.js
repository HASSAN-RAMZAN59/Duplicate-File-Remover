import { scanCategoryFiles } from './fileScanner';
import { scanAudioFiles } from './audioScanner';
import { calculateAudioDuplicates } from './audioHashEngine';
import { scanDocumentFiles } from './documentScanner';
import { calculateDocumentDuplicates } from './documentHashEngine';
import { scanContactDuplicates } from './contactScanner';
import { calculateDuplicates, formatBytes } from './hashEngine';

/**
 * Categories to analyze during a full Deep Scan
 */
const SCANNABLE_CATEGORIES = [
  { id: 'images', name: 'Images', icon: '🖼️' },
  { id: 'videos', name: 'Videos', icon: '🎥' },
  { id: 'audio', name: 'Audio', icon: '🎵' },
  { id: 'documents', name: 'Documents', icon: '📄' },
  { id: 'contacts', name: 'Contacts', icon: '👥' },
  { id: 'others', name: 'Others', icon: '📦' },
];

/**
 * Executes a full System Deep Scan across all storage categories.
 * 
 * @param {Function} onProgressCallback Optional callback `(progressPercentage, currentCategoryName) => void`
 * @returns {Promise<Object>} Aggregated Deep Scan Results
 */
export const runDeepScan = async (onProgressCallback) => {
  let completedSteps = 0;
  const totalSteps = SCANNABLE_CATEGORIES.length;

  const categoryResults = {};
  let totalDuplicateCount = 0;
  let totalReclaimableBytes = 0;
  const allDuplicateGroups = [];
  const allPreselectedFiles = [];

  for (const category of SCANNABLE_CATEGORIES) {
    if (typeof onProgressCallback === 'function') {
      const progressPercent = Math.round((completedSteps / totalSteps) * 100);
      onProgressCallback(progressPercent, category.name);
    }

    try {
      let groups = [];
      if (category.id === 'contacts') {
        groups = await scanContactDuplicates();
      } else if (category.id === 'audio') {
        const rawFiles = await scanAudioFiles();
        groups = calculateAudioDuplicates(rawFiles);
      } else if (category.id === 'documents') {
        const rawFiles = await scanDocumentFiles();
        groups = calculateDocumentDuplicates(rawFiles);
      } else {
        const rawFiles = await scanCategoryFiles(category.name);
        groups = calculateDuplicates(rawFiles);
      }

      let categoryDupesCount = 0;
      let categoryBytes = 0;

      for (const group of groups) {
        allDuplicateGroups.push({ ...group, categoryName: category.name });

        for (const file of group.files) {
          if (file.selected && !file.isOriginal) {
            categoryDupesCount += 1;
            categoryBytes += file.size || 0;
            allPreselectedFiles.push(file);
          }
        }
      }

      totalDuplicateCount += categoryDupesCount;
      totalReclaimableBytes += categoryBytes;

      categoryResults[category.id] = {
        name: category.name,
        icon: category.icon,
        duplicateCount: categoryDupesCount,
        reclaimableBytes: categoryBytes,
        reclaimableFormatted: formatBytes(categoryBytes),
        groups: groups,
      };
    } catch (error) {
      console.warn(`[DeepScanEngine] Error scanning category ${category.name}:`, error);
      categoryResults[category.id] = {
        name: category.name,
        icon: category.icon,
        duplicateCount: 0,
        reclaimableBytes: 0,
        reclaimableFormatted: '0 B',
        groups: [],
      };
    }

    completedSteps += 1;
  }

  // Final 100% progress notification
  if (typeof onProgressCallback === 'function') {
    onProgressCallback(100, 'Scan Finished');
  }

  return {
    totalDuplicateCount,
    totalReclaimableBytes,
    totalReclaimableFormatted: formatBytes(totalReclaimableBytes),
    categoryResults,
    allDuplicateGroups,
    allPreselectedFiles,
  };
};

export const deepScanEngine = {
  runDeepScan,
  SCANNABLE_CATEGORIES,
};
