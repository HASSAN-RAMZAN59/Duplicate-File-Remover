import { NativeModules } from 'react-native';

/**
 * 1. Clean Phone Number Utility
 * Strips whitespace, dashes, parentheses (), plus signs +, and common country code prefixes (e.g. +1, +92, +44)
 * to normalize phone numbers into a clean numeric string for comparison.
 * 
 * @param {string} rawNumber 
 * @returns {string} Cleaned numeric string
 */
export const cleanPhoneNumber = (rawNumber = '') => {
  if (!rawNumber || typeof rawNumber !== 'string') return '';
  
  // 1. Remove all non-digit characters
  let digitsOnly = rawNumber.replace(/\D/g, '');
  
  // 2. Strip leading 00 or country codes if longer than 10 digits
  if (digitsOnly.startsWith('00')) {
    digitsOnly = digitsOnly.substring(2);
  }
  
  // Strip common country code prefixes if number length > 10
  if (digitsOnly.length > 10) {
    if (digitsOnly.startsWith('92')) digitsOnly = digitsOnly.substring(2); // Pakistan (+92)
    else if (digitsOnly.startsWith('1')) digitsOnly = digitsOnly.substring(1); // USA/Canada (+1)
    else if (digitsOnly.startsWith('44')) digitsOnly = digitsOnly.substring(2); // UK (+44)
    else if (digitsOnly.startsWith('91')) digitsOnly = digitsOnly.substring(2); // India (+91)
    else if (digitsOnly.startsWith('61')) digitsOnly = digitsOnly.substring(2); // Australia (+61)
  }

  // Handle local leading zero (e.g. 03001234567 => 3001234567)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    digitsOnly = digitsOnly.substring(1);
  }

  return digitsOnly;
};

/**
 * Normalizes contact names for string comparison.
 * @param {string} name 
 * @returns {string}
 */
export const normalizeName = (name = '') => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * 2. Fetch Phone Contacts from Device
 * Returns ONLY real contacts fetched from device storage via Native Contacts bridge. No dummy data.
 * @returns {Promise<Array<Object>>}
 */
export const fetchContacts = async () => {
  try {
    const ContactsNative = NativeModules.RNContacts || NativeModules.Contacts;
    if (ContactsNative && typeof ContactsNative.getAll === 'function') {
      const contacts = await ContactsNative.getAll();
      if (Array.isArray(contacts)) {
        return contacts;
      }
    }
  } catch (error) {
    console.warn('[ContactScanner] Native contacts fetch error:', error);
  }

  // Artificial delay for smooth UI feedback
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [];
};

/**
 * 3. Identify Duplicate Contacts by matching cleaned Phone Numbers or identical Names
 * Returns structured DuplicateGroup array matching the app's hashEngine output.
 * 
 * @param {Array<Object>} contactsList 
 * @returns {Array<Object>} DuplicateGroup objects array
 */
export const findDuplicateContacts = (contactsList = []) => {
  if (!Array.isArray(contactsList) || contactsList.length === 0) {
    return [];
  }

  const phoneMap = {};
  const nameMap = {};

  for (const contact of contactsList) {
    const name = contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim() || 'Unknown';
    const normNameKey = normalizeName(name);

    // Group by Name
    if (normNameKey && normNameKey.length > 2) {
      if (!nameMap[normNameKey]) nameMap[normNameKey] = [];
      nameMap[normNameKey].push(contact);
    }

    // Group by Cleaned Phone Number
    if (Array.isArray(contact.phoneNumbers)) {
      for (const phoneObj of contact.phoneNumbers) {
        const rawNum = typeof phoneObj === 'string' ? phoneObj : phoneObj.number;
        const cleanNum = cleanPhoneNumber(rawNum);
        if (cleanNum && cleanNum.length >= 7) {
          if (!phoneMap[cleanNum]) phoneMap[cleanNum] = [];
          
          if (!phoneMap[cleanNum].some((c) => c.recordID === contact.recordID)) {
            phoneMap[cleanNum].push(contact);
          }
        }
      }
    }
  }

  const duplicateGroups = [];
  const processedRecordIds = new Set();
  let groupCounter = 1;

  // Process Phone Number Matches (Primary Match)
  for (const [cleanNum, group] of Object.entries(phoneMap)) {
    if (group.length > 1) {
      const groupFiles = [];

      group.forEach((contact, idx) => {
        processedRecordIds.add(contact.recordID);
        const name = contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim();
        const primaryPhone = contact.phoneNumbers && contact.phoneNumbers[0] ? contact.phoneNumbers[0].number : cleanNum;

        groupFiles.push({
          id: contact.recordID || `contact_${idx}_${cleanNum}`,
          name: name,
          path: `Phone: ${primaryPhone}`,
          size: 1024, // 1 KB estimation
          category: 'Contacts',
          isOriginal: idx === 0,
          selected: idx !== 0,
          contactData: contact,
        });
      });

      duplicateGroups.push({
        groupId: `contact_group_${groupCounter++}`,
        hash: `phone_${cleanNum}`,
        fileCount: groupFiles.length,
        individualSize: 1024,
        individualSizeFormatted: '1 KB',
        reclaimableBytes: (groupFiles.length - 1) * 1024,
        reclaimableFormatted: `${groupFiles.length - 1} KB`,
        matchType: `Duplicate Phone Number (${cleanNum})`,
        files: groupFiles,
      });
    }
  }

  // Process Name Matches (Secondary Match)
  for (const [normName, group] of Object.entries(nameMap)) {
    const unvisitedContacts = group.filter((c) => !processedRecordIds.has(c.recordID));

    if (unvisitedContacts.length > 1) {
      const groupFiles = [];

      unvisitedContacts.forEach((contact, idx) => {
        processedRecordIds.add(contact.recordID);
        const name = contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim();
        const primaryPhone = contact.phoneNumbers && contact.phoneNumbers[0] ? contact.phoneNumbers[0].number : 'No Phone Number';

        groupFiles.push({
          id: contact.recordID || `contact_name_${idx}`,
          name: name,
          path: `Phone: ${primaryPhone}`,
          size: 1024,
          category: 'Contacts',
          isOriginal: idx === 0,
          selected: idx !== 0,
          contactData: contact,
        });
      });

      duplicateGroups.push({
        groupId: `contact_group_${groupCounter++}`,
        hash: `name_${normName}`,
        fileCount: groupFiles.length,
        individualSize: 1024,
        individualSizeFormatted: '1 KB',
        reclaimableBytes: (groupFiles.length - 1) * 1024,
        reclaimableFormatted: `${groupFiles.length - 1} KB`,
        matchType: `Duplicate Contact Name ("${unvisitedContacts[0].displayName}")`,
        files: groupFiles,
      });
    }
  }

  return duplicateGroups;
};

/**
 * Main Contact Scanner Engine Function
 * @returns {Promise<Array<Object>>} DuplicateGroup objects
 */
export const scanContactDuplicates = async () => {
  const rawContacts = await fetchContacts();
  return findDuplicateContacts(rawContacts);
};

export const contactScanner = {
  cleanPhoneNumber,
  normalizeName,
  fetchContacts,
  findDuplicateContacts,
  scanContactDuplicates,
};
