import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface AlertBannerProps {
  message: string;
  visible: boolean;
  type: 'warning' | 'danger' | 'info';
}

const config = {
  warning: { bg: '#FEF3C7', border: '#D97706', icon: '⚠️' },
  danger: { bg: '#FEE2E2', border: '#DC2626', icon: '🚨' },
  info: { bg: '#DBEAFE', border: '#2563EB', icon: 'ℹ️' },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ message, visible, type }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 3500);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message]);

  const { bg, border, icon } = config[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bg, borderLeftColor: border, opacity },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>
        {icon}  {message}
      </Text>
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
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flexShrink: 1,
  },
});