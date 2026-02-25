import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

interface UseAccelerometerOptions {
  isActive: boolean;
  onBumpDetected: (magnitude: number) => void;
  onCrashDetected: (magnitude: number) => void;
}

const ALPHA = 0.8;
const BUMP_THRESHOLD = 3.0;
const CRASH_THRESHOLD = 8.0;
const COOLDOWN_MS = 5000;

export const useAccelerometer = ({
  isActive,
  onBumpDetected,
  onCrashDetected,
}: UseAccelerometerOptions) => {
  const [currentMagnitude, setCurrentMagnitude] = useState(0);
  
  // Gravity and last detection time references
  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const lastDetectionTime = useRef<number>(0);

  useEffect(() => {
    let subscription: any = null;

    if (isActive) {
      // Set update interval to 100ms (10Hz)
      Accelerometer.setUpdateInterval(100);

      subscription = Accelerometer.addListener((data) => {
        const { x, y, z } = data;

        // 1. Low-Pass Filter to isolate Gravity
        gravity.current.x = ALPHA * gravity.current.x + (1 - ALPHA) * x;
        gravity.current.y = ALPHA * gravity.current.y + (1 - ALPHA) * y;
        gravity.current.z = ALPHA * gravity.current.z + (1 - ALPHA) * z;

        // 2. High-Pass Filter to get Linear Acceleration
        const linearX = x - gravity.current.x;
        const linearY = y - gravity.current.y;
        const linearZ = z - gravity.current.z;

        // 3. Calculate Vector Magnitude (G-Force)
        // Formula: magnitude = sqrt(x^2 + y^2 + z^2)
        const magnitude = Math.sqrt(
          Math.pow(linearX, 2) + Math.pow(linearY, 2) + Math.pow(linearZ, 2)
        );

        setCurrentMagnitude(magnitude);

        const now = Date.now();

        // 4. Crash Detection (No cooldown for extreme force)
        if (magnitude > CRASH_THRESHOLD) {
          onCrashDetected(magnitude);
        } 
        // 5. Pothole (Bump) Detection with 5s cooldown
        else if (magnitude > BUMP_THRESHOLD) {
          if (now - lastDetectionTime.current > COOLDOWN_MS) {
            onBumpDetected(magnitude);
            lastDetectionTime.current = now;
          }
        }
      });
    }

    // Cleanup subscription
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isActive, onBumpDetected, onCrashDetected]);

  return { currentMagnitude };
};