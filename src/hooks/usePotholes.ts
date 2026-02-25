import { useState, useEffect, useRef } from 'react';
import { subscribeToPotholes } from '../services/potholeService';
import { Pothole } from '../types';

/**
 * Hook to manage real-time pothole data from Firebase.
 * Provides both a state for UI rendering and a ref for background logic.
 */
export const usePotholes = () => {
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  
  // Ref to mirror state for access in asynchronous callbacks (like GPS/Location)
  const potholeRef = useRef<Pothole[]>([]);

  useEffect(() => {
    // 1. Subscribe to real-time updates from Firebase
    const unsubscribe = subscribeToPotholes((updatedPotholes) => {
      setPotholes(updatedPotholes);
      potholeRef.current = updatedPotholes;
    });

    // 2. Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { 
    potholes, 
    potholeRef 
  };
};