import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

const SPEED_LIMIT_KMH = 80;
const HARSH_BRAKE_THRESHOLD = 3.5; // m/s delta
const HARSH_BRAKE_COOLDOWN_MS = 3000;

interface UseLocationOptions {
  isActive: boolean;
  onSpeedViolation: (kmh: number) => void;
  onHarshBrake: () => void;
}

export const useLocation = ({
  isActive,
  onSpeedViolation,
  onHarshBrake,
}: UseLocationOptions) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const previousSpeedRef = useRef(0);
  const lastHarshBrakeTimeRef = useRef(0);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!isActive) {
      watcherRef.current?.remove();
      return;
    }

    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 2,
          timeInterval: 1000,
        },
        (loc) => {
          if (!mounted) return;
          setLocation(loc);

          const speed = Math.max(0, loc.coords.speed ?? 0);
          const kmh = Math.round(speed * 3.6);
          setSpeedKmh(kmh);

          if (kmh > SPEED_LIMIT_KMH) {
            onSpeedViolation(kmh);
          }

          const now = Date.now();
          const speedDelta = previousSpeedRef.current - speed;

          if (
            speedDelta > HARSH_BRAKE_THRESHOLD &&
            previousSpeedRef.current > 2 &&
            now - lastHarshBrakeTimeRef.current > HARSH_BRAKE_COOLDOWN_MS
          ) {
            onHarshBrake();
            lastHarshBrakeTimeRef.current = now;
          }

          previousSpeedRef.current = speed;
        }
      );
    })();

    return () => {
      mounted = false;
      watcherRef.current?.remove();
    };
  }, [isActive]);

  return { location, speedKmh };
};