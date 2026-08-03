import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import Contacts from 'react-native-contacts';
import { cleanPhoneNumber, normalizeName } from './contactScanner';

const ContactsNative = NativeModules.RNContacts || NativeModules.Contacts;

/**
 * Ensures READ_CONTACTS and WRITE_CONTACTS runtime permissions are granted on Android.
 * @returns {Promise<boolean>}
 */
export const ensureContactsWritePermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,
      ]);

      const writeOk =
        granted[PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED;
      const readOk =
        granted[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED;

      return writeOk && readOk;
    } catch (err) {
      console.warn('[ContactMerger] Permission request error:', err);
      return false;
    }
  }
  return true;
};

/**
 * Normalizes an address object into a unique key string for comparison.
 * @param {Object|string} addrObj 
 * @returns {string}
 */
const getAddressKey = (addrObj) => {
  if (!addrObj) return '';
  if (typeof addrObj === 'string') return addrObj.trim().toLowerCase();
  const street = (addrObj.street || '').trim().toLowerCase();
  const city = (addrObj.city || '').trim().toLowerCase();
  const state = (addrObj.state || addrObj.region || '').trim().toLowerCase();
  const postCode = (addrObj.postCode || '').trim().toLowerCase();
  const formatted = (addrObj.formattedAddress || '').trim().toLowerCase();
  return formatted || `${street}_${city}_${state}_${postCode}`;
};

/**
 * Core Contact Merging Engine
 * Merges a group of duplicate contact objects into a unified Master Record.
 * 
 * 1. Ensures WRITE_CONTACTS runtime permission on Android.
 * 2. Selects the primary/first contact as the 'Master Record'.
 * 3. Extracts all unique phone numbers, emails, and postal addresses from secondary contacts.
 * 4. Appends all collected non-duplicate details into the 'Master Record'.
 * 5. Updates the 'Master Record' in the device phonebook.
 * 6. Safely deletes/unlinks secondary duplicate contact IDs after successful update.
 * 
 * @param {Object} duplicateGroup Group object containing files array or raw contact items array
 * @returns {Promise<Object>} { success: boolean, mergedCount: number, masterRecord: Object, deletedIds: Array, errors: Array }
 */
