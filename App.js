import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/colors';

export default function App() {
  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
