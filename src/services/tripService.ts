import { ref, push, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';
import { Trip, TripStats } from '../types';

/**
 * 1. Save completed trip data and update user leaderboard statistics
 */
export const saveTrip = async (
  userId: string,
  stats: TripStats,
  startLocation: string,
  endLocation: string
): Promise<string | null> => {
  try {
    const tripRef = ref(database, 'trips');
    
    const newTripData: Omit<Trip, 'id'> = {
      userId: userId,
      startLocation: { latitude: 0, longitude: 0, address: startLocation }, // Coordinates should be passed if available
      endLocation: { latitude: 0, longitude: 0, address: endLocation },
      distance: stats.distance,
      duration: stats.duration,
      harshBrakesCount: 0, // This can be integrated with accelerometer logic
      tripScore: stats.score,
      startTime: Date.now() - (stats.duration * 1000), // Approximate start time
      endTime: Date.now(),
    };

    // Save Trip
    const newTripRef = await push(tripRef, newTripData);
    const tripId = newTripRef.key;

    // Update Leaderboard Stats Atomically
    const leaderboardRef = ref(database, `leaderboard/${userId}`);
    const snapshot = await get(leaderboardRef);
    
    let currentData = {
      totalScore: 0,
      totalTrips: 0,
      potholesDetected: 0
    };

    if (snapshot.exists()) {
      const val = snapshot.val();
      currentData = {
        totalScore: val.totalScore || 0,
        totalTrips: val.totalTrips || 0,
        potholesDetected: val.potholesDetected || 0
      };
    }

    const leaderboardUpdates: any = {};
    leaderboardUpdates[`leaderboard/${userId}/totalScore`] = currentData.totalScore + stats.score;
    leaderboardUpdates[`leaderboard/${userId}/totalTrips`] = currentData.totalTrips + 1;
    leaderboardUpdates[`leaderboard/${userId}/potholesDetected`] = currentData.potholesDetected + stats.potholes;
    
    await update(ref(database), leaderboardUpdates);

    return tripId;
  } catch (error) {
    console.error("Error saving trip:", error);
    throw new Error("Failed to save trip data.");
  }
};

/**
 * 2. Fetch all trips for a specific user, sorted by newest first
 */
export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  try {
    const tripsRef = ref(database, 'trips');
    const userTripsQuery = query(
      tripsRef, 
      orderByChild('userId'), 
      equalTo(userId)
    );

    const snapshot = await get(userTripsQuery);
    const trips: Trip[] = [];

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        trips.push({
          id: childSnapshot.key as string,
          ...childSnapshot.val()
        });
      });
    }

    // Sort by startTime descending (Newest first)
    return trips.sort((a, b) => b.startTime - a.startTime);
  } catch (error) {
    console.error("Error fetching trips:", error);
    throw new Error("Could not retrieve trip history.");
  }
};