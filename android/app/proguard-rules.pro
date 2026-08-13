# React Native ProGuard / R8 Rules

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.duplicatefileremover.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactProp *;
    @com.facebook.react.bridge.ReactPropGroup *;
}

# Keep native module constructor / methods
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    public <init>(...);
}

# Ignore warnings for third party libraries
-dontwarn com.facebook.react.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# React Native Reanimated & Gesture Handler
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
