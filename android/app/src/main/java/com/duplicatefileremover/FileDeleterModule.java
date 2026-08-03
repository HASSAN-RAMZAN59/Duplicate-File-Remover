package com.duplicatefileremover;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Intent;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;
import java.util.Collections;
import java.util.List;

public class FileDeleterModule extends ReactContextBaseJavaModule {

    private static final int DELETE_REQUEST_CODE = 9921;
    private final ReactApplicationContext reactContext;
    private Promise pendingDeletePromise;

    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == DELETE_REQUEST_CODE) {
                if (pendingDeletePromise != null) {
                    boolean success = (resultCode == Activity.RESULT_OK);
                    pendingDeletePromise.resolve(success);
                    pendingDeletePromise = null;
                }
            }
        }
    };

    public FileDeleterModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(mActivityEventListener);
    }

    @Override
    public String getName() {
        return "NativeFileDeleter";
    }

    /**
     * Checks if Android 11+ (API 30+) All Files Access permission is granted
     */
    @ReactMethod
    public void isAllFilesPermissionGranted(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promise.resolve(Environment.isExternalStorageManager());
        } else {
            promise.resolve(true);
        }
    }

    /**
     * Opens Android System Settings page for All Files Access
     */
    @ReactMethod
    public void requestAllFilesPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                Uri uri = Uri.fromParts("package", reactContext.getPackageName(), null);
                intent.setData(uri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } catch (Exception e) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    reactContext.startActivity(intent);
                    promise.resolve(true);
                } catch (Exception ex) {
                    promise.resolve(false);
                }
            }
        } else {
            promise.resolve(true);
        }
    }

    /**
     * Unified Multi-Android Version File Deletion (Android 6 to Android 15)
     */
    @ReactMethod
    public void deleteFileNative(String rawFilePath, Promise promise) {
        if (rawFilePath == null || rawFilePath.isEmpty()) {
            promise.resolve(false);
            return;
        }

        String cleanPath = rawFilePath;
        if (cleanPath.startsWith("file://")) {
            cleanPath = cleanPath.substring(7);
        }

        try {
            cleanPath = java.net.URLDecoder.decode(cleanPath, "UTF-8");
        } catch (Exception ignored) {}

        File file = new File(cleanPath);
        if (!file.exists()) {
            // File already removed from physical storage
            promise.resolve(true);
            return;
        }

        ContentResolver resolver = reactContext.getContentResolver();
        Uri targetContentUri = null;

        // Resolve MediaStore Content URI for the clean file path
        Uri[] contentTables = new Uri[]{
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            MediaStore.Files.getContentUri("external")
        };

        for (Uri tableUri : contentTables) {
            try {
                String selection = MediaStore.MediaColumns.DATA + "=?";
                String[] selectionArgs = new String[]{ cleanPath };
                Cursor cursor = resolver.query(tableUri, new String[]{ MediaStore.MediaColumns._ID }, selection, selectionArgs, null);

                if (cursor != null) {
                    if (cursor.moveToFirst()) {
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID));
                        targetContentUri = ContentUris.withAppendedId(tableUri, id);
                    }
                    cursor.close();
                }
                if (targetContentUri != null) break;
            } catch (Exception ignored) {}
        }

        // 1. Android 11+ System Intent Deletion (MediaStore.createDeleteRequest)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && targetContentUri != null) {
            // If All Files Access (MANAGE_EXTERNAL_STORAGE) is active, delete directly
            if (Environment.isExternalStorageManager()) {
                try {
                    int count = resolver.delete(targetContentUri, null, null);
                    if (count > 0 || !file.exists()) {
                        MediaScannerConnection.scanFile(reactContext, new String[]{ cleanPath }, null, null);
                        promise.resolve(true);
                        return;
                    }
                } catch (Exception ignored) {}
            }

            // Launch System Prompt via MediaStore.createDeleteRequest
            try {
                List<Uri> uriList = Collections.singletonList(targetContentUri);
                PendingIntent pendingIntent = MediaStore.createDeleteRequest(resolver, uriList);
                Activity currentActivity = getCurrentActivity();
                if (currentActivity != null) {
                    pendingDeletePromise = promise;
                    currentActivity.startIntentSenderForResult(
                        pendingIntent.getIntentSender(),
                        DELETE_REQUEST_CODE,
                        null, 0, 0, 0
                    );
                    return;
                }
            } catch (Exception ignored) {}
        }

        // 2. Android 10 (Scoped Storage MediaStore ContentResolver delete)
        if (targetContentUri != null) {
            try {
                int count = resolver.delete(targetContentUri, null, null);
                if (count > 0 || !file.exists()) {
                    MediaScannerConnection.scanFile(reactContext, new String[]{ cleanPath }, null, null);
                    promise.resolve(true);
                    return;
                }
            } catch (Exception ignored) {}
        }

        // 3. Legacy Android (Android 9 & below / API <= 28) Direct file.delete()
        try {
            if (file.exists()) {
                file.delete();
            }
        } catch (Exception ignored) {}

        // Broadcast MediaScannerConnection to update system MediaStore index
        try {
            MediaScannerConnection.scanFile(reactContext, new String[]{ cleanPath }, null, null);
        } catch (Exception ignored) {}

        // Rescan verification: Check if file still exists on disk
        boolean stillExists = file.exists();
        System.out.println("[NativeFileDeleter] Post-deletion existence check for " + cleanPath + ": " + stillExists);
        promise.resolve(!stillExists);
    }
}
