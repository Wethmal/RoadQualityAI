/**
 * SafeRoute AI - TypeScript Type Definitions
 * Location: src/types/index.ts
 */

export type AlertType = 'pothole' | 'speed' | 'proximity' | 'crash' | 'braking';

export interface Pothole {
  id: string;
  latitude: number;
  longitude: number;
  bumpForce: string; // Accelerometer force value (e.g., "High", "Medium")
  detectedBy: string; // User ID of the first reporter
  timestamp: number;
  status: 'active' | 'resolved';
  reporters: Record<string, boolean>; // Map of UserIDs who confirmed this pothole
  confirmationCount: number;
  cleanPasses: number; // Number of times users passed without a bump
  cleanPassers: Record<string, boolean>; // Map of UserIDs who contributed to resolving it
}

export interface User {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  rank: number;
  status: 'active' | 'blocked';
  registeredAt: number;
}

export interface Trip {
  id: string;
  userId: string;
  startLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  endLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  distance: number; // in kilometers
  duration: number; // in seconds or minutes
  harshBrakesCount: number;
  tripScore: number;
  startTime: number;
  endTime: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  rank: number;
  totalScore: number;
  totalTrips: number;
  potholesDetected: number;
  cleanPassesContributed: number;
  flagged: boolean;
}

export interface EmergencyContact {
  id: string;
  contactName: string;
  phoneNumber: string;
  notifySms: boolean;
  notifyCall: boolean;
}

export interface TripStats {
  distance: number;
  duration: number;
  potholes: number;
  topSpeed: number;
  score: number;
}