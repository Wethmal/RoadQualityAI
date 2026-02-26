import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DashboardProps {
  speedKmh: number;
  safetyScore: number;
  potholeCount: number;
  isNavigating: boolean;
  onSOS: () => void;
  onEndTrip: () => void;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f97316';
  return '#ef4444';
};

export const Dashboard: React.FC<DashboardProps> = ({
  speedKmh,
  safetyScore,
  potholeCount,
  onSOS,
  onEndTrip,
}) => {
  const speedColor = speedKmh > 80 ? '#ef4444' : '#ffffff';
  const scoreColor = getScoreColor(safetyScore);

  return (
    <View style={styles.container}>
      {/* Row 1: Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: speedColor }]}>{speedKmh}</Text>
          <Text style={styles.statLabel}>SPEED</Text>
          <Text style={styles.statUnit}>km/h</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>80</Text>
          <Text style={styles.statLabel}>LIMIT</Text>
          <Text style={styles.statUnit}>km/h</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: scoreColor }]}>{safetyScore}</Text>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.statUnit}>pts</Text>
        </View>
      </View>

      {/* Row 2: Potholes */}
      <View style={styles.potholeRow}>
        <Text style={styles.potholeText}>🕳️  {potholeCount} Potholes Detected</Text>
      </View>

      {/* Row 3: Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.sosButton} onPress={onSOS}>
          <Text style={styles.buttonText}>🆘 SOS EMERGENCY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endButton} onPress={onEndTrip}>
          <Text style={styles.buttonText}>⏹ END TRIP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  statUnit: { fontSize: 10, color: '#64748b' },
  divider: { width: 1, height: 40, backgroundColor: '#334155' },
  potholeRow: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  potholeText: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  sosButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  endButton: {
    flex: 1,
    backgroundColor: '#475569',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});