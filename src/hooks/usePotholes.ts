import { useEffect, useRef, useState } from 'react';
import { subscribeToPotholes } from '../services/potholeService';
import { Pothole } from '../types';

export const usePotholes = () => {
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const potholeRef = useRef<Pothole[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToPotholes((data) => {
      setPotholes(data);
      potholeRef.current = data;
    });

    return () => unsubscribe();
  }, []);

  return { potholes, potholeRef };
};