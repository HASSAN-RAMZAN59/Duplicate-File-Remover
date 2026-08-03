import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../navigation/routes';
import { scanCategoryFiles } from '../engine/fileScanner';
import { scanContactDuplicates } from '../engine/contactScanner';
import { calculateDuplicates, formatBytes } from '../engine/hashEngine';
import { deleteBatch } from '../engine/fileDeleter';

export const DuplicateViewerScreen = ({ route, navigation }) => {
  const { categoryType = 'Images' } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Run Background Scanning Engine on Component Mount
  useEffect(() => {
    let isMounted = true;

    const performScan = async () => {
      setIsLoading(true);
      try {
        let groups = [];
        if (categoryType.toUpperCase() === 'CONTACTS') {
          groups = await scanContactDuplicates();
          console.log(`[DuplicateViewer] Contacts Scan Result:`, { duplicateGroupsCount: groups.length });
        } else {
          const rawFiles = await scanCategoryFiles(categoryType);
          groups = calculateDuplicates(rawFiles);

          console.log(`[DuplicateViewer] Scanning Result for ${categoryType}:`, {
            rawCount: rawFiles.length,
            duplicateGroupsCount: groups.length,
          });

          if (rawFiles.length > 0 && groups.length === 0) {
            console.warn(
              `[DuplicateViewer] Raw files were fetched (${rawFiles.length}), but 0 duplicate groups were matched!`
            );
          }
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
  }, [categoryType]);

  // 2. Computed Metrics (Selected items count & total bytes selected for deletion)
  const selectionSummary = useMemo(() => {
    let selectedCount = 0;
    let selectedBytes = 0;

    duplicateGroups.forEach((group) => {
      group.files.forEach((file) => {
        if (file.selected) {
          selectedCount += 1;
          selectedBytes += file.size || 0;
        }
      });
    });

    return {
      count: selectedCount,
      bytes: selectedBytes,
      formattedSize: formatBytes(selectedBytes),
    };
  }, [duplicateGroups]);

  // 3. Toggle selection for a single file item
  const handleToggleFileSelection = (groupId, fileId) => {
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

  // 4. Toggle selection for an entire duplicate group
  const handleToggleGroupSelection = (groupId) => {
    setDuplicateGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.groupId !== groupId) return group;
        const allDuplicatesSelected = group.files
          .filter((f) => !f.isOriginal)
          .every((f) => f.selected);

        return {
          ...group,
          files: group.files.map((file) => {
            if (file.isOriginal) return { ...file, selected: false };
            return { ...file, selected: !allDuplicatesSelected };
          }),
        };
      })
    );
  };

  // 5. Execute Deletion Handler
  const handleDeleteSelected = () => {
    if (selectionSummary.count === 0) {
      Alert.alert('No Files Selected', 'Please select at least 1 duplicate item to delete.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to permanently delete ${selectionSummary.count} selected duplicate item(s) (${selectionSummary.formattedSize})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Now',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);

            // Collect selected items to delete
            const selectedItems = [];
            duplicateGroups.forEach((group) => {
              group.files.forEach((file) => {
                if (file.selected) {
                  selectedItems.push(file);
                }
              });
            });

            // Perform file/contact deletion via fileDeleter engine
            const deleteResult = await deleteBatch(selectedItems);

            // Automatically refresh local list by removing deleted items
            setDuplicateGroups((prevGroups) => {
              const updatedGroups = prevGroups
                .map((group) => ({
                  ...group,
                  files: group.files.filter((file) => !file.selected),
                  fileCount: group.files.filter((file) => !file.selected).length,
                }))
                .filter((group) => group.files.length > 1); // Discard groups with only 1 file remaining

              return updatedGroups;
            });

            setIsDeleting(false);
            Alert.alert(
              'Cleanup Complete 🎉',
              `Successfully removed ${deleteResult.deletedCount} duplicate item(s) and freed ${deleteResult.freedFormatted} of storage!`
            );
          },
        },
      ]
    );
  };

  // Category Icon Resolver
  const getCategoryIcon = () => {
    switch (categoryType.toUpperCase()) {
      case 'IMAGES':
        return '🖼️';
      case 'VIDEOS':
        return '🎥';
      case 'AUDIO':
        return '🎵';
      case 'DOCUMENTS':
        return '📄';
      case 'CONTACTS':
        return '👥';
      default:
        return '📦';
    }
  };

  // Render Item for Duplicate Group Card
  const renderGroupCard = ({ item: group, index: groupIdx }) => {
    return (
      <View style={styles.groupCard}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupHeaderLeft}>
            <Text style={styles.groupBadge}>Group {groupIdx + 1}</Text>
            <Text style={styles.groupSubInfo}>
              {group.fileCount} Files • {group.matchType}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleToggleGroupSelection(group.groupId)}
            activeOpacity={0.7}
          >
            <Text style={styles.selectAllText}>Select All Duplicates</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* List of Files in Group */}
        {group.files.map((file) => {
          const isImageFile =
            categoryType.toUpperCase() === 'IMAGES' ||
            ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic'].some((ext) =>
              file.name?.toLowerCase().endsWith(ext)
            );

          const isVideoFile =
            categoryType.toUpperCase() === 'VIDEOS' ||
            ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.3gp'].some((ext) =>
              file.name?.toLowerCase().endsWith(ext)
            );

          const fileUri =
            file.path && (file.path.startsWith('file://') || file.path.startsWith('content://'))
              ? file.path
              : `file://${file.path}`;

          return (
            <TouchableOpacity
              key={file.id}
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
                onPress={() => !file.isOriginal && handleToggleFileSelection(group.groupId, file.id)}
                activeOpacity={0.7}
              >
                {file.isOriginal ? (
                  <View style={styles.originalBadge}>
                    <Text style={styles.originalBadgeText}>SAFE ORIGINAL</Text>
                  </View>
                ) : (
                  <View style={[styles.checkbox, file.selected && styles.checkboxChecked]}>
                    {file.selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                )}
              </TouchableOpacity>

              {/* Thumbnail Preview for Images & Videos */}
              {(isImageFile || isVideoFile) && file.path && !file.path.startsWith('Phone:') ? (
                <View style={styles.thumbnailWrapper}>
                  <Image
                    source={{ uri: fileUri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {isVideoFile && (
                    <View style={styles.videoOverlayBadge}>
                      <Text style={styles.videoOverlayIcon}>▶</Text>
                    </View>
                  )}
                </View>
              ) : null}

              {/* File Info */}
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1} ellipsisMode="middle">
                  {file.name}
                </Text>
                <Text style={styles.filePath} numberOfLines={1} ellipsisMode="middle">
                  {file.path}
                </Text>
              </View>

              {/* File Size */}
              <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Go Back"
        >
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>
            {getCategoryIcon()} {categoryType} Duplicates
          </Text>
          {!isLoading && (
            <Text style={styles.headerSubtitle}>
              {duplicateGroups.length} Group(s) Found
            </Text>
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Main Content Body */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryLight || '#3B82F6'} />
          <Text style={styles.loadingTitle}>Scanning {categoryType}...</Text>
          <Text style={styles.loadingSubtitle}>
            Analyzing file size matching & verifying MD5 checksums...
          </Text>
        </View>
      ) : duplicateGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No Duplicates Found</Text>
          <Text style={styles.emptySubtitle}>
            Your {categoryType.toLowerCase()} storage is completely clean and optimized!
          </Text>
        </View>
      ) : (
        <FlatList
          data={duplicateGroups}
          keyExtractor={(item) => item.groupId}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Bottom Action Bar */}
      {!isLoading && duplicateGroups.length > 0 && (
        <View style={styles.bottomActionBar}>
          <View style={styles.actionInfo}>
            <Text style={styles.actionCount}>
              {selectionSummary.count} Item(s) Selected
            </Text>
            <Text style={styles.actionSize}>
              Reclaim {selectionSummary.formattedSize}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              (selectionSummary.count === 0 || isDeleting) && styles.disabledButton,
            ]}
            onPress={handleDeleteSelected}
            disabled={selectionSummary.count === 0 || isDeleting}
            activeOpacity={0.85}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteButtonText}>
                🗑️ Delete Selected ({selectionSummary.formattedSize})
              </Text>
            )}
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder || '#1E293B',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground || '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight ? COLORS.primaryLight + '60' : '#3B82F6',
  },
  backIconText: {
    fontSize: 22,
    color: COLORS.textPrimary || '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.secondary || '#94A3B8',
    marginTop: 2,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted || '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary || '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  groupCard: {
    backgroundColor: COLORS.cardBackground || '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder || '#334155',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupHeaderLeft: {
    flex: 1,
  },
  groupBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryLight || '#3B82F6',
  },
  groupSubInfo: {
    fontSize: 11,
    color: COLORS.textMuted || '#64748B',
    marginTop: 2,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary || '#38BDF8',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder || '#334155',
    marginVertical: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  originalFileItem: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  selectedFileItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  checkboxContainer: {
    marginRight: 10,
  },
  thumbnailWrapper: {
    width: 46,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBackground || '#1E293B',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder || '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlayBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlayIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    marginLeft: 1,
  },
  originalBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  originalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.cardBorder || '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary || '#3B82F6',
    borderColor: COLORS.primary || '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fileDetails: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  filePath: {
    fontSize: 11,
    color: COLORS.textMuted || '#64748B',
    marginTop: 2,
  },
  fileSize: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary || '#94A3B8',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBackground || '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder || '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  actionSize: {
    fontSize: 12,
    color: COLORS.success || '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
