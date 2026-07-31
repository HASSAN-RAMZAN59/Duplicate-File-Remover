import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

export const OnboardingSlide = ({ item }) => {
  return (
    <View style={styles.container}>
      <View style={styles.graphicContainer}>
        <View style={styles.outerCircle}>
          <View style={styles.innerCircle}>
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.subtitle}>{item.subtitle}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicContainer: {
    marginVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  innerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  icon: {
    fontSize: 54,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
});
