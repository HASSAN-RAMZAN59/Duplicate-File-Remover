# Native Permissions Configuration Guide

This document contains the exact native permission declarations required for Android (`AndroidManifest.xml`) and iOS (`Info.plist`) for the **Duplicate File Remover** application.

---

## 🤖 Android Configuration (`android/app/src/main/AndroidManifest.xml`)

Add the following permissions inside the `<manifest>` tag, outside of `<application>`:

```xml
<!-- Storage & Media Permissions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

<!-- Android 13+ (API level 33+) Media Permissions -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

<!-- Contacts Permissions -->
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
```

---

## 🍏 iOS Configuration (`ios/DuplicateFileRemover/Info.plist`)

Add the following usage keys inside the `<dict>` tag:

```xml
<!-- Photo Library / Media Access -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Duplicate File Remover requires access to your photo library to detect and clean duplicate photos and videos.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Duplicate File Remover requires permission to update photo albums when cleaning duplicate media.</string>

<!-- Contacts Access -->
<key>NSContactsUsageDescription</key>
<string>Duplicate File Remover requires access to your contacts to find and merge duplicate address book entries.</string>
```

---

## ⚙️ `react-native-permissions` Podfile & Setup

If building with iOS CocoaPods, ensure the following setup in your `ios/Podfile`:

```ruby
setup_permissions([
  'PhotoLibrary',
  'Contacts',
])
```
