import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

interface LeaderboardEntry {
  userId: string;
  name: string;
  totalScore: number;
  totalTrips: number;
  rank: number;
}

interface LeaderboardScreenProps {
  currentUserId: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ currentUserId }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lbRef = ref(database, 'leaderboard');
    const unsubscribe = onValue(lbRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) { setEntries([]); setLoading(false); return; }

      // Fetch user names
      const { ref: dbRef, get } = await import('firebase/database');
      const sorted: LeaderboardEntry[] = await Promise.all(
        Object.entries(data).map(async ([uid, val]: [string, any]) => {
          let name = uid;
          try {
            const userSnap = await get(dbRef(database, `users/${uid}`));
            name = userSnap.val()?.name ?? uid;
          } catch {}
          return {
            userId: uid,
            name,
            totalScore: val.total_score ?? 0,
            totalTrips: val.total_trips ?? 0,
            rank: 0,
          };
        })
      );

      sorted.sort((a, b) => b.totalScore - a.totalScore);
      sorted.forEach((e, i) => (e.rank = i + 1));

      setEntries(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }: { item: LeaderboardEntry }) => {
    const isMe = item.userId === currentUserId;
    const medal = item.rank <= 3 ? MEDALS[item.rank - 1] : `#${item.rank}`;

    return (
      <View style={[styles.row, isMe && styles.myRow]}>
        <Text style={styles.medal}>{medal}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}{isMe ? ' (You)' : ''}</Text>
          <Text style={styles.trips}>{item.totalTrips} trips</Text>
        </View>
        <Text style={styles.score}>{item.totalScore}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.heading}>🏆 Leaderboard</Text>
      {loading ? (
        <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No drivers yet. Complete a trip to join!</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  heading: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 16,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  myRow: { borderColor: '#1a56db' },
  medal: { fontSize: 22, width: 40, textAlign: 'center' },
  info: { flex: 1, marginLeft: 8 },
  name: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  trips: { color: '#64748b', fontSize: 12, marginTop: 2 },
  score: { color: '#38bdf8', fontWeight: '800', fontSize: 18 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
});