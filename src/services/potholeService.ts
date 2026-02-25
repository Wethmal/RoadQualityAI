import { ref, push, update, onValue, DataSnapshot } from 'firebase/database';
import { database } from '../config/firebase';
import { Pothole } from '../types';

/**
 * 1. Report a new pothole detected by the accelerometer
 */
export const reportPothole = async (
  userId: string, 
  lat: number, 
  lng: number, 
  bumpForce: number
): Promise<string | null> => {
  try {
    const potholeRef = ref(database, 'detected_potholes');
    
    const newPotholeData = {
      latitude: lat,
      longitude: lng,
      bumpForce: bumpForce.toFixed(2),
      detectedBy: 'accelerometer',
      timestamp: Date.now(),
      status: 'active' as const,
      reporters: { '0': userId }, // Initial reporter
      confirmationCount: 0,
      cleanPasses: 0,
      cleanPassers: {}
    };

    const newPotholeRef = await push(potholeRef, newPotholeData);
    return newPotholeRef.key;
  } catch (error) {
    console.error("Error reporting pothole:", error);
    throw new Error("Failed to report pothole data.");
  }
};

/**
 * 2. Register a "Clean Pass" when a user passes a reported pothole without a bump
 */
export const registerCleanPass = async (
  userId: string, 
  potholeId: string, 
  pothole: Pothole
): Promise<void> => {
  try {
    // Check if user has already reported or clean-passed this pothole
    const hasReported = Object.keys(pothole.reporters || {}).includes(userId);
    const hasCleanPassed = Object.keys(pothole.cleanPassers || {}).includes(userId);

    if (hasReported || hasCleanPassed) {
      return; // Skip if already interacted
    }

    const updates: any = {};
    const newCleanPassCount = (pothole.cleanPasses || 0) + 1;

    // Add user to clean passers list
    updates[`detected_potholes/${potholeId}/cleanPassers/${userId}`] = true;
    updates[`detected_potholes/${potholeId}/cleanPasses`] = newCleanPassCount;

    // If 2 or more clean passes, mark as resolved
    if (newCleanPassCount >= 2) {
      updates[`detected_potholes/${potholeId}/status`] = 'resolved';
    }

    await update(ref(database), updates);
  } catch (error) {
    console.error("Error registering clean pass:", error);
    throw new Error("Could not update clean pass status.");
  }
};

/**
 * 3. Real-time subscription to active potholes for the Map view
 */
export const subscribeToPotholes = (callback: (potholes: Pothole[]) => void): (() => void) => {
  const potholesRef = ref(database, 'detected_potholes');

  const unsubscribe = onValue(potholesRef, (snapshot: DataSnapshot) => {
    const data = snapshot.val();
    const activePotholes: Pothole[] = [];

    if (data) {
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (item.status === 'active') {
          activePotholes.push({
            id: key,
            ...item
          });
        }
      });
    }
    
    callback(activePotholes);
  }, (error) => {
    console.error("Firebase subscription error:", error);
  });

  return unsubscribe; // Return the function to stop listening
};