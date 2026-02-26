import { ref, push, update, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { Pothole } from '../types';

export const reportPothole = async (
  userId: string,
  lat: number,
  lng: number,
  bumpForce: number
): Promise<string> => {
  try {
    const potholeRef = ref(database, 'detected_potholes');
    const newRef = await push(potholeRef, {
      latitude: lat,
      longitude: lng,
      bump_force: bumpForce.toFixed(2),
      detected_by: 'accelerometer',
      timestamp: Date.now(),
      status: 'active',
      reporters: { '0': userId },
      confirmation_count: 0,
      clean_passes: 0,
      clean_passers: {},
    });
    return newRef.key as string;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to report pothole');
  }
};

export const registerCleanPass = async (
  userId: string,
  potholeId: string,
  pothole: Pothole
): Promise<void> => {
  try {
    const reporters = Object.values(pothole.reporters || {});
    const cleanPassers = Object.values(pothole.cleanPassers || {});

    if (reporters.includes(userId)) return;
    if (cleanPassers.includes(userId)) return;

    const newCleanPassers = { ...pothole.cleanPassers, [Date.now()]: userId };
    const newCleanPasses = (pothole.cleanPasses || 0) + 1;
    const newStatus = newCleanPasses >= 2 ? 'resolved' : 'active';

    await update(ref(database, `detected_potholes/${potholeId}`), {
      clean_passers: newCleanPassers,
      clean_passes: newCleanPasses,
      status: newStatus,
    });
  } catch (error: any) {
    throw new Error(error.message || 'Failed to register clean pass');
  }
};

export const subscribeToPotholes = (
  callback: (potholes: Pothole[]) => void
): (() => void) => {
  const potholeRef = ref(database, 'detected_potholes');

  const unsubscribe = onValue(potholeRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    const potholes: Pothole[] = Object.entries(data)
      .map(([id, val]: [string, any]) => ({
        id,
        latitude: val.latitude,
        longitude: val.longitude,
        bumpForce: val.bump_force,
        detectedBy: val.detected_by,
        timestamp: val.timestamp,
        status: val.status,
        reporters: val.reporters || {},
        confirmationCount: val.confirmation_count || 0,
        cleanPasses: val.clean_passes || 0,
        cleanPassers: val.clean_passers || {},
      }))
      .filter((p) => p.status === 'active');

    callback(potholes);
  });

  return () => unsubscribe();
};