import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';
import { scanCategoryFiles } from '../engine/fileScanner';
import { scanAudioFiles } from '../engine/audioScanner';
import { calculateAudioDuplicates } from '../engine/audioHashEngine';
import { scanContactDuplicates } from '../engine/contactScanner';
import { scanDocumentFiles } from '../engine/documentScanner';
import { calculateDocumentDuplicates } from '../engine/documentHashEngine';
import { calculateImageDuplicates } from '../engine/imageHashEngine';
import { calculateDuplicates, formatBytes } from '../engine/hashEngine';
import { deleteBatch } from '../engine/fileDeleter';
import { VideoThumbnail } from '../components/VideoThumbnail';

export const DuplicateViewerScreen = ({ route, navigation }) => {
  const { categoryType = 'Images' } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Run Fresh Real-Time Scanning Engine whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const performScan = async () => {
        setIsLoading(true);
        try {
          let groups = [];
          let rawFiles = [];

          if (categoryType.toUpperCase() === 'CONTACTS') {
            groups = await scanContactDuplicates();
            console.log(`[DuplicateViewer] Contacts Scan Result:`, { duplicateGroupsCount: groups.length });
          } else if (categoryType.toUpperCase() === 'AUDIO') {
            rawFiles = await scanAudioFiles();
            groups = calculateAudioDuplicates(rawFiles);
            console.log(`[DuplicateViewer] Audio Scan Result:`, {
              rawCount: rawFiles.length,
              duplicateGroupsCount: groups.length,
            });
          } else if (categoryType.toUpperCase() === 'DOCUMENTS') {
            rawFiles = await scanDocumentFiles();
            groups = calculateDocumentDuplicates(rawFiles);
            console.log(`[DuplicateViewer] Documents Scan Result:`, {
              rawCount: rawFiles.length,
              duplicateGroupsCount: groups.length,
            });
          } else if (categoryType.toUpperCase() === 'IMAGES') {
            rawFiles = await scanCategoryFiles('Images');
            groups = await calculateImageDuplicates(rawFiles);
            console.log(`[DuplicateViewer] Ultra-Strict Images Scan Result:`, {
              rawCount: rawFiles.length,
              duplicateGroupsCount: groups.length,
            });
          } else {
            rawFiles = await scanCategoryFiles(categoryType);
            groups = calculateDuplicates(rawFiles);

            console.log(`[DuplicateViewer] Real-Time Scan Result for ${categoryType}:`, {
              rawCount: rawFiles.length,
              duplicateGroupsCount: groups.length,
            });
          }

          if (rawFiles.length > 0 && groups.length === 0) {
            console.log(
              `[DuplicateViewer] Raw files were fetched (${rawFiles.length}), 0 duplicate groups matched.`
            );
          }

          if (isMounted) {
            setDuplicateGroups(groups);
          }
        } catch (error) {
          console.error('[DuplicateViewer] Scanning error:', error);
          if (isMounted) {
            setDuplicateGroups([]);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      performScan();

      return () => {
        isMounted = false;
      };
    }, [categoryType])
  );

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
  }, [route.params?.deletedFilePath, route.params?.deletedFileId]);

  // 2. Computed Metrics (Selected items count & total bytes selected for deletion)
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

  const toggleSelectAllGroup = (groupId) => {
    setDuplicateGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.groupId !== groupId) return group;
        const duplicateFiles = group.files.filter((f) => !f.isOriginal);
        const areAllDuplicatesSelected = duplicateFiles.every((f) => f.selected);

        return {
          ...group,
          files: group.files.map((file) => {
            if (file.isOriginal) return file;
            return { ...file, selected: !areAllDuplicatesSelected };
          }),
        };
      })
    );
  };

  // 4. Batch Delete Handler
  const handleDeleteSelected = () => {
    if (selectionSummary.selectedCount === 0) {
      Alert.alert('No Selection', 'Please select at least one duplicate file to delete.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${selectionSummary.selectedCount} item(s) (${selectionSummary.formattedBytes})? This action will remove them from your device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
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

                Alert.alert(
                  'Cleaned Successfully 🎉',
                  `Successfully deleted ${res.deletedCount} file(s) and freed ${res.freedFormatted} of storage.`
                );
              } else {
                Alert.alert('Deletion Error', 'Could not remove selected files from storage.');
              }
            } catch (error) {
              setIsDeleting(false);
              Alert.alert('Error', 'An error occurred while deleting files.');
            }
          },
        },
      ]
    );
  };

  // 5. Render Group Card
  const renderGroupCard = ({ item: group }) => {
    const duplicateFiles = group.files.filter((f) => !f.isOriginal);
    const isGroupFullySelected = duplicateFiles.every((f) => f.selected);

    return (
      <View style={styles.groupCard}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupInfo}>
            <Text style={styles.groupTitle}>
              Group ({group.fileCount} items) • {group.individualSizeFormatted} each
            </Text>
            <Text style={styles.groupSubtitle}>
              Match: {group.matchType} • Reclaim: {group.reclaimableFormatted}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={() => toggleSelectAllGroup(group.groupId)}
          >
            <Text style={styles.selectAllText}>
              {isGroupFullySelected ? 'Deselect Group' : 'Select Group'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* File Item List inside Group */}
        {group.files.map((file, idx) => {
          const ext = (file.extension || '').toLowerCase();
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.svg'].includes(ext);
          const isVideo =
            (file.category && file.category.toUpperCase() === 'VIDEOS') ||
            ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.3gp', '.webm', '.m4v', '.ts', '.m2ts', '.mpg', '.mpeg', '.3g2', '.vob', '.divx'].includes(ext);

          return (
            <TouchableOpacity
              key={file.id || file.path || `file_${idx}`}
              style={[
                styles.fileItem,
                file.isOriginal && styles.originalFileItem,
                file.selected && styles.selectedFileItem,
              ]}
              onPress={() => navigation.navigate(ROUTES.FILE_DETAIL, { file })}
              activeOpacity={0.8}
            >
              {/* Checkbox / Badge */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => toggleFileSelection(group.groupId, file.id)}
                disabled={file.isOriginal}
              >
                {file.isOriginal ? (
                  <View style={styles.originalBadge}>
                    <Text style={styles.originalBadgeText}>Original</Text>
                  </View>
                ) : (
                  <View style={[styles.checkbox, file.selected && styles.checkboxSelected]}>
                    {file.selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                )}
              </TouchableOpacity>

              {/* 46x46 Thumbnail Preview */}
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
                      {isVideo
                        ? '🎥'
                        : file.category === 'Audio' || (ext && ['.mp3', '.wav', '.m4a', '.aac', '.opus', '.ogg', '.flac'].includes(ext))
                        ? '🎵'
                        : file.category === 'Contacts'
                        ? '👥'
                        : '📄'}
                    </Text>
                  </View>
                )}
              </View>

              {/* File Info */}
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.title || file.name}
                </Text>
                <Text style={styles.filePath} numberOfLines={1}>
                  {file.path}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{categoryType} Duplicates</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Screen Body */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Scanning {categoryType} for duplicates...</Text>
        </View>
      ) : duplicateGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No Duplicates Found</Text>
          <Text style={styles.emptySubtitle}>
            Your {categoryType} storage is clean! No duplicate files were detected.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={duplicateGroups}
            keyExtractor={(item) => item.groupId}
            renderItem={renderGroupCard}
            contentContainerStyle={styles.listContent}
          />

          {/* Bottom Floating Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Selected: {selectionSummary.selectedCount} file(s)
              </Text>
              <Text style={styles.summarySubtext}>
                Reclaim: {selectionSummary.formattedBytes}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                (selectionSummary.selectedCount === 0 || isDeleting) && styles.disabledDeleteButton,
              ]}
              onPress={handleDeleteSelected}
              disabled={selectionSummary.selectedCount === 0 || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteButtonText}>
                  Delete Selected ({selectionSummary.selectedCount})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || '#0A0F1D',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  groupCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
    marginBottom: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  groupSubtitle: {
    color: '#10B981',
    fontSize: 12,
    marginTop: 2,
  },
  selectAllButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  selectAllText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  originalFileItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  selectedFileItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  checkboxContainer: {
    marginRight: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  originalBadge: {
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  originalBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: 'bold',
  },
  thumbnailWrapper: {
    width: 46,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  thumbnailImage: {
    width: 46,
    height: 46,
  },
  thumbnailFallback: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  thumbnailFallbackIcon: {
    fontSize: 22,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  videoBadgeIcon: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filePath: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summarySubtext: {
    color: '#10B981',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  disabledDeleteButton: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
