import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, NativeModules } from 'react-native';

// In-memory cache for generated video thumbnails so scrolling list items load instantly
const thumbnailCache = new Map();

/**
 * High-performance Video Thumbnail Component
 * Generates and displays actual video frame thumbnails using Native Android ThumbnailUtils / MediaMetadataRetriever
 */
export const VideoThumbnail = React.memo(({
  filePath,
  style,
  resizeMode = 'cover',
  showPlayBadge = true,
  fallbackIcon = '🎥',
}) => {
  const [thumbUri, setThumbUri] = useState(thumbnailCache.get(filePath) || null);
  const [isLoading, setIsLoading] = useState(!thumbUri);

  useEffect(() => {
    let isMounted = true;

    if (!filePath) {
      setIsLoading(false);
      return;
    }

    if (thumbnailCache.has(filePath)) {
      setThumbUri(thumbnailCache.get(filePath));
      setIsLoading(false);
      return;
    }

    const fetchThumbnail = async () => {
      try {
        const NativeFileDeleter = NativeModules.NativeFileDeleter;
        if (NativeFileDeleter && typeof NativeFileDeleter.getVideoThumbnail === 'function') {
          const resultUri = await NativeFileDeleter.getVideoThumbnail(filePath);
          if (resultUri && isMounted) {
            thumbnailCache.set(filePath, resultUri);
            setThumbUri(resultUri);
          }
        }
      } catch (err) {
        console.warn('[VideoThumbnail] Error fetching thumbnail:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchThumbnail();

    return () => {
      isMounted = false;
    };
  }, [filePath]);

  if (thumbUri) {
    return (
      <View style={[styles.container, style]}>
        <Image source={{ uri: thumbUri }} style={styles.image} resizeMode={resizeMode} />
        {showPlayBadge && (
          <View style={styles.playBadge}>
            <Text style={styles.playBadgeText}>▶</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.fallbackContainer, style]}>
      <Text style={styles.fallbackIconText}>{fallbackIcon}</Text>
      {showPlayBadge && (
        <View style={styles.playBadge}>
          <Text style={styles.playBadgeText}>▶</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  fallbackIconText: {
    fontSize: 20,
  },
  playBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 1,
  },
});
