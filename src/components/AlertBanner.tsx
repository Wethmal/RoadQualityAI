import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';

interface AlertBannerProps {
  message: string;
  visible: boolean;
  type: 'warning' | 'danger' | 'info';
}

const AlertBanner: React.FC<AlertBannerProps> = ({ message, visible, type }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 1. Animate In (Opacity 0 to 1)
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // 2. Auto-dismiss after 3.5 seconds
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      // If visible prop manually becomes false
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Icon and Color Selection logic
  const config = {
    warning: { bg: '#FEF3C7', border: '#D97706', icon: '⚠️' },
    danger: { bg: '#FEE2E2', border: '#DC2626', icon: '🚨' },
    info: { bg: '#DBEAFE', border: '#2563EB', icon: 'ℹ️' },
  };

  const { bg, border, icon } = config[type];

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: bg, borderLeftColor: border }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 20,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
});

export default AlertBanner;