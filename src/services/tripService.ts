import { ref, push, get, update } from 'firebase/database';
import { database } from '../config/firebase';
import { Trip, TripStats } from '../types';

export const saveTrip = async (
  userId: string,
  stats: TripStats,
  startLocation: string,
  endLocation: string
): Promise<void> => {
  try {
    const tripData = {
      user_id: userId,
      start_location: startLocation,
      end_location: endLocation,
      distance: stats.distance,
      duration: stats.duration,
      harsh_brakes_count: 0,
      trip_score: stats.score,
      start_time: Date.now() - stats.duration * 60000,
      end_time: Date.now(),
      potholes_detected: stats.potholes,
      top_speed: stats.topSpeed,
    };

    await push(ref(database, 'trips'), tripData);

    // Update leaderboard
    const lbRef = ref(database, `leaderboard/${userId}`);
    const snapshot = await get(lbRef);
    const existing = snapshot.val() || {
      total_score: 0,
      total_trips: 0,
      potholes_detected: 0,
    };

    await update(lbRef, {
      total_score: (existing.total_score || 0) + stats.score,
      total_trips: (existing.total_trips || 0) + 1,
      potholes_detected: (existing.potholes_detected || 0) + stats.potholes,
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to save trip');
  }
};

export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  try {
    const snapshot = await get(ref(database, 'trips'));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    const trips: Trip[] = Object.entries(data)
      .map(([id, val]: [string, any]) => ({
        id,
        userId: val.user_id,
        startLocation: val.start_location,
        endLocation: val.end_location,
        distance: val.distance,
        duration: val.duration,
        harshBrakesCount: val.harsh_brakes_count,
        tripScore: val.trip_score,
        startTime: val.start_time,
        endTime: val.end_time,
      }))
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.startTime - a.startTime);

    return trips;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get trips');
  }
};