import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

/**
 * Custom Dark-Themed Dialog Component matching reference design:
 * Clean, minimalistic dark card with left-aligned white text and no icons.
 */
export const CustomDialog = ({
  visible = false,
  title = '',
  message = '',
  primaryButtonText = 'OK',
  primaryButtonColor = '#FFFFFF',
  onPrimaryPress,
  secondaryButtonText = null,
  onSecondaryPress,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose || onSecondaryPress || onPrimaryPress}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialogCard}>
              {Boolean(title) && <Text style={styles.title}>{title}</Text>}
              {Boolean(message) && <Text style={styles.message}>{message}</Text>}

              <View style={styles.buttonRow}>
                {Boolean(secondaryButtonText) && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onSecondaryPress || onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: primaryButtonColor },
                    Boolean(secondaryButtonText) ? { flex: 1, marginLeft: 10 } : { width: '100%' },
                  ]}
                  onPress={onPrimaryPress}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      primaryButtonColor === '#FFFFFF' ? { color: '#000000' } : { color: '#FFFFFF' },
                    ]}
                  >
                    {primaryButtonText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    padding: 22,
    alignItems: 'flex-start',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 12,
    width: '100%',
  },
  message: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 22,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