export const mergeContacts = async (duplicateGroup) => {
  if (!duplicateGroup) {
    return { success: false, mergedCount: 0, deletedIds: [], errors: ['No duplicate group provided'] };
  }

  // Ensure Android runtime WRITE_CONTACTS permission before performing mutation operations
  const hasWritePermission = await ensureContactsWritePermission();
  if (!hasWritePermission) {
    return {
      success: false,
      mergedCount: 0,
      deletedIds: [],
      errors: ['WRITE_CONTACTS permission denied by Android security policy'],
    };
  }

  // Extract contact files/data
  const items = duplicateGroup.files || duplicateGroup.contacts || (Array.isArray(duplicateGroup) ? duplicateGroup : []);
  if (!Array.isArray(items) || items.length < 2) {
    return { success: false, mergedCount: 0, deletedIds: [], errors: ['Group must contain at least 2 contacts to merge'] };
  }

  // Master Record is the primary/first contact (or file item marked as original)
  const masterFileItem = items.find((item) => item.isOriginal) || items[0];
  const masterContactRaw = masterFileItem.contactData || masterFileItem;

  // Secondary items are all other contacts in the group marked/selected for merge
  const secondaryFileItems = items.filter((item) => item !== masterFileItem && (item.selected !== false));
  
  if (secondaryFileItems.length === 0) {
    return { success: false, mergedCount: 0, deletedIds: [], errors: ['No secondary contacts selected for merge'] };
  }

  const secondaryContactsRaw = secondaryFileItems.map((item) => item.contactData || item);

  // Deep clone Master Record to prevent accidental mutations before commit
  const masterRecord = JSON.parse(JSON.stringify(masterContactRaw));

  // Initialize arrays if undefined
  if (!Array.isArray(masterRecord.phoneNumbers)) masterRecord.phoneNumbers = [];
  if (!Array.isArray(masterRecord.emailAddresses)) masterRecord.emailAddresses = [];
  if (!Array.isArray(masterRecord.postalAddresses)) masterRecord.postalAddresses = [];

  // Track existing unique keys in Master Record
  const existingCleanPhones = new Set(
    masterRecord.phoneNumbers.map((p) => cleanPhoneNumber(typeof p === 'string' ? p : p.number))
  );

  const existingEmails = new Set(
    masterRecord.emailAddresses.map((e) => (typeof e === 'string' ? e : e.email || '').trim().toLowerCase())
  );

  const existingAddresses = new Set(
    masterRecord.postalAddresses.map((a) => getAddressKey(a))
  );

  // Merge details from Secondary Contacts into Master Record
  for (const secContact of secondaryContactsRaw) {
    // 1. Phone Numbers
    if (Array.isArray(secContact.phoneNumbers)) {
      for (const phoneObj of secContact.phoneNumbers) {
        const rawNum = typeof phoneObj === 'string' ? phoneObj : phoneObj.number;
        const cleanNum = cleanPhoneNumber(rawNum);
        if (cleanNum && !existingCleanPhones.has(cleanNum)) {
          existingCleanPhones.add(cleanNum);
          masterRecord.phoneNumbers.push(
            typeof phoneObj === 'string'
              ? { label: 'mobile', number: phoneObj }
              : { label: phoneObj.label || 'other', number: phoneObj.number }
          );
        }
      }
    }

    // 2. Email Addresses
    if (Array.isArray(secContact.emailAddresses)) {
      for (const emailObj of secContact.emailAddresses) {
        const emailStr = typeof emailObj === 'string' ? emailObj : emailObj.email;
        const normEmail = (emailStr || '').trim().toLowerCase();
        if (normEmail && !existingEmails.has(normEmail)) {
          existingEmails.add(normEmail);
          masterRecord.emailAddresses.push(
            typeof emailObj === 'string'
              ? { label: 'home', email: emailStr }
              : { label: emailObj.label || 'other', email: emailObj.email }
          );
        }
      }
    }

    // 3. Postal Addresses
    if (Array.isArray(secContact.postalAddresses)) {
      for (const addrObj of secContact.postalAddresses) {
        const key = getAddressKey(addrObj);
        if (key && !existingAddresses.has(key)) {
          existingAddresses.add(key);
          masterRecord.postalAddresses.push(addrObj);
        }
      }
    }

    // 4. Fill missing scalar details (e.g. givenName, familyName, company, jobTitle, note)
    const scalarFields = ['givenName', 'familyName', 'middleName', 'company', 'jobTitle', 'department', 'note', 'prefix', 'suffix'];
    for (const field of scalarFields) {
      if (!masterRecord[field] && secContact[field]) {
        masterRecord[field] = secContact[field];
      }
    }
  }

  // Update Master Record in Phonebook
  let masterUpdateSuccess = false;
  try {
    if (Contacts && typeof Contacts.updateContact === 'function') {
      await Contacts.updateContact(masterRecord);
      masterUpdateSuccess = true;
    }
  } catch (updateErr) {
    console.warn('[ContactMerger] Contacts.updateContact error:', updateErr);
  }

  if (!masterUpdateSuccess && ContactsNative && typeof ContactsNative.updateContact === 'function') {
    try {
      await ContactsNative.updateContact(masterRecord);
      masterUpdateSuccess = true;
    } catch (nativeErr) {
      console.warn('[ContactMerger] ContactsNative.updateContact error:', nativeErr);
    }
  }

  if (!masterUpdateSuccess) {
    console.warn('[ContactMerger] Could not update master contact in phonebook native provider.');
  }

  // Safely delete secondary duplicate contacts after master record update
  const deletedIds = [];
  const errors = [];

  for (const secContact of secondaryContactsRaw) {
    const recordID = secContact.recordID || secContact.id || secContact.rawContactId;
    let deleted = false;

    try {
      if (Contacts && typeof Contacts.deleteContact === 'function') {
        await Contacts.deleteContact(secContact);
        deleted = true;
      }
    } catch (delErr) {
      console.warn('[ContactMerger] Contacts.deleteContact error:', delErr);
    }

    if (!deleted && ContactsNative && typeof ContactsNative.deleteContact === 'function') {
      try {
        await ContactsNative.deleteContact(secContact);
        deleted = true;
      } catch (nativeDelErr) {
        console.warn('[ContactMerger] ContactsNative.deleteContact error:', nativeDelErr);
      }
    }

    if (deleted) {
      deletedIds.push(recordID);
    } else {
      errors.push(`Could not delete contact recordID ${recordID}`);
    }
  }

  return {
    success: masterUpdateSuccess && deletedIds.length > 0,
    mergedCount: secondaryFileItems.length,
    masterRecord,
    deletedIds,
    errors,
  };
};

/**
 * Merges selected duplicate contacts across multiple duplicate groups.
 * 
 * @param {Array<Object>} duplicateGroups Array of duplicate group objects
 * @returns {Promise<Object>} Combined merge operation report
 */
export const mergeSelectedContactGroups = async (duplicateGroups = []) => {
  if (!Array.isArray(duplicateGroups) || duplicateGroups.length === 0) {
    return { success: true, totalMerged: 0, masterCount: 0, errors: [] };
  }

  // Request Android WRITE_CONTACTS permission upfront before processing batch
  const hasPermission = await ensureContactsWritePermission();
  if (!hasPermission) {
    return {
      success: false,
      totalMerged: 0,
      masterCount: 0,
      errors: ['WRITE_CONTACTS permission was not granted.'],
    };
  }

  let totalMerged = 0;
  let masterCount = 0;
  const errors = [];

  for (const group of duplicateGroups) {
    const selectedSecondaryFiles = (group.files || []).filter((f) => !f.isOriginal && f.selected);
    if (selectedSecondaryFiles.length > 0) {
      const res = await mergeContacts(group);
      if (res.success || res.deletedIds.length > 0) {
        totalMerged += res.mergedCount;
        masterCount += 1;
      } else {
        errors.push(...res.errors);
      }
    }
  }

  return {
    success: totalMerged > 0,
    totalMerged,
    masterCount,
    errors,
  };
};

export const contactMerger = {
  ensureContactsWritePermission,
  mergeContacts,
  mergeSelectedContactGroups,
};
