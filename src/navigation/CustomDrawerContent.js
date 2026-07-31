import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { COLORS } from '../constants/colors';
import { ROUTES } from './routes';

export const CustomDrawerContent = (props) => {
  const { state, navigation } = props;
  const currentRouteName = state.routes[state.index]?.name;

  // 5 Main Navigation Drawer Items Configuration
  const menuItems = [
    {
      id: 'home',
      name: ROUTES.HOME,
      label: 'Home Dashboard',
      icon: '🏠',
      badge: 'Main',
    },
    {
      id: 'deepScan',
      name: ROUTES.DEEP_SCAN,
      label: 'Deep Scan & Clean',
      icon: '🔍',
      badge: 'Pro',
    },
    {
      id: 'settings',
      name: ROUTES.SETTINGS,
      label: 'App Settings',
      icon: '⚙️',
    },
    {
      id: 'help',
      name: ROUTES.HELP,
      label: 'Help & Support',
      icon: '❓',
    },
    {
      id: 'privacy',
      name: ROUTES.PRIVACY_POLICY,
      label: 'Privacy Policy',
      icon: '🛡️',
    },
  ];

  // Action Handler 1: Rate Us Handler using React Native Linking API
  const handleRateUs = async () => {
    const playStoreUrl = 'market://details?id=duplicate.file.remover.file.fixer.app';
    const playStoreWebUrl = 'https://play.google.com/store/apps/details?id=duplicate.file.remover.file.fixer.app';
    const appStoreUrl = 'https://apps.apple.com'; // App Store fallback

    const targetUrl = Platform.OS === 'android' ? playStoreUrl : appStoreUrl;

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else if (Platform.OS === 'android') {
        // Fallback to Google Play web URL if market:// protocol isn't directly supported (e.g. emulator)
        await Linking.openURL(playStoreWebUrl);
      } else {
        Alert.alert('Rate Us', 'Thank you for choosing Duplicate File Remover!');
      }
    } catch (error) {
      console.warn('Error opening store link for Rate Us:', error);
      // Fallback
      try {
        await Linking.openURL(playStoreWebUrl);
      } catch (err) {
        Alert.alert('Rate Us', 'Could not open store link.');
      }
    }
  };

  // Action Handler 2: Share App Handler using React Native Share API
  const handleShareApp = async () => {
    try {
      const message =
        '🚀 Free up storage space on your device! Check out Duplicate File Remover to clean duplicate photos, videos, and documents instantly.\n\nDownload now: https://play.google.com/store/apps/details?id=duplicate.file.remover.file.fixer.app';

      await Share.share({
        title: 'Duplicate File Remover',
        message: message,
      });
    } catch (error) {
      console.warn('Error sharing app:', error);
    }
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.appBadge}>
            <Text style={styles.appBadgeIcon}>📁</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.appTitle}>Duplicate File Remover</Text>
            <View style={styles.versionContainer}>
              <View style={styles.versionDot} />
              <Text style={styles.appVersion}>Version 1.0.0</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 5 Main Navigation Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionHeaderLabel}>NAVIGATION</Text>
          {menuItems.map((item) => {
            const isActive = currentRouteName === item.name;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.drawerItem,
                  isActive && styles.activeDrawerItem,
                ]}
                onPress={() => navigation.navigate(item.name)}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeftGroup}>
                  <Text style={[styles.itemIcon, isActive && styles.activeItemIcon]}>
                    {item.icon}
                  </Text>
                  <Text
                    style={[
                      styles.itemLabel,
                      isActive && styles.activeItemLabel,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>

                {item.badge && (
                  <View
                    style={[
                      styles.badgeContainer,
                      isActive ? styles.activeBadgeContainer : styles.inactiveBadgeContainer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isActive ? styles.activeBadgeText : styles.inactiveBadgeText,
                      ]}
                    >
                      {item.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionHeaderLabel}>SPREAD THE LOVE</Text>

          {/* Rate Us Action Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRateUs}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeftGroup}>
              <Text style={styles.actionIcon}>🌟</Text>
              <Text style={styles.actionLabel}>Rate Us</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          {/* Share App Action Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareApp}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeftGroup}>
              <Text style={styles.actionIcon}>📤</Text>
              <Text style={styles.actionLabel}>Share App</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Footer Branding */}
      <View style={styles.footerSection}>
        <Text style={styles.footerText}>Designed for High Storage Efficiency</Text>
        <Text style={styles.copyrightText}>© 2026 Duplicate File Remover</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  appBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    marginRight: 14,
  },
  appBadgeIcon: {
    fontSize: 26,
  },
  headerTextContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 12,
  },
  menuContainer: {
    marginVertical: 4,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  activeDrawerItem: {
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
  },
  itemLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  activeItemIcon: {
    transform: [{ scale: 1.1 }],
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeItemLabel: {
    color: COLORS.white,
    fontWeight: '700',
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeContainer: {
    backgroundColor: COLORS.primary,
  },
  inactiveBadgeContainer: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeBadgeText: {
    color: COLORS.white,
  },
  inactiveBadgeText: {
    color: COLORS.textMuted,
  },
  actionsContainer: {
    marginVertical: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  footerSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});
