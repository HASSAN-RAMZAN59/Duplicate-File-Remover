import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { COLORS } from '../../constants/colors';
import { PERMISSION_STATUS } from '../../services/permissionService';

export const PermissionCard = ({
  title,
  subtitle,
  description,
  icon,
  status,
  onRequestPermission,
  onOpenSettings,
}) => {
  const isGranted = status === PERMISSION_STATUS.GRANTED;
  const isBlocked = status === PERMISSION_STATUS.BLOCKED;

  const renderBadge = () => {
    switch (status) {
      case PERMISSION_STATUS.GRANTED:
        return (
          <View style={[styles.badge, { backgroundColor: COLORS.success + '25' }]}>
            <Text style={[styles.badgeText, { color: COLORS.success }]}>✓ Allowed</Text>
          </View>
        );
      case PERMISSION_STATUS.BLOCKED:
        return (
          <View style={[styles.badge, { backgroundColor: COLORS.danger + '25' }]}>
            <Text style={[styles.badgeText, { color: COLORS.danger }]}>Blocked</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, { backgroundColor: COLORS.warning + '25' }]}>
            <Text style={[styles.badgeText, { color: COLORS.warning }]}>Action Needed</Text>
          </View>
        );
    }
  };

  return (
    <Card style={styles.cardContainer}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.titleArea}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {renderBadge()}
      </View>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.actionContainer}>
        {isGranted ? (
          <View style={styles.grantedBox}>
            <Text style={styles.grantedText}>Access granted successfully</Text>
          </View>
        ) : isBlocked ? (
          <Button
            title="Open App Settings"
            variant="outline"
            icon="⚙️"
            onPress={onOpenSettings}
            style={styles.actionButton}
          />
        ) : (
          <Button
            title="Allow Access"
            variant="primary"
            icon="🔒"
            onPress={onRequestPermission}
            style={styles.actionButton}
          />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.primaryLight,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionContainer: {
    marginTop: 4,
  },
  actionButton: {
    width: '100%',
  },
  grantedBox: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
  },
  grantedText: {
    color: COLORS.success,
    fontWeight: '600',
    fontSize: 14,
  },
});
