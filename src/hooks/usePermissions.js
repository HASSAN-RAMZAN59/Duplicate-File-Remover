import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  permissionService,
  PERMISSION_TYPES,
  PERMISSION_STATUS,
} from '../services/permissionService';

export function usePermissions() {
  const [storageStatus, setStorageStatus] = useState(PERMISSION_STATUS.DENIED);
  const [contactsStatus, setContactsStatus] = useState(PERMISSION_STATUS.DENIED);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await permissionService.checkAllPermissions();
      setStorageStatus(results.storage);
      setContactsStatus(results.contacts);
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

  const openSettings = async () => {
    await permissionService.openAppSettings();
  };

  const isStorageGranted = storageStatus === PERMISSION_STATUS.GRANTED;
  const isContactsGranted = contactsStatus === PERMISSION_STATUS.GRANTED;
  const areAllPermissionsGranted = isStorageGranted && isContactsGranted;

  return {
    storageStatus,
    contactsStatus,
    isLoading,
    isStorageGranted,
    isContactsGranted,
    areAllPermissionsGranted,
    requestStorage,
    requestContacts,
    openSettings,
    refreshPermissions,
  };
}
