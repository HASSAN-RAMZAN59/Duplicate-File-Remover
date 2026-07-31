import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CustomDrawerContent } from './CustomDrawerContent';
import { ROUTES } from './routes';
import { COLORS } from '../constants/colors';

// Import Screens
import { HomeScreen } from '../screens/HomeScreen';
import { DeepScanScreen } from '../screens/DeepScanScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

export const MainDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      initialRouteName={ROUTES.HOME}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: styles.drawerStyle,
        overlayColor: 'rgba(15, 23, 42, 0.75)',
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen
        name={ROUTES.HOME}
        component={HomeScreen}
        options={{ title: 'Home Dashboard' }}
      />
      <Drawer.Screen
        name={ROUTES.DEEP_SCAN}
        component={DeepScanScreen}
        options={{ title: 'Deep Scan & Clean' }}
      />
      <Drawer.Screen
        name={ROUTES.SETTINGS}
        component={SettingsScreen}
        options={{ title: 'App Settings' }}
      />
      <Drawer.Screen
        name={ROUTES.HELP}
        component={HelpScreen}
        options={{ title: 'Help & Support' }}
      />
      <Drawer.Screen
        name={ROUTES.PRIVACY_POLICY}
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy' }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerStyle: {
    backgroundColor: COLORS.background,
    width: Math.min(width * 0.8, 320),
  },
});
