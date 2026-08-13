import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  permissionService,
  PERMISSION_TYPES,
  PERMISSION_STATUS,
} from '../services/permissionService';

export function usePermissions() {
  const [audioStatus, setAudioStatus] = useState(PERMISSION_STATUS.DENIED);
  const [photosStatus, setPhotosStatus] = useState(PERMISSION_STATUS.DENIED);
  const [storageStatus, setStorageStatus] = useState(PERMISSION_STATUS.DENIED);
  const [contactsStatus, setContactsStatus] = useState(PERMISSION_STATUS.DENIED);
  const [allFilesStatus, setAllFilesStatus] = useState(PERMISSION_STATUS.DENIED);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await permissionService.checkAllPermissions();
      setAudioStatus(results.audio);
      setPhotosStatus(results.photos);
      setContactsStatus(results.contacts);
      setAllFilesStatus(results.allFiles || PERMISSION_STATUS.DENIED);
    } catch (error) {
      console.error('[usePermissions] Error refreshing permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh permissions on initial mount and when user returns from Settings
  useEffect(() => {
    refreshPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshPermissions();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [refreshPermissions]);

  const requestAudio = async () => {
    const res = await permissionService.requestPermission(PERMISSION_TYPES.AUDIO);
    setAudioStatus(res);
    return res;
  };

  const requestPhotos = async () => {
    const res = await permissionService.requestPermission(PERMISSION_TYPES.PHOTOS);
    setPhotosStatus(res);
    return res;
  };

  const requestStorage = async () => {
    const res = await permissionService.requestPermission(PERMISSION_TYPES.STORAGE);
    setStorageStatus(res);
    return res;
  };

  const requestContacts = async () => {
    const res = await permissionService.requestPermission(PERMISSION_TYPES.CONTACTS);
    setContactsStatus(res);
    return res;
  };

  const requestAllFiles = async () => {
    await permissionService.requestAllFilesAccess();
    const isGranted = await permissionService.checkAllFilesAccess();
    const status = isGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
    setAllFilesStatus(status);
    return status;
  };

  const openSettings = async () => {
    await permissionService.openAppSettings();
  };

  const isAudioGranted = audioStatus === PERMISSION_STATUS.GRANTED;
  const isPhotosGranted = photosStatus === PERMISSION_STATUS.GRANTED;
  const isStorageGranted = storageStatus === PERMISSION_STATUS.GRANTED;
  const isContactsGranted = contactsStatus === PERMISSION_STATUS.GRANTED;
  const isAllFilesGranted = allFilesStatus === PERMISSION_STATUS.GRANTED;

  const isAudioOk = isAudioGranted || isStorageGranted;
  const isPhotosOk = isPhotosGranted || isStorageGranted;
  const isContactsOk = isContactsGranted;
  const isAllFilesOk = isAllFilesGranted;

  const areAllPermissionsGranted = isAudioOk && isPhotosOk && isContactsOk && isAllFilesOk;

  return {
    audioStatus,
    photosStatus,
    storageStatus,
    contactsStatus,
    allFilesStatus,
    isLoading,
    isAudioGranted,
    isPhotosGranted,
    isStorageGranted,
    isContactsGranted,
    isAllFilesGranted,
    areAllPermissionsGranted,
    requestAudio,
    requestPhotos,
    requestStorage,
    requestContacts,
    requestAllFiles,
    openSettings,
    refreshPermissions,
  };
}
