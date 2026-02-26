export interface Pothole {
  id: string;
  latitude: number;
  longitude: number;
  bumpForce: string;
  detectedBy: string;
  timestamp: number;
  status: 'active' | 'resolved';
  reporters: Record<string, string>;
  confirmationCount: number;
  cleanPasses: number;
  cleanPassers: Record<string, string>;
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
  startLocation: string;
  endLocation: string;
  distance: number;
  duration: number;
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

export type AlertType = 'pothole' | 'speed' | 'proximity' | 'crash' | 'braking';

export interface TripStats {
  distance: number;
  duration: number;
  potholes: number;
  topSpeed: number;
  score: number;
}