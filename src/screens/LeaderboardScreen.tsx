import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { LeaderboardEntry } from '../types';

interface LeaderboardScreenProps {
  currentUserId: string;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ currentUserId }) => {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Firebase Realtime Database eken leaderboard node eka kiyaveema [cite: 386]
    const leaderboardRef = ref(database, 'leaderboard');
    
    const unsubscribe = onValue(leaderboardRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: LeaderboardEntry[] = Object.keys(data).map((key) => ({
          userId: key,
          ...data[key],
        }));

        // Total score eka anuwa descending order ekata sort kireema [cite: 119, 333]
        const sortedList = list.sort((a, b) => b.totalScore - a.totalScore);
        
        // Drivers-lata ranks laba deema
        const rankedList = sortedList.map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

        setDrivers(rankedList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderDriver = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.userId === currentUserId;

    return (
      <View style={[styles.card, isCurrentUser && styles.currentUserCard]}>
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>{getRankEmoji(item.rank)}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.tripsText}>{item.totalTrips} Trips completed</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{item.totalScore}</Text>
          <Text style={styles.scoreLabel}>PTS</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Leaderboard</Text>
        <Text style={styles.headerSub}>Top performing drivers in Sri Lanka</Text>
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(item) => item.userId}
        renderItem={renderDriver}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No rankings available yet.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark theme background 
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    backgroundColor: '#1e293b', // Card surface color 
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currentUserCard: {
    borderColor: '#1a56db', // Highlight current user [cite: 188]
    backgroundColor: '#1e293b',
  },
  rankContainer: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  tripsText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a56db', // SafeRoute blue [cite: 261]
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 40,
  },
});

export default LeaderboardScreen;