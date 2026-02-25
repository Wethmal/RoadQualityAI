import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { TripStats } from '../types';

interface TripSummaryProps {
  visible: boolean;
  stats: TripStats;
  onDone: () => void;
}

const TripSummary: React.FC<TripSummaryProps> = ({ visible, stats, onDone }) => {
  // Score based Verdict and Color Logic
  const getVerdict = () => {
    if (stats.score >= 80) return { text: "Excellent Driver", color: "#22c55e" };
    if (stats.score >= 50) return { text: "Drive More Carefully", color: "#f97316" };
    return { text: "Dangerous Driving Detected", color: "#ef4444" };
  };

  const verdict = getVerdict();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Trip Summary</Text>

          {/* Large Score Circle */}
          <View style={[styles.scoreCircle, { borderColor: verdict.color }]}>
            <Text style={[styles.scoreNumber, { color: verdict.color }]}>{stats.score}</Text>
            <Text style={styles.scoreLabel}>SAFETY SCORE</Text>
          </View>

          <Text style={[styles.verdictText, { color: verdict.color }]}>
            {verdict.text}
          </Text>

          {/* 2x2 Grid Stats */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{stats.distance.toFixed(1)}</Text>
              <Text style={styles.statUnit}>KM</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{Math.floor(stats.duration / 60)}</Text>
              <Text style={styles.statUnit}>MIN</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.statLabel}>Potholes</Text>
              <Text style={styles.statValue}>{stats.potholes}</Text>
              <Text style={styles.statUnit}>DETECTED</Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.statLabel}>Top Speed</Text>
              <Text style={styles.statValue}>{stats.topSpeed}</Text>
              <Text style={styles.statUnit}>KM/H</Text>
            </View>
          </View>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneButtonText}>DONE</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark theme background
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 40,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  verdictText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 40,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  statUnit: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  doneButton: {
    backgroundColor: '#1a56db',
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TripSummary;