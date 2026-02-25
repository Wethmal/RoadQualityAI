import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

// ─── Interface ────────────────────────────────────────────────────────────────
export interface UseLocationOptions {
  isActive: boolean;
  onSpeedViolation: (kmh: number) => void;
  onHarshBrake: () => void;
  // ✅ FIX — onLocationUpdate add karala thiyenawa
  // MapScreen.tsx eke "Property does not exist" error eka hadunne methana nethakama
  onLocationUpdate?: (loc: Location.LocationObject) => void;
}

export interface UseLocationReturn {
  location: Location.LocationObject | null;
  speedKmh: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLocation(options: UseLocationOptions): UseLocationReturn {
  const { isActive, onSpeedViolation, onHarshBrake, onLocationUpdate } = options;

  const locationRef    = useRef<Location.LocationObject | null>(null);
  const speedKmhRef    = useRef<number>(0);
  const prevSpeedRef   = useRef<number>(0);

  // Cooldown refs — shared cooldown prevent karnna
  const harshBrakeCooldownRef = useRef<number>(0);
  const speedAlertCooldownRef = useRef<number>(0);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Trip end unoth watcher remove karanna
      watcherRef.current?.remove();
      watcherRef.current = null;
      return;
    }

    let cancelled = false;

    const startWatcher = async () => {
      // Permission request
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }

      if (cancelled) return;

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.BestForNavigation,
          distanceInterval: 2,    // metres
          timeInterval:     1000, // ms
        },
        (loc) => {
          if (cancelled) return;

          locationRef.current = loc;
          const rawSpeed  = loc.coords.speed ?? 0;
          const speed     = Math.max(0, rawSpeed);          // clamp Android -1
          const currentKmh = Math.round(speed * 3.6);
          speedKmhRef.current = currentKmh;

          const now = Date.now();

          // ── Speed violation alert ──────────────────────────────────────────
          if (currentKmh > 80 && now - speedAlertCooldownRef.current > 5000) {
            speedAlertCooldownRef.current = now;
            onSpeedViolation(currentKmh);
          }

          // ── Harsh braking detection ────────────────────────────────────────
          const prevSpeed = prevSpeedRef.current;
          const delta     = prevSpeed - speed; // positive = deceleration in m/s

          if (
            delta > 3.5 &&
            prevSpeed > 2 &&
            now - harshBrakeCooldownRef.current > 3000
          ) {
            harshBrakeCooldownRef.current = now;
            onHarshBrake();
          }

          prevSpeedRef.current = speed;

          // ── onLocationUpdate callback ──────────────────────────────────────
          // ✅ FIX — MapScreen ekata full loc object pass karanna
          onLocationUpdate?.(loc);
        },
      );
    };

    startWatcher();

    return () => {
      cancelled = true;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    location: locationRef.current,
    speedKmh: speedKmhRef.current,
  };
}