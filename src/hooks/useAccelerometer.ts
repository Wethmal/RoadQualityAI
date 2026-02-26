import { useEffect, useRef, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

const ALPHA = 0.8;
const BUMP_THRESHOLD = 3.0;
const CRASH_THRESHOLD = 8.0;
const BUMP_COOLDOWN_MS = 5000;

interface UseAccelerometerOptions {
  isActive: boolean;
  onBumpDetected: (magnitude: number) => void;
  onCrashDetected: (magnitude: number) => void;
}

export const useAccelerometer = ({
  isActive,
  onBumpDetected,
  onCrashDetected,
}: UseAccelerometerOptions) => {
  const [currentMagnitude, setCurrentMagnitude] = useState(0);
  const gravityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastBumpTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener((raw) => {
      const gravity = gravityRef.current;

      gravity.x = ALPHA * gravity.x + (1 - ALPHA) * raw.x;
      gravity.y = ALPHA * gravity.y + (1 - ALPHA) * raw.y;
      gravity.z = ALPHA * gravity.z + (1 - ALPHA) * raw.z;

      const linearX = raw.x - gravity.x;
      const linearY = raw.y - gravity.y;
      const linearZ = raw.z - gravity.z;

      const magnitude = Math.sqrt(linearX ** 2 + linearY ** 2 + linearZ ** 2);
      setCurrentMagnitude(magnitude);

      const now = Date.now();

      if (magnitude > CRASH_THRESHOLD) {
        onCrashDetected(magnitude);
        lastBumpTimeRef.current = now;
        return;
      }

      if (
        magnitude > BUMP_THRESHOLD &&
        now - lastBumpTimeRef.current > BUMP_COOLDOWN_MS
      ) {
        onBumpDetected(magnitude);
        lastBumpTimeRef.current = now;
      }
    });

    return () => subscription.remove();
  }, [isActive]);

  return { currentMagnitude };
};