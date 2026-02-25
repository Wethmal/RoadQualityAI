import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';

interface DashboardProps {
  speedKmh: number;
  safetyScore: number;
  potholeCount: number;
  isNavigating: boolean;
  onSOS: () => void;
  onEndTrip: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  speedKmh,
  safetyScore,
  potholeCount,
  isNavigating,
  onSOS,
  onEndTrip,
}) => {
  // Score color logic
  const getScoreColor = () => {
    if (safetyScore >= 80) return '#22c55e'; // Green
    if (safetyScore >= 50) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  if (!isNavigating) return null;

  return (
    <View style={styles.container}>
      {/* Row 1: Stat Boxes */}
      <View style={styles.row}>
        <View style={styles.statBox}>
          <Text style={styles.label}>SPEED</Text>
          <Text style={[styles.value, speedKmh > 80 ? { color: '#ef4444' } : { color: '#fff' }]}>
            {speedKmh}
          </Text>
          <Text style={styles.unit}>KM/H</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.label}>LIMIT</Text>
          <Text style={styles.value}>80</Text>
          <Text style={styles.unit}>KM/H</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.label}>SCORE</Text>
          <Text style={[styles.value, { color: getScoreColor() }]}>
            {safetyScore}
          </Text>
          <Text style={styles.unit}>POINTS</Text>
        </View>
      </View>

      {/* Row 2: Pothole Count Bar */}
      <View style={styles.potholeBar}>
        <Text style={styles.potholeText}>🕳️ {potholeCount} Potholes Detected</Text>
      </View>

      {/* Row 3: Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.sosButton]} onPress={onSOS}>
          <Text style={styles.buttonText}>SOS EMERGENCY</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.endButton]} onPress={onEndTrip}>
          <Text style={styles.buttonText}>END TRIP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 2,
  },
  unit: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  potholeBar: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  potholeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    backgroundColor: '#ef4444',
  },
  endButton: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default Dashboard;