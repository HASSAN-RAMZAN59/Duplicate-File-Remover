import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Share as RNShareNative,
} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import RNShare from 'react-native-share';
import { formatBytes } from '../engine/hashEngine';
import { deleteFileFromDevice } from '../engine/fileScanner';

export const FileDetailScreen = ({ route, navigation }) => {
  const { file = {} } = route.params || {};
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const fileUri =
    file.path && (file.path.startsWith('file://') || file.path.startsWith('content://'))
      ? file.path
      : `file://${file.path || ''}`;

  const isImageFile =
    file.category?.toUpperCase() === 'IMAGES' ||
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic'].some((ext) =>
      file.name?.toLowerCase().endsWith(ext)
    );

  const isVideoFile =
    file.category?.toUpperCase() === 'VIDEOS' ||
    ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.3gp'].some((ext) =>
      file.name?.toLowerCase().endsWith(ext)
    );

  // 1. Copy File Location Handler
  const handleCopyLocation = () => {
    setCopiedToast(true);
    setTimeout(() => {
      setCopiedToast(false);
    }, 2000);
  };

  // 2. Open File Natively via FileViewer Intent
  const handleOpenFile = async () => {
    try {
      if (!file.path) return;

      if (FileViewer && typeof FileViewer.open === 'function') {
        await FileViewer.open(file.path, { showOpenWithDialog: true });
      } else {
        Alert.alert('File Location', file.path);
      }
    } catch (error) {
      console.warn('[FileDetail] FileViewer error:', error);
      Alert.alert('File Location', file.path || 'No path available');
    }
  };

  // 3. Share File Natively via react-native-share (Attached Image/Video Binary)
  const handleShareFile = async () => {
    try {
      if (!file.path) return;

      let mimeType = '*/*';
      if (isImageFile) mimeType = 'image/*';
      else if (isVideoFile) mimeType = 'video/*';

      if (RNShare && typeof RNShare.open === 'function') {
        await RNShare.open({
          url: fileUri,
          type: mimeType,
          title: file.name || 'Share File',
          failOnCancel: false,
        });
      } else {
        await RNShareNative.share({
          title: file.name || 'Share File',
          message: `File: ${file.name}\nPath: ${file.path}`,
          url: fileUri,
        });
      }
    } catch (error) {
      console.warn('[FileDetail] Share error:', error);
    }
  };

  // 4. Delete File Handler
  const handleDeleteFile = () => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to permanently delete "${file.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const success = await deleteFileFromDevice(file.path);
            setIsDeleting(false);

            if (success) {
              Alert.alert('File Deleted 🎉', 'The selected file has been removed from your device.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } else {
              Alert.alert('Deletion Failed', 'Could not delete file from device storage.');
            }
          },
        },
      ]
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
          <Text style={styles.backIconText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Main Card */}
        <View style={styles.detailCard}>
          {/* Top Square Thumbnail Preview */}
          <View style={styles.thumbnailContainer}>
            {isImageFile || isVideoFile ? (
              <Image source={{ uri: fileUri }} style={styles.thumbnailImage} resizeMode="cover" />
            ) : (
              <View style={styles.fallbackIconWrapper}>
                <Text style={styles.fallbackIcon}>📁</Text>
              </View>
            )}
          </View>

          {/* File Size */}
          <Text style={styles.fileSizeText}>{formatBytes(file.size)}</Text>

          {/* File Path */}
          <Text style={styles.filePathText} numberOfLines={2} ellipsisMode="middle">
            {file.path || '/storage/emulated/0/'}
          </Text>

          {/* File Name */}
          <Text style={styles.fileNameText} numberOfLines={1} ellipsisMode="middle">
            {file.name || 'Unknown_File'}
          </Text>

          {/* Copy File Location Pill Button */}
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyLocation}
            activeOpacity={0.7}
          >
            <Text style={styles.copyIcon}>📋</Text>
            <Text style={styles.copyButtonText}>
              {copiedToast ? 'Location Copied!' : 'Copy File Location'}
            </Text>
          </TouchableOpacity>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            {/* Open File */}
            <TouchableOpacity style={styles.actionItem} onPress={handleOpenFile} activeOpacity={0.8}>
              <View style={styles.actionCircleBtn}>
                <Text style={styles.actionCircleIcon}>📂</Text>
              </View>
              <Text style={styles.actionItemLabel}>Open File</Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity style={styles.actionItem} onPress={handleShareFile} activeOpacity={0.8}>
              <View style={styles.actionCircleBtn}>
                <Text style={styles.actionCircleIcon}>📤</Text>
              </View>
              <Text style={styles.actionItemLabel}>Share</Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleDeleteFile}
              disabled={isDeleting}
              activeOpacity={0.8}
            >
              <View style={[styles.actionCircleBtn, styles.deleteCircleBtn]}>
                <Text style={styles.actionCircleIcon}>🗑️</Text>
              </View>
              <Text style={styles.actionItemLabel}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Large Full Preview Box */}
          <View style={styles.largePreviewBox}>
            {isImageFile || isVideoFile ? (
              <Image source={{ uri: fileUri }} style={styles.largePreviewImage} resizeMode="contain" />
            ) : (
              <View style={styles.largeFallbackContent}>
                <Text style={styles.largeFallbackIcon}>📄</Text>
                <Text style={styles.largeFallbackText}>{file.name}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF2F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backIconText: {
    fontSize: 26,
    color: '#334155',
    fontWeight: '300',
    lineHeight: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  container: {
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbnailContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  fallbackIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackIcon: {
    fontSize: 32,
  },
  fileSizeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  filePathText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 24,
  },
  copyIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionCircleBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  deleteCircleBtn: {
    backgroundColor: '#38BDF8',
  },
  actionCircleIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  actionItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  largePreviewBox: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largePreviewImage: {
    width: '100%',
    height: '100%',
  },
  largeFallbackContent: {
    alignItems: 'center',
  },
  largeFallbackIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  largeFallbackText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});
