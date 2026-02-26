import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TripStats } from '../types';

interface TripSummaryProps {
  visible: boolean;
  stats: TripStats;
  onDone: () => void;
}

const getVerdict = (score: number) => {
  if (score >= 80) return { text: 'Excellent Driver! 🏆', color: '#22c55e' };
  if (score >= 50) return { text: 'Drive More Carefully ⚠️', color: '#f97316' };
  return { text: 'Dangerous Driving Detected 🚨', color: '#ef4444' };
};

export const TripSummary: React.FC<TripSummaryProps> = ({ visible, stats, onDone }) => {
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible]);

  const verdict = getVerdict(stats?.score ?? 0);
  const scoreBorder = verdict.color;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.title}>Trip Summary</Text>

          {/* Score Circle */}
          <View style={[styles.scoreCircle, { borderColor: scoreBorder }]}>
            <Text style={[styles.scoreNumber, { color: scoreBorder }]}>
              {stats?.score ?? 0}
            </Text>
            <Text style={styles.scoreLabel}>SCORE</Text>
          </View>

          <Text style={[styles.verdict, { color: scoreBorder }]}>{verdict.text}</Text>

          {/* Stats Grid */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{(stats?.distance ?? 0).toFixed(1)}</Text>
              <Text style={styles.gridLabel}>Distance (km)</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{stats?.duration ?? 0}</Text>
              <Text style={styles.gridLabel}>Duration (min)</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{stats?.potholes ?? 0}</Text>
              <Text style={styles.gridLabel}>Potholes</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{stats?.topSpeed ?? 0}</Text>
              <Text style={styles.gridLabel}>Top Speed (km/h)</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneText}>DONE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreNumber: { fontSize: 40, fontWeight: 'bold' },
  scoreLabel: { color: '#94a3b8', fontSize: 12 },
  verdict: { fontSize: 16, fontWeight: '600', marginBottom: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  gridValue: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
  gridLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  doneButton: {
    backgroundColor: '#1a56db',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 12,
  },
  doneText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});