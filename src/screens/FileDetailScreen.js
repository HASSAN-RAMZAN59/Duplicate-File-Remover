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
  Linking,
  Clipboard,
  ToastAndroid,
  Platform,
  NativeModules,
  Share as RNShareNative,
} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import RNShare from 'react-native-share';
import { formatBytes } from '../engine/hashEngine';
import { deleteSelectedFiles } from '../engine/fileDeleter';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { ROUTES } from '../navigation/routes';
import BackArrowSvg from '../assets/back arrow.svg';
import CopySvg from '../assets/preview/copy.svg';
import OpenSvg from '../assets/preview/open.svg';
import ShareSvg from '../assets/preview/share.svg';
import DeleteSvg from '../assets/preview/delete.svg';

/**
 * Helper to determine accurate MIME type for cross-app file opening and sharing
 */
const getMimeType = (fileName = '', category = '') => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
  if (['.png'].includes(ext)) return 'image/png';
  if (['.gif'].includes(ext)) return 'image/gif';
  if (['.webp'].includes(ext)) return 'image/webp';
  if (['.bmp'].includes(ext)) return 'image/bmp';
  if (['.heic'].includes(ext)) return 'image/heic';
  
  if (['.mp4'].includes(ext)) return 'video/mp4';
  if (['.mkv'].includes(ext)) return 'video/x-matroska';
  if (['.avi'].includes(ext)) return 'video/x-msvideo';
  if (['.mov'].includes(ext)) return 'video/quicktime';
  if (['.3gp'].includes(ext)) return 'video/3gpp';
  if (['.webm'].includes(ext)) return 'video/webm';
  if (['.m4v'].includes(ext)) return 'video/x-m4v';
  
  if (['.mp3'].includes(ext)) return 'audio/mpeg';
  if (['.wav'].includes(ext)) return 'audio/wav';
  if (['.m4a', '.aac'].includes(ext)) return 'audio/aac';
  if (['.ogg', '.opus'].includes(ext)) return 'audio/ogg';
  if (['.flac'].includes(ext)) return 'audio/flac';
  
  if (['.pdf'].includes(ext)) return 'application/pdf';
  if (['.txt'].includes(ext)) return 'text/plain';
  if (['.doc', '.docx'].includes(ext)) return 'application/msword';
  if (['.xls', '.xlsx'].includes(ext)) return 'application/vnd.ms-excel';
  if (['.zip', '.rar', '.7z'].includes(ext)) return 'application/zip';
  if (['.apk'].includes(ext)) return 'application/vnd.android.package-archive';

  const catUpper = (category || '').toUpperCase();
  if (catUpper === 'IMAGES') return 'image/*';
  if (catUpper === 'VIDEOS') return 'video/*';
  if (catUpper === 'AUDIO') return 'audio/*';
  if (catUpper === 'DOCUMENTS') return 'application/*';

  return '*/*';
};

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
    ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.3gp', '.webm', '.m4v', '.ts', '.m2ts', '.mpg', '.mpeg', '.3g2', '.vob', '.divx'].some((ext) =>
      file.name?.toLowerCase().endsWith(ext)
    );

  // 1. Copy File Location Handler
  const handleCopyLocation = () => {
    const targetPath = file.path || fileUri;
    if (!targetPath) return;

    try {
      if (Clipboard && typeof Clipboard.setString === 'function') {
        Clipboard.setString(targetPath);
      }
    } catch (e) {}

    if (Platform.OS === 'android' && ToastAndroid) {
      ToastAndroid.show('Location copied to clipboard', ToastAndroid.SHORT);
    }

    setCopiedToast(true);
    setTimeout(() => {
      setCopiedToast(false);
    }, 2000);
  };

  // 2. Open File Handler (Native ACTION_VIEW Intent / FileViewer / Linking)
  const handleOpenFile = async () => {
    if (!file.path) {
      Alert.alert('Unable to Open', 'File path is unavailable.');
      return;
    }

    const cleanPath = file.path.startsWith('file://') ? file.path.substring(7) : file.path;
    const mimeType = getMimeType(file.name || file.path, file.category);

    // Tier 1: Primary Native ACTION_VIEW Intent (Opens Video Player / Gallery / Media Player chooser)
    try {
      const NativeFileDeleter = NativeModules.NativeFileDeleter;
      if (NativeFileDeleter && typeof NativeFileDeleter.openFileNative === 'function') {
        const opened = await NativeFileDeleter.openFileNative(cleanPath, mimeType);
        if (opened) return;
      }
    } catch (e) {
      console.log('[FileDetail] Native openFileNative failed, trying FileViewer fallback...', e);
    }

    // Tier 2: Try FileViewer
    try {
      if (FileViewer && typeof FileViewer.open === 'function') {
        await FileViewer.open(cleanPath, { showOpenWithDialog: true });
        return;
      }
    } catch (error) {
      console.log('[FileDetail] FileViewer fallback open failed...', error);
    }

    // Tier 3: Try Linking openURL
    try {
      const canOpen = await Linking.canOpenURL(fileUri);
      if (canOpen) {
        await Linking.openURL(fileUri);
        return;
      }
    } catch (linkingErr) {}

    showFallbackOpenAlert();
  };

  const showFallbackOpenAlert = () => {
    if (Platform.OS === 'android' && ToastAndroid) {
      ToastAndroid.show('No compatible app found to open this file.', ToastAndroid.LONG);
    }
    Alert.alert(
      'No Compatible App Found',
      `Could not find a compatible app on your device to open "${file.name || 'this file'}".\n\nLocation: ${file.path}`
    );
  };

  // 3. Share File Handler (Native FileProvider Share / react-native-share)
  const handleShareFile = async () => {
    if (!file.path) {
      Alert.alert('Unable to Share', 'File path is unavailable.');
      return;
    }

    const mimeType = getMimeType(file.name || file.path, file.category);
    const cleanPath = file.path.startsWith('file://') ? file.path.substring(7) : file.path;

    // Tier 1: Primary Native Share via FileProvider Content Uri (Guaranteed for WhatsApp, Images, Videos)
    try {
      const NativeFileDeleter = NativeModules.NativeFileDeleter;
      if (NativeFileDeleter && typeof NativeFileDeleter.shareFileNative === 'function') {
        const shared = await NativeFileDeleter.shareFileNative(cleanPath, mimeType);
        if (shared) return;
      }
    } catch (nativeErr) {
      console.log('[FileDetail] Native shareFileNative failed, trying RNShare fallback...', nativeErr);
    }

    // Tier 2: RNShare Fallback with safe URI encoding
    try {
      let safeUri = fileUri;
      if (safeUri.startsWith('file://')) {
        const raw = safeUri.substring(7);
        safeUri = `file://${encodeURI(decodeURIComponent(raw))}`;
      }

      if (RNShare && typeof RNShare.open === 'function') {
        await RNShare.open({
          url: safeUri,
          type: mimeType,
          title: `Share ${file.name || 'File'}`,
          subject: file.name,
          failOnCancel: false,
        });
      } else {
        await RNShareNative.share({
          title: `Share ${file.name || 'File'}`,
          message: `File: ${file.name}\nPath: ${file.path}`,
          url: safeUri,
        });
      }
    } catch (error) {
      if (error && error.message && !error.message.includes('User did not share')) {
        console.warn('[FileDetail] Share error:', error);
      }
    }
  };

  // 4. Delete File Handler (Cross-Android version deletion + Navigation Back sync)
  const handleDeleteFile = () => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete this file permanently?\n\n${file.name || ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await deleteSelectedFiles([{ path: file.path, size: file.size || 0 }]);
              const success = result.success && result.deletedCount > 0;
              setIsDeleting(false);

              if (success) {
                if (Platform.OS === 'android' && ToastAndroid) {
                  ToastAndroid.show('File deleted successfully', ToastAndroid.SHORT);
                }

                // Automatically navigate BACK to previous screen and sync list state
                if (navigation.canGoBack()) {
                  navigation.navigate(ROUTES.DUPLICATE_VIEWER, {
                    deletedFilePath: file.path,
                    deletedFileId: file.id,
                  });
                } else {
                  navigation.goBack();
                }
              } else {
                Alert.alert(
                  'Deletion Failed',
                  'Could not delete the file from device storage. Please check storage permissions.'
                );
              }
            } catch (err) {
              setIsDeleting(false);
              console.error('[FileDetail] Delete exception:', err);
              Alert.alert('Error', 'An unexpected error occurred while deleting the file.');
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
          <BackArrowSvg width={32} height={32} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>File Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Main Card */}
        <View style={styles.detailCard}>
          {/* Top Square Thumbnail Preview */}
          <View style={styles.previewBox}>
            {isImageFile ? (
              <Image source={{ uri: fileUri }} style={styles.previewImage} resizeMode="cover" />
            ) : isVideoFile && file.path ? (
              <VideoThumbnail filePath={file.path} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <Text style={styles.fallbackText}>File</Text>
            )}
          </View>

          {/* File Size */}
          <Text style={styles.fileSizeText}>{formatBytes(file.size)}</Text>

          {/* File Path */}
          <Text style={styles.filePathText} numberOfLines={3} ellipsisMode="tail">
            {file.path || '/storage/emulated/0/'}
          </Text>

          {/* Copy File Location Pill Button */}
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyLocation}
            activeOpacity={0.7}
          >
            <CopySvg width={18} height={18} style={{ marginRight: 8 }} />
            <Text style={styles.copyButtonText}>
              {copiedToast ? 'Location Copied!' : 'Copy File Location'}
            </Text>
          </TouchableOpacity>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            {/* Open File */}
            <TouchableOpacity style={styles.actionItem} onPress={handleOpenFile} activeOpacity={0.8}>
              <View style={styles.actionCircleBtn}>
                <OpenSvg width={24} height={24} />
              </View>
              <Text style={styles.actionItemLabel}>Open File</Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity style={styles.actionItem} onPress={handleShareFile} activeOpacity={0.8}>
              <View style={styles.actionCircleBtn}>
                <ShareSvg width={24} height={24} />
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
              <View style={styles.actionCircleBtn}>
                <DeleteSvg width={24} height={24} />
              </View>
              <Text style={styles.actionItemLabel}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#121212',
    borderBottomWidth: 0.5,
    borderBottomColor: '#D1D5DB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIconText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  container: {
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#1A1A1E',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  previewBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#DCDCDC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  fileSizeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  filePathText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 32,
    width: '80%',
    justifyContent: 'center',
  },
  copyIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#FFFFFF',
  },
  copyButtonText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionItemLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  whitePlaceholderIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    opacity: 0.9,
  },
});
