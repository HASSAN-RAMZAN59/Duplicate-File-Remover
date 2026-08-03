package com.duplicatefileremover;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.media.MediaScannerConnection;
import android.media.ThumbnailUtils;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Size;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.ByteArrayOutputStream;
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

    /**
     * Generates a video frame thumbnail as Base64 JPEG data URI for display in app previews
     */
    @ReactMethod
    public void getVideoThumbnail(String rawFilePath, Promise promise) {
        if (rawFilePath == null || rawFilePath.isEmpty()) {
            promise.resolve(null);
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
            promise.resolve(null);
            return;
        }

        try {
            Bitmap bitmap = null;

            // 1. Android 10+ ThumbnailUtils with File object
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    bitmap = ThumbnailUtils.createVideoThumbnail(file, new Size(300, 300), null);
                } catch (Exception ignored) {}
            }

            // 2. Legacy ThumbnailUtils with path string
            if (bitmap == null) {
                try {
                    bitmap = ThumbnailUtils.createVideoThumbnail(cleanPath, MediaStore.Images.Thumbnails.MINI_KIND);
                } catch (Exception ignored) {}
            }

            // 3. MediaMetadataRetriever via FileInputStream FileDescriptor (Guaranteed for WhatsApp/Downloads)
            if (bitmap == null) {
                MediaMetadataRetriever retriever = null;
                java.io.FileInputStream fis = null;
                try {
                    retriever = new MediaMetadataRetriever();
                    fis = new java.io.FileInputStream(file);
                    retriever.setDataSource(fis.getFD());
                    bitmap = retriever.getFrameAtTime();
                } catch (Exception e) {
                    try {
                        if (retriever != null) {
                            retriever.setDataSource(cleanPath);
                            bitmap = retriever.getFrameAtTime();
                        }
                    } catch (Exception ignored) {}
                } finally {
                    if (fis != null) {
                        try { fis.close(); } catch (Exception ignored) {}
                    }
                    if (retriever != null) {
                        try { retriever.release(); } catch (Exception ignored) {}
                    }
                }
            }

            if (bitmap != null) {
                ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, byteArrayOutputStream);
                byte[] byteArray = byteArrayOutputStream.toByteArray();
                String encoded = Base64.encodeToString(byteArray, Base64.NO_WRAP);
                promise.resolve("data:image/jpeg;base64," + encoded);
            } else {
                promise.resolve(null);
            }
        } catch (Exception e) {
            promise.resolve(null);
        }
    }

    /**
     * Opens file natively using Android Intent.ACTION_VIEW for media playback / viewing
     */
    @ReactMethod
    public void openFileNative(String rawFilePath, String mimeType, Promise promise) {
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
            promise.resolve(false);
            return;
        }

        try {
            ReactApplicationContext context = getReactApplicationContext();
            Uri uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                uri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".provider",
                    file
                );
            } else {
                uri = Uri.fromFile(file);
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            String targetMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "*/*";
            intent.setDataAndType(uri, targetMime);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(intent, "Open File With");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(chooser);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    /**
     * Shares file natively using Android Intent.ACTION_SEND via FileProvider
     */
    @ReactMethod
    public void shareFileNative(String rawFilePath, String mimeType, Promise promise) {
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
            promise.resolve(false);
            return;
        }

        try {
            ReactApplicationContext context = getReactApplicationContext();
            Uri uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                uri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".provider",
                    file
                );
            } else {
                uri = Uri.fromFile(file);
            }

            Intent intent = new Intent(Intent.ACTION_SEND);
            String targetMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "*/*";
            intent.setType(targetMime);
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(intent, "Share File Via");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(chooser);
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }
}
