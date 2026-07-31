import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.cardBorder;
    switch (variant) {
      case 'primary':
        return COLORS.primary;
      case 'secondary':
        return COLORS.secondary;
      case 'danger':
        return COLORS.danger;
      case 'outline':
        return 'transparent';
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    if (variant === 'outline') return COLORS.primaryLight;
    return COLORS.white;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outlineBorder,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
