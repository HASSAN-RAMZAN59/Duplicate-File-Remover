import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/colors';
import { loadSettings } from './src/services/settingsService';
import { LanguageProvider } from './src/context/LanguageContext';

export default function App() {
  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider style={styles.container}>
        <LanguageProvider>
          <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
          <AppNavigator />
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
});


