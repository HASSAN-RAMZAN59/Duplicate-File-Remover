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

  const menuItems = [
    {
      id: 'home',
      name: ROUTES.HOME,
      label: 'Home Dashboard',
      icon: '🏠',
    },
    {
      id: 'deepScan',
      name: ROUTES.DEEP_SCAN,
      label: 'Deep Scan & Clean',
      icon: '🔍',
    },
    {
      id: 'settings',
      name: ROUTES.SETTINGS,
      label: 'Settings',
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

  const handleRateUs = async () => {
    const playStoreUrl = 'market://details?id=duplicate.file.remover.file.fixer.app';
    const playStoreWebUrl = 'https://play.google.com/store/apps/details?id=duplicate.file.remover.file.fixer.app';
    const appStoreUrl = 'https://apps.apple.com';

    const targetUrl = Platform.OS === 'android' ? playStoreUrl : appStoreUrl;

    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else if (Platform.OS === 'android') {
        await Linking.openURL(playStoreWebUrl);
      } else {
        Alert.alert('Rate Us', 'Thank you for using Duplicate File Remover!');
      }
    } catch (error) {
      try {
        await Linking.openURL(playStoreWebUrl);
      } catch (err) {
        Alert.alert('Rate Us', 'Could not open store link.');
      }
    }
  };

  const handleShareApp = async () => {
    try {
      const message =
        '🚀 Free up storage space on your device! Check out Duplicate File Remover to clean duplicate files.\n\nDownload: https://play.google.com/store/apps/details?id=duplicate.file.remover.file.fixer.app';

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.appIconContainer}>
            <Text style={styles.appIcon}>📁</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.appName}>Duplicate File Remover</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Navigation Items */}
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const isActive = currentRouteName === item.name;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isActive && styles.activeMenuItem]}
                onPress={() => navigation.navigate(item.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={[styles.itemText, isActive && styles.activeItemText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.menuList}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleRateUs}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🌟</Text>
            <Text style={styles.itemText}>Rate Us</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleShareApp}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>📤</Text>
            <Text style={styles.itemText}>Share App</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Clean Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 Duplicate File Remover</Text>
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
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  appIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIcon: {
    fontSize: 22,
  },
  headerInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  appVersion: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 12,
  },
  menuList: {
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  activeMenuItem: {
    backgroundColor: COLORS.primary + '20',
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeItemText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
