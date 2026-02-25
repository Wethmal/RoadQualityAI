import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

// Config & Services
import { auth } from './src/config/firebase';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import MapScreen from './src/screens/MapScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';

// Types
import { User } from './src/types';

const Tab = createBottomTabNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Firebase Auth listener to track session [cite: 196, 255]
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in [cite: 319]
        // Note: In a real app, you might fetch full user profile from DB here
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Driver',
          email: firebaseUser.email || '',
          totalPoints: 0,
          rank: 0,
          status: 'active',
          registeredAt: Date.now()
        });
      } else {
        // User is logged out
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Cleanup listener
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Tab.Navigator
          screenOptions={({ route }: { route: any }) => ({
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#1a56db',
            tabBarInactiveTintColor: '#94a3b8',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => {
              let iconName: any;
              if (route.name === 'Map') iconName = 'map-outline';
              else if (route.name === 'Leaderboard') iconName = 'trophy-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Map">
            {() => <MapScreen user={user} />}
          </Tab.Screen>
          <Tab.Screen name="Leaderboard">
            {() => <LeaderboardScreen currentUserId={user.id} />}
          </Tab.Screen>
        </Tab.Navigator>
      ) : (
        <AuthScreen onAuthSuccess={(userData) => setUser(userData)} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a', // Matches project dark theme 
  },
  tabBar: {
    backgroundColor: '#0f172a',
    borderTopWidth: 0,
    elevation: 10,
    height: 60,
    paddingBottom: 10,
  },
});