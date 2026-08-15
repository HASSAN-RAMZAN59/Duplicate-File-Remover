import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  BackHandler,
} from 'react-native';
import { ROUTES } from '../navigation/routes';
import { scanCategoryFiles } from '../engine/fileScanner';
import { scanAudioFiles } from '../engine/audioScanner';
import { calculateAudioDuplicates } from '../engine/audioHashEngine';
import { scanContactDuplicates } from '../engine/contactScanner';
import { mergeSelectedContactGroups } from '../engine/contactMerger';
import { scanDocumentFiles } from '../engine/documentScanner';
import { calculateDocumentDuplicates } from '../engine/documentHashEngine';
import { scanImageFiles } from '../engine/imageScanner';
import { calculateImageDuplicates } from '../engine/imageHashEngine';
import { calculateDuplicates, formatBytes } from '../engine/hashEngine';
import { deleteBatch } from '../engine/fileDeleter';
import { CustomDialog } from '../components/CustomDialog';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { useTranslation } from '../context/LanguageContext';
import BackArrowSvg from '../assets/back arrow.svg';
import DelIconSvg from '../assets/del.svg';
import GroupHeaderSvg from '../assets/scan resultgroup.svg';
import PinIconSvg from '../assets/pin.svg';
import EmptyStateSvg from '../assets/FILES AND FOLDER grad fill.svg';
import LottieView from 'lottie-react-native';

export const DuplicateViewerScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { categoryType = 'Images', initialGroups = null } = route.params || {};

  const [isLoading, setIsLoading] = useState(!Array.isArray(initialGroups));
  const [duplicateGroups, setDuplicateGroups] = useState(() => {
    if (Array.isArray(initialGroups)) {
      return initialGroups.map((group) => ({
        ...group,
        files: (group.files || []).map((file) => ({
          ...file,
          selected: !file.isOriginal,
        })),
      }));
    }
    return [];
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAutoSelected, setIsAutoSelected] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    title: '',
    message: '',
    iconType: 'none',
    primaryButtonText: 'OK',
    primaryButtonColor: '#306FFF',
    onPrimaryPress: null,
    secondaryButtonText: null,
    onSecondaryPress: null,
  });

  const hideDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  const hasScannedRef = useRef(false);
  const isContacts = categoryType.toUpperCase() === 'CONTACTS';

  // Safe back navigation handler passing updated groups to DeepScanScreen
  const handleGoBack = useCallback(() => {
    navigation.navigate({
      name: ROUTES.DEEP_SCAN,
      params: {
        updatedCategoryName: categoryType,
        updatedGroups: duplicateGroups,
      },
      merge: true,
    });
  }, [navigation, categoryType, duplicateGroups]);

  // Handle hardware back press on Android
  useEffect(() => {
    const onBackPress = () => {
      handleGoBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleGoBack]);

  // 1. Perform Real-Time Scanning Engine
  const performScan = useCallback(async () => {
    setIsLoading(true);
    try {
      let groups = [];
      let rawFiles = [];

      if (categoryType.toUpperCase() === 'CONTACTS') {
        groups = await scanContactDuplicates();
      } else if (categoryType.toUpperCase() === 'AUDIO') {
        rawFiles = await scanAudioFiles();
        groups = calculateAudioDuplicates(rawFiles);
      } else if (categoryType.toUpperCase() === 'DOCUMENTS') {
        rawFiles = await scanDocumentFiles();
        groups = calculateDocumentDuplicates(rawFiles);
      } else if (categoryType.toUpperCase() === 'IMAGES') {
        rawFiles = await scanImageFiles();
        groups = await calculateImageDuplicates(rawFiles);
      } else {
        rawFiles = await scanCategoryFiles(categoryType);
        groups = calculateDuplicates(rawFiles);
      }

      // Ensure all duplicates are pre-selected by default on scan load
      const autoSelectedGroups = groups.map((group) => ({
        ...group,
        files: group.files.map((file) => ({
          ...file,
          selected: !file.isOriginal,
        })),
      }));

      setDuplicateGroups(autoSelectedGroups);
      setIsAutoSelected(true);
    } catch (error) {
      console.error('[DuplicateViewer] Scanning error:', error);
      setDuplicateGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryType]);

  // Run scan once on mount (prevents re-scanning when returning from FileDetailScreen or when pre-scanned)
  useEffect(() => {
    if (!hasScannedRef.current) {
      hasScannedRef.current = true;

      if (route.params?.initialGroups && Array.isArray(route.params.initialGroups)) {
        const groups = route.params.initialGroups;
        const autoSelectedGroups = groups.map((group) => ({
          ...group,
          files: (group.files || []).map((file) => ({
            ...file,
            selected: !file.isOriginal,
          })),
        }));
        setDuplicateGroups(autoSelectedGroups);
        setIsAutoSelected(true);
        setIsLoading(false);
      } else {
        performScan();
      }
    }
  }, [performScan, route.params]);

  // Handle single file deletion sync when returning from FileDetailScreen
  useEffect(() => {
    if (route.params?.deletedFilePath) {
      const deletedPath = route.params.deletedFilePath;
      const deletedId = route.params.deletedFileId;

      setDuplicateGroups((prevGroups) => {
        const updatedGroups = prevGroups
          .map((group) => {
            const remainingFiles = group.files.filter(
              (f) => f.path !== deletedPath && f.id !== deletedId
            );
            return {
              ...group,
              files: remainingFiles,
              fileCount: remainingFiles.length,
            };
          })
          .filter((group) => group.files.length > 1);

        return updatedGroups;
      });

      navigation.setParams({ deletedFilePath: undefined, deletedFileId: undefined });
    }
  }, [route.params?.deletedFilePath, route.params?.deletedFileId, navigation]);

  // 2. Computed Metrics (Selected items count & total bytes selected)
  const selectionSummary = useMemo(() => {
    let selectedCount = 0;
    let selectedBytes = 0;

    duplicateGroups.forEach((group) => {
      group.files.forEach((file) => {
        if (file.selected) {
          selectedCount += 1;
          selectedBytes += Number(file.size || 0);
        }
      });
    });

    return {
      selectedCount,
      selectedBytes,
      formattedBytes: formatBytes(selectedBytes),
    };
  }, [duplicateGroups]);

  // 3. Selection Handlers
  const toggleFileSelection = (groupId, fileId) => {
    setDuplicateGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.groupId !== groupId) return group;
        return {
          ...group,
          files: group.files.map((file) => {
            if (file.id !== fileId) return file;
            return { ...file, selected: !file.selected };
          }),
        };
      })
    );
  };

  // Auto Select Handler: Toggles selection of all duplicates vs unselect all
  const handleAutoSelect = () => {
    const nextState = !isAutoSelected;
    setIsAutoSelected(nextState);

    setDuplicateGroups((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        files: group.files.map((file) => ({
          ...file,
          selected: nextState ? !file.isOriginal : false,
        })),
      }))
    );
  };

  // 4. Primary Action Handler (Merge Contacts / Delete Selected Files)
  const handlePrimaryAction = () => {
    if (selectionSummary.selectedCount === 0) {
      setDialogConfig({
        visible: true,
        title: 'No Selection',
        message: isContacts
          ? 'Please select at least one duplicate contact to merge.'
          : 'Please select at least one duplicate file to delete.',
        iconType: 'warning',
        primaryButtonText: 'OK',
        primaryButtonColor: '#306FFF',
        onPrimaryPress: hideDialog,
      });
      return;
    }

    if (isContacts) {
      setDialogConfig({
        visible: true,
        title: 'Confirm Contact Merge',
        message: 'Selected duplicate contacts will be merged into 1 unified contact card.',
        iconType: 'warning',
        primaryButtonText: 'Merge Contacts',
        primaryButtonColor: '#306FFF',
        secondaryButtonText: t('cancel', 'Cancel'),
        onSecondaryPress: hideDialog,
        onPrimaryPress: async () => {
          hideDialog();
          setIsDeleting(true);
          try {
            const res = await mergeSelectedContactGroups(duplicateGroups);
            setIsDeleting(false);

            if (res.success || res.totalMerged > 0) {
              setDialogConfig({
                visible: true,
                title: 'Contacts Merged',
                message: 'Contacts merged successfully.',
                iconType: 'success',
                primaryButtonText: 'OK',
                primaryButtonColor: '#306FFF',
                onPrimaryPress: hideDialog,
              });
              performScan();
            } else {
              setDialogConfig({
                visible: true,
                title: t('cleanupWarning', 'Merge Error'),
                message: t('someFilesNotRemoved', 'Could not merge selected contacts.'),
                iconType: 'warning',
                primaryButtonText: 'OK',
                primaryButtonColor: '#306FFF',
                onPrimaryPress: hideDialog,
              });
            }
          } catch (error) {
            setIsDeleting(false);
            setDialogConfig({
              visible: true,
              title: t('cleanupWarning', 'Error'),
              message: t('someFilesNotRemoved', 'An error occurred while merging contacts.'),
              iconType: 'warning',
              primaryButtonText: 'OK',
              primaryButtonColor: '#306FFF',
              onPrimaryPress: hideDialog,
            });
          }
        },
      });
    } else {
      setDialogConfig({
        visible: true,
        title: t('deleteConfirmTitle', 'Confirm Deletion'),
        message: t('deleteConfirmBody', `Are you sure you want to delete ${selectionSummary.selectedCount} item(s) (${selectionSummary.formattedBytes})?`).replace('{count}', selectionSummary.selectedCount).replace('{size}', selectionSummary.formattedBytes),
        primaryButtonText: t('deletePermanently', 'Delete Permanently'),
        primaryButtonColor: '#FFFFFF',
        secondaryButtonText: t('cancel', 'Cancel'),
        onSecondaryPress: hideDialog,
        onPrimaryPress: async () => {
          hideDialog();
          setIsDeleting(true);
          const selectedItems = [];

          duplicateGroups.forEach((group) => {
            group.files.forEach((file) => {
              if (file.selected) {
                selectedItems.push(file);
              }
            });
          });

          try {
            const res = await deleteBatch(selectedItems);
            setIsDeleting(false);

            if (res.deletedCount > 0) {
              const deletedPathsSet = new Set(selectedItems.map((item) => item.path));

              setDuplicateGroups((prevGroups) => {
                const updatedGroups = prevGroups
                  .map((group) => {
                    const remainingFiles = group.files.filter(
                      (file) => !deletedPathsSet.has(file.path)
                    );
                    return {
                      ...group,
                      files: remainingFiles,
                      fileCount: remainingFiles.length,
                    };
                  })
                  .filter((group) => group.files.length > 1);

                return updatedGroups;
              });

              setDialogConfig({
                visible: true,
                title: t('cleanedSuccess', 'Cleaned Successfully'),
                message: t('cleanedSuccessBody', `Successfully deleted ${res.deletedCount} file(s) and freed ${res.freedFormatted} of storage.`).replace('{count}', res.deletedCount).replace('{size}', res.freedFormatted),
                primaryButtonText: 'OK',
                primaryButtonColor: '#FFFFFF',
                onPrimaryPress: hideDialog,
              });
            } else {
              setDialogConfig({
                visible: true,
                title: t('cleanupWarning', 'Deletion Error'),
                message: t('someFilesNotRemoved', 'Could not remove selected files from storage.'),
                primaryButtonText: 'OK',
                primaryButtonColor: '#FFFFFF',
                onPrimaryPress: hideDialog,
              });
            }
          } catch (error) {
            setIsDeleting(false);
            setDialogConfig({
              visible: true,
              title: t('cleanupWarning', 'Error'),
              message: t('someFilesNotRemoved', 'An error occurred while deleting files.'),
              primaryButtonText: 'OK',
              primaryButtonColor: '#FFFFFF',
              onPrimaryPress: hideDialog,
            });
          }
        },
      });
    }
  };

  const getTranslatedCategoryName = (cat) => {
    if (!cat) return '';
    const norm = cat.toLowerCase();
    if (norm.includes('image') || norm.includes('photo')) return t('similarPhotos', 'Photos');
    if (norm.includes('video')) return t('duplicateVideos', 'Videos');
    if (norm.includes('audio') || norm.includes('music')) return t('audioFiles', 'Audio');
    if (norm.includes('doc')) return t('documents', 'Docs');
    if (norm.includes('contact')) return t('contacts', 'Contacts');
    return cat;
  };

  const displayCategoryName = getTranslatedCategoryName(categoryType);

  // 5. Render Group Card (Pic 1 & Pic 2 Layout)
  const renderGroupCard = ({ item: group, index: groupIndex }) => {
    let totalGroupBytes = 0;
    group.files.forEach((f) => {
      totalGroupBytes += Number(f.size || 0);
    });
    const formattedGroupSize = formatBytes(totalGroupBytes);

    return (
      <View style={styles.groupContainer} key={group.groupId || `group_${groupIndex}`}>
        {/* Group Header matching Pic 1 & Pic 2 */}
        <View style={styles.groupHeaderRow}>
          <View style={styles.groupHeaderLeft}>
            <GroupHeaderSvg width={17} height={17} style={{ marginRight: 8 }} />

            <Text style={styles.groupHeaderTitle}>{t('categories', 'Group')} {groupIndex + 1}</Text>
            <View style={styles.groupPillBadge}>
              <Text style={styles.groupPillText}>
                {group.fileCount || group.files.length} {t('files', 'files')} • {formattedGroupSize}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.groupHeaderDivider} />

        {/* File Cards inside Group */}
        {group.files.map((file, idx) => {
          const ext = (file.extension || '').toLowerCase();
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.svg'].includes(ext);
          const isVideo =
            (file.category && file.category.toUpperCase() === 'VIDEOS') ||
            ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.3gp', '.webm', '.m4v', '.ts', '.m2ts', '.mpg', '.mpeg', '.3g2', '.vob', '.divx'].includes(ext);
          const isAudio =
            (file.category && file.category.toUpperCase() === 'AUDIO') ||
            ['.mp3', '.wav', '.m4a', '.aac', '.opus', '.ogg', '.flac'].includes(ext);

          const isSelected = file.selected;
          const isOriginal = file.isOriginal;

          return (
            <TouchableOpacity
              key={file.id || file.path || `file_${idx}`}
              style={[
                styles.fileCard,
                isSelected && styles.fileCardSelected,
              ]}
              onPress={() => !isContacts && navigation.navigate(ROUTES.FILE_DETAIL, { file })}
              activeOpacity={0.85}
            >
              {/* Left Thumbnail Preview (Pic 1 & Pic 2) */}
              <View style={styles.thumbnailWrapper}>
                {isImage && file.path ? (
                  <Image
                    source={{ uri: file.path.startsWith('/') ? `file://${file.path}` : file.path }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                ) : isVideo && file.path ? (
                  <VideoThumbnail
                    filePath={file.path}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                    showPlayBadge={true}
                  />
                ) : (
                  <View style={styles.thumbnailFallback}>
                    <Text style={styles.thumbnailFallbackIcon}>
                      {isVideo ? '🎥' : isAudio ? '🎵' : isContacts ? '👤' : '📄'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Center Details */}
              <View style={styles.fileInfoContainer}>
                {/* Top Row: File Name & Size */}
                <View style={styles.fileNameSizeRow}>
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {file.title || file.name}
                  </Text>
                  <Text style={styles.fileSizeText}>
                    {formatBytes(file.size || 0)}
                  </Text>
                </View>

                {/* Directory Path */}
                <Text style={styles.filePathText} numberOfLines={1}>
                  {file.path}
                </Text>

                {/* Original Kept Tag */}
                {isOriginal && (
                  <View style={styles.originalKeptBadge}>
                    <PinIconSvg width={7} height={12} style={{ marginRight: 4 }} />
                    <Text style={styles.originalKeptText}>{t('originalKept', 'Original Kept')}</Text>
                  </View>
                )}
              </View>

              {/* Right Checkbox */}
              <TouchableOpacity
                style={styles.checkboxTouchContainer}
                onPress={() => toggleFileSelection(group.groupId, file.id)}
                disabled={isOriginal}
              >
                <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareSelected]}>
                  {isSelected && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />
        <View style={styles.topTitleBarContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <BackArrowSvg width={32} height={32} />
          </TouchableOpacity>
          <Text style={styles.topTitleBarText}>
            {t('scanningCategory', `Scanning ${displayCategoryName}`).replace('{category}', displayCategoryName)}
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.topTitleBarDivider} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LottieView
            source={require('../assets/scan.json')}
            autoPlay
            loop
            style={{ width: 220, height: 220 }}
          />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginTop: 16 }}>
            {t('scanningCategoryEllipsis', `Scanning ${displayCategoryName}...`).replace('{category}', displayCategoryName)}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" translucent={false} />

      {/* 1. Top Title Bar with 'Scan Details' */}
      <View style={styles.topTitleBarContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
          <BackArrowSvg width={32} height={32} />
        </TouchableOpacity>
        <Text style={styles.topTitleBarText}>{t('scanDetails', 'Scan Details')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.topTitleBarDivider} />

      {/* Screen Body */}
      {duplicateGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyStateSvg width={120} height={181} style={{ marginBottom: 20 }} />
          <Text style={styles.emptySubtitle}>
            {t('storageCleanSub', `Your ${displayCategoryName} storage is clean! No duplicate items were detected.`).replace('{category}', displayCategoryName)}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* 2. Review Duplicates Header Section */}
          <View style={styles.reviewHeaderSection}>
            <View style={styles.reviewHeaderLeft}>
              <Text style={styles.reviewMainTitle}>{t('reviewDuplicates', 'Review Duplicates')}</Text>
              <Text style={styles.reviewSubtitleLine}>
                {t('reviewSubtitle', 'Select the files you want to remove. Keep at least one copy.')}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.autoSelectPillButton,
                { backgroundColor: isAutoSelected ? '#306FFF' : '#464646' },
              ]}
              onPress={handleAutoSelect}
              activeOpacity={0.8}
            >
              <Text style={styles.autoSelectPillText}>{t('autoSelect', 'Auto Select')}</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={duplicateGroups}
            keyExtractor={(item, idx) => item.groupId || `group_${idx}`}
            renderItem={renderGroupCard}
            contentContainerStyle={styles.listContentContainer}
            showsVerticalScrollIndicator={false}
          />

          {/* Bottom Floating Action Bar matching Pic 3 */}
          <View style={styles.bottomBarContainer}>
            <View style={styles.bottomSummaryInfo}>
              <Text style={styles.bottomSelectedCountText}>
                {selectionSummary.selectedCount} {isContacts ? t('contactsSelected', 'contacts selected') : t('itemsSelected', 'files selected')}
              </Text>
              <Text style={styles.bottomRecoverText}>
                {isContacts ? t('contactMerging', 'Contact Merging') : t('recoverSpace', `Recover ${selectionSummary.formattedBytes}`).replace('{size}', selectionSummary.formattedBytes)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.deletePillButton,
                (selectionSummary.selectedCount === 0 || isDeleting) && styles.deletePillButtonDisabled,
              ]}
              onPress={handlePrimaryAction}
              disabled={selectionSummary.selectedCount === 0 || isDeleting}
              activeOpacity={0.85}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#991B1B" />
              ) : (
                <View style={styles.deleteButtonContentRow}>
                  {!isContacts && (
                    <DelIconSvg width={14} height={15} style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.deletePillButtonText}>
                    {isContacts ? t('mergeContacts', 'Merge Selected') : t('deleteSelected', 'Delete Selected')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CustomDialog {...dialogConfig} onClose={hideDialog} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topTitleBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitleBarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topTitleBarDivider: {
    height: 1,
    backgroundColor: '#ffffff',
  },
  reviewHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  reviewHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  reviewMainTitle: {
    fontSize: 20,
    
    color: '#FFFFFF',
  },
  reviewSubtitleLine: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
    lineHeight: 16,
  },
  autoSelectPillButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  autoSelectPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  fullScreenLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justify: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justify: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupHeaderIcon: {
    fontSize: 12,
    color: '#FFFFFF',
    marginRight: 8,
  },
  groupHeaderTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 10,
  },
  groupPillBadge: {
    backgroundColor: '#424754',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  groupPillText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  groupHeaderDivider: {
    height: 1,
    backgroundColor: '#9CA3AF',
    marginBottom: 12,
  },
  fileCard: {
    backgroundColor: '#161618',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileCardSelected: {
    backgroundColor: '#2E3132',
    borderColor: '#2E3132',
  },
  thumbnailWrapper: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#26262B',
    justify: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailImage: {
    width: 52,
    height: 52,
  },
  thumbnailFallback: {
    width: 52,
    height: 52,
    justify: 'center',
    alignItems: 'center',
    backgroundColor: '#26262B',
  },
  thumbnailFallbackIcon: {
    fontSize: 24,
  },
  fileInfoContainer: {
    flex: 1,
    marginRight: 10,
  },
  fileNameSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  fileSizeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filePathText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  originalKeptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  originalKeptText: {
    fontSize: 12,
    color: '#4EDEA3',
    fontWeight: '600',
  },
  checkboxTouchContainer: {
    padding: 4,
  },
  checkboxSquare: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4B5563',
    justify: 'center',
    alignItems: 'center',
  },
  checkboxSquareSelected: {
    backgroundColor: '#727785',
    borderColor: '#727785',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#121212',
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#ffffff',
  },
  bottomSummaryInfo: {
    flex: 1,
  },
  bottomSelectedCountText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  bottomRecoverText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  deletePillButton: {
    backgroundColor: '#FFE2E2',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 12,
  },
  deletePillButtonDisabled: {
    backgroundColor: '#2A2A2E',
    opacity: 0.6,
  },
  deleteButtonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trashIconText: {
    fontSize: 14,
    marginRight: 6,
  },
  deletePillButtonText: {
    color: '#991B1B',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
