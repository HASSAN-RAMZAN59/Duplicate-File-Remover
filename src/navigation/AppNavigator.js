import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from './routes';

import { SplashScreen } from '../screens/SplashScreen';
import { LanguageScreen } from '../screens/LanguageScreen';
import { PermissionScreen } from '../screens/PermissionScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MainDrawerNavigator } from './MainDrawerNavigator';
import { DuplicateViewerScreen } from '../screens/DuplicateViewerScreen';
import { FileDetailScreen } from '../screens/FileDetailScreen';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1E1E1E',
  },
};

export const AppNavigator = () => {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={ROUTES.SPLASH}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#1E1E1E' },
        }}
      >
        <Stack.Screen name={ROUTES.SPLASH} component={SplashScreen} />
        <Stack.Screen name={ROUTES.LANGUAGE} component={LanguageScreen} />
        <Stack.Screen name={ROUTES.PERMISSIONS} component={PermissionScreen} />
        <Stack.Screen name={ROUTES.ONBOARDING} component={OnboardingScreen} />
        <Stack.Screen name={ROUTES.MAIN_DRAWER} component={MainDrawerNavigator} />
        <Stack.Screen name={ROUTES.DUPLICATE_VIEWER} component={DuplicateViewerScreen} />
        <Stack.Screen name={ROUTES.FILE_DETAIL} component={FileDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};


