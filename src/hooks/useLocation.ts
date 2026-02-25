import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

interface UseLocationOptions {
  isActive: boolean;
  onSpeedViolation: (kmh: number) => void;
  onHarshBrake: () => void;
}

const SPEED_LIMIT_KMH = 80;
const HARSH_BRAKE_THRESHOLD = 3.5; // m/s² decrease
const BRAKE_COOLDOWN_MS = 3000;

export const useLocation = ({
  isActive,
  onSpeedViolation,
  onHarshBrake,
}: UseLocationOptions) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number>(0);

  const previousSpeed = useRef<number>(0); // in m/s
  const lastBrakeTime = useRef<number>(0);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      // 1. Request Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      // 2. Start Watching Position
      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2, // 2 meters
          timeInterval: 1000,  // 1 second
        },
        (loc) => {
          const rawSpeed = loc.coords.speed ?? 0;
          const currentSpeedMs = Math.max(0, rawSpeed); // Clamp Android -1
          const currentSpeedKmh = Math.round(currentSpeedMs * 3.6);

          setLocation(loc);
          setSpeedKmh(currentSpeedKmh);

          // 3. Speed Violation Check
          if (currentSpeedKmh > SPEED_LIMIT_KMH) {
            onSpeedViolation(currentSpeedKmh);
          }

          // 4. Harsh Brake Detection
          const speedDelta = previousSpeed.current - currentSpeedMs;
          const now = Date.now();

          if (
            speedDelta > HARSH_BRAKE_THRESHOLD && 
            previousSpeed.current > 2 && 
            now - lastBrakeTime.current > BRAKE_COOLDOWN_MS
          ) {
            onHarshBrake();
            lastBrakeTime.current = now;
          }

          // Update Ref for next calculation
          previousSpeed.current = currentSpeedMs;
        }
      );
    };

    if (isActive) {
      startTracking();
    }

    return () => {
      if (watcher) {
        watcher.remove();
      }
    };
  }, [isActive, onSpeedViolation, onHarshBrake]);

  return { location, speedKmh };
};