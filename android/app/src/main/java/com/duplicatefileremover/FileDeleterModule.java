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
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class FileDeleterModule extends ReactContextBaseJavaModule {

    private static final int DELETE_REQUEST_CODE = 9921;
    private final ReactApplicationContext reactContext;
    private final ExecutorService thumbnailExecutor = Executors.newFixedThreadPool(4);
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
     * Get sizes for categories natively
     */
    @ReactMethod
    public void getCategorySizes(Promise promise) {
        try {
            ContentResolver resolver = reactContext.getContentResolver();
            WritableMap sizes = Arguments.createMap();

            sizes.putDouble("photos", getCategorySize(resolver, MediaStore.Images.Media.EXTERNAL_CONTENT_URI));
            sizes.putDouble("videos", getCategorySize(resolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI));
            sizes.putDouble("audio", getCategorySize(resolver, MediaStore.Audio.Media.EXTERNAL_CONTENT_URI));
            
            long docSize = 0;
            try {
                Uri filesUri = MediaStore.Files.getContentUri("external");
                String docSelection = MediaStore.Files.FileColumns.DATA + " LIKE '%.pdf' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.doc' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.docx' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.txt' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.xls' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.xlsx' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.ppt' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.pptx' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.csv' OR " +
                        MediaStore.Files.FileColumns.DATA + " LIKE '%.rtf' OR " +
                        MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'application/pdf%' OR " +
                        MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'application/msword%' OR " +
                        MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'application/vnd.%' OR " +
                        MediaStore.Files.FileColumns.MIME_TYPE + " LIKE 'text/%'";
                docSize = (long) getCategorySizeBySelection(resolver, filesUri, docSelection, null);
            } catch (Exception e) {}

            // Fallback: If MediaStore returned 0 for docs, scan common document directories natively
            if (docSize == 0) {
                try {
                    docSize = calculateDirectoryDocsSize();
                } catch (Exception ignored) {}
            }
            
            sizes.putDouble("docs", (double) docSize);
            promise.resolve(sizes);
        } catch (Exception e) {
            promise.reject("STORAGE_ERROR", e.getMessage());
        }
    }

    private long calculateDirectoryDocsSize() {
        long totalBytes = 0;
        String[] paths = new String[]{
            "/storage/emulated/0/Documents",
            "/storage/emulated/0/Download",
            "/storage/emulated/0/WhatsApp/Media/WhatsApp Documents",
            "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents",
            "/storage/emulated/0/Telegram/Telegram Documents"
        };
        for (String p : paths) {
            File dir = new File(p);
            if (dir.exists() && dir.isDirectory()) {
                totalBytes += getDocFilesSizeInDir(dir, 0);
            }
        }
        return totalBytes;
    }

    private long getDocFilesSizeInDir(File dir, int depth) {
        if (depth > 5 || dir == null || !dir.isDirectory()) return 0;
        long size = 0;
        File[] files = dir.listFiles();
        if (files == null) return 0;
        for (File f : files) {
            if (f.isFile()) {
                String name = f.getName().toLowerCase();
                if (name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx") ||
                    name.endsWith(".txt") || name.endsWith(".xls") || name.endsWith(".xlsx") ||
                    name.endsWith(".ppt") || name.endsWith(".pptx") || name.endsWith(".csv") ||
                    name.endsWith(".rtf")) {
                    size += f.length();
                }
            } else if (f.isDirectory() && !f.getName().startsWith(".")) {
                size += getDocFilesSizeInDir(f, depth + 1);
            }
        }
        return size;
    }

    private double getCategorySizeBySelection(ContentResolver resolver, Uri uri, String selection, String[] args) {
        long totalSize = 0;
        try {
            String[] projection = new String[]{MediaStore.MediaColumns.SIZE};
            Cursor cursor = resolver.query(uri, projection, selection, args, null);
            if (cursor != null) {
                int sizeIdx = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE);
                if (sizeIdx != -1) {
                    while (cursor.moveToNext()) {
                        totalSize += cursor.getLong(sizeIdx);
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {}
        return (double) totalSize;
    }

    private double getCategorySize(ContentResolver resolver, Uri uri) {
        return getCategorySizeBySelection(resolver, uri, null, null);
    }

    /**
     * Instantly Queries Android System MediaStore for ALL Images across internal storage
     */
    @ReactMethod
    public void queryImagesNative(Promise promise) {
        WritableArray imageList = Arguments.createArray();
        try {
            ContentResolver resolver = reactContext.getContentResolver();
            Uri uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            String[] projection = new String[]{
                MediaStore.Images.Media._ID,
                MediaStore.Images.Media.DATA,
                MediaStore.Images.Media.DISPLAY_NAME,
                MediaStore.Images.Media.SIZE,
                MediaStore.Images.Media.DATE_MODIFIED,
                MediaStore.Images.Media.DATE_ADDED
            };

            Cursor cursor = resolver.query(uri, projection, null, null, MediaStore.Images.Media.DATE_MODIFIED + " DESC");
            if (cursor != null) {
                int dataIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATA);
                int nameIdx = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME);
                int sizeIdx = cursor.getColumnIndex(MediaStore.Images.Media.SIZE);
                int dateModIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATE_MODIFIED);

                while (cursor.moveToNext()) {
                    String path = cursor.getString(dataIdx);
                    if (path == null || path.isEmpty()) continue;

                    File file = new File(path);
                    if (!file.exists()) continue;

                    String name = cursor.getString(nameIdx);
                    if (name == null || name.isEmpty()) {
                        name = file.getName();
                    }

                    int lastDot = name.lastIndexOf('.');
                    String ext = lastDot != -1 ? name.substring(lastDot).toLowerCase() : "";
                    if (!ext.equals(".jpg") && !ext.equals(".jpeg") && !ext.equals(".png") && !ext.equals(".webp") && !ext.equals(".heic")) {
                        continue;
                    }

                    WritableMap map = Arguments.createMap();
                    map.putString("id", path);
                    map.putString("name", name);
                    map.putString("path", path);
                    map.putString("extension", ext);
                    map.putString("category", "Images");

                    long size = cursor.getLong(sizeIdx);
                    if (size <= 0) {
                        size = file.length();
                    }
                    map.putDouble("size", (double) size);

                    long dateMod = cursor.getLong(dateModIdx) * 1000L;
                    if (dateMod <= 0) {
                        dateMod = file.lastModified();
                    }
                    map.putDouble("dateModified", (double) dateMod);
                    map.putDouble("modificationTime", (double) dateMod);
                    map.putDouble("dateAdded", (double) dateMod);

                    imageList.pushMap(map);
                }
                cursor.close();
            }
            promise.resolve(imageList);
        } catch (Exception e) {
            promise.resolve(imageList);
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
    /**
     * Generates a video frame thumbnail saved to disk cache for ultra-fast async display
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

        final String finalPath = cleanPath;
        File file = new File(finalPath);
        if (!file.exists()) {
            promise.resolve(null);
            return;
        }

        thumbnailExecutor.execute(() -> {
            try {
                // Disk Cache lookup key based on path + last modified time
                String cacheKey = "vthumb_" + Math.abs((finalPath + "_" + file.lastModified()).hashCode()) + ".jpg";
                File cacheDir = new File(reactContext.getCacheDir(), "v_thumbs");
                if (!cacheDir.exists()) {
                    cacheDir.mkdirs();
                }
                File cachedFile = new File(cacheDir, cacheKey);

                if (cachedFile.exists() && cachedFile.length() > 0) {
                    promise.resolve("file://" + cachedFile.getAbsolutePath());
                    return;
                }

                Bitmap bitmap = null;

                // 1. Fast Scaled Keyframe Extraction via MediaMetadataRetriever
                MediaMetadataRetriever retriever = null;
                java.io.FileInputStream fis = null;
                try {
                    retriever = new MediaMetadataRetriever();
                    fis = new java.io.FileInputStream(file);
                    retriever.setDataSource(fis.getFD());

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                        bitmap = retriever.getScaledFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, 160, 160);
                    }
                    if (bitmap == null) {
                        bitmap = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                    }
                } catch (Exception ignored) {
                } finally {
                    if (fis != null) {
                        try { fis.close(); } catch (Exception ignored) {}
                    }
                    if (retriever != null) {
                        try { retriever.release(); } catch (Exception ignored) {}
                    }
                }

                // 2. Android 10+ ThumbnailUtils with Size constraint
                if (bitmap == null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try {
                        bitmap = ThumbnailUtils.createVideoThumbnail(file, new Size(160, 160), null);
                    } catch (Exception ignored) {}
                }

                // 3. Legacy ThumbnailUtils
                if (bitmap == null) {
                    try {
                        bitmap = ThumbnailUtils.createVideoThumbnail(finalPath, MediaStore.Images.Thumbnails.MINI_KIND);
                    } catch (Exception ignored) {}
                }

                if (bitmap != null) {
                    if (bitmap.getWidth() > 240 || bitmap.getHeight() > 240) {
                        Bitmap scaled = Bitmap.createScaledBitmap(bitmap, 160, 160, true);
                        if (scaled != bitmap) {
                            bitmap.recycle();
                            bitmap = scaled;
                        }
                    }
                    FileOutputStream fos = new FileOutputStream(cachedFile);
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 75, fos);
                    fos.flush();
                    fos.close();
                    bitmap.recycle();

                    promise.resolve("file://" + cachedFile.getAbsolutePath());
                } else {
                    promise.resolve(null);
                }
            } catch (Exception e) {
                promise.resolve(null);
            }
        });
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
