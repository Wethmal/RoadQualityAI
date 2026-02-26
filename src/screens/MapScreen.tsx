import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Vibration,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Speech from 'expo-speech';
import { getDistance } from 'geolib';

import { useAccelerometer } from '../hooks/useAccelerometer';
import { useLocation } from '../hooks/useLocation';
import { usePotholes } from '../hooks/usePotholes';
import { reportPothole } from '../services/potholeService';
import { saveTrip } from '../services/tripService';
import { AlertBanner } from '../components/AlertBanner';
import { Dashboard } from '../components/Dashboard';
import { TripSummary } from '../components/TripSummary';
import { User, TripStats, AlertType } from '../types';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD10BuXahvSztGTXNomZ2ym5teXwA5-ml0';

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e40af' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a8a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1a2e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

interface MapScreenProps {
  user: User;
}

export const MapScreen: React.FC<MapScreenProps> = ({ user }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [safetyScore, setSafetyScore] = useState(100);
  const [potholeCount, setPotholeCount] = useState(0);
  const [currentAlert, setCurrentAlert] = useState<{ message: string; type: AlertType } | null>(null);
  const [showTripSummary, setShowTripSummary] = useState(false);
  const [tripStats, setTripStats] = useState<TripStats | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const currentLocRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const tripStartTimeRef = useRef<number>(0);
  const topSpeedRef = useRef(0);
  const totalDistanceRef = useRef(0);

  const { potholes, potholeRef } = usePotholes();

  // --- Alert helper ---
  const showAlert = (message: string, type: AlertType) => {
    const now = Date.now();
    const key = type + message;
    if (now - (lastAlertTimeRef.current[key] || 0) < 4000) return;
    lastAlertTimeRef.current[key] = now;

    setCurrentAlert({ message, type });
    Speech.speak(message, { language: 'en', rate: 0.9 });
    Vibration.vibrate([0, 80, 60, 80]);
  };

  // --- Accelerometer callbacks ---
  const handleBumpDetected = async (magnitude: number) => {
    const loc = currentLocRef.current;
    if (!loc) return;
    await reportPothole(user.id, loc.latitude, loc.longitude, magnitude);
    setSafetyScore((prev) => Math.max(0, prev - 10));
    setPotholeCount((prev) => prev + 1);
    showAlert('Pothole detected!', 'pothole');
  };

  const handleCrashDetected = (_magnitude: number) => {
    showAlert('CRASH DETECTED! SOS activating...', 'crash');
  };

  const handleHarshBrake = () => {
    setSafetyScore((prev) => Math.max(0, prev - 5));
    showAlert('Harsh braking detected!', 'braking');
  };

  const handleSpeedViolation = (kmh: number) => {
    showAlert(`Speed limit exceeded: ${kmh} km/h`, 'speed');
  };

  // --- Proximity check ---
  const checkProximityAlerts = (lat: number, lng: number) => {
    const nearby = potholeRef.current.find((p) => {
      const dist = getDistance({ latitude: lat, longitude: lng }, { latitude: p.latitude, longitude: p.longitude });
      return dist < 100 && dist > 5;
    });
    if (nearby) showAlert('Pothole ahead in 100m!', 'proximity');
  };

  // --- Hooks ---
  const { currentMagnitude } = useAccelerometer({
    isActive: isNavigating,
    onBumpDetected: handleBumpDetected,
    onCrashDetected: handleCrashDetected,
  });

  const { location, speedKmh } = useLocation({
    isActive: isNavigating,
    onSpeedViolation: handleSpeedViolation,
    onHarshBrake: handleHarshBrake,
  });

  // Update location ref + top speed + proximity
  React.useEffect(() => {
    if (!location) return;
    const { latitude, longitude, speed } = location.coords;
    currentLocRef.current = { latitude, longitude };
    const kmh = Math.round(Math.max(0, (speed ?? 0) * 3.6));
    if (kmh > topSpeedRef.current) topSpeedRef.current = kmh;
    if (isNavigating) checkProximityAlerts(latitude, longitude);
  }, [location]);

  // --- Trip controls ---
  const startTrip = () => {
    tripStartTimeRef.current = Date.now();
    topSpeedRef.current = 0;
    setPotholeCount(0);
    setSafetyScore(100);
    setIsNavigating(true);
  };

  const endTrip = async () => {
    const durationMs = Date.now() - tripStartTimeRef.current;
    const durationMin = Math.round(durationMs / 60000);
    const stats: TripStats = {
      distance: parseFloat((totalDistanceRef.current / 1000).toFixed(2)),
      duration: durationMin,
      potholes: potholeCount,
      topSpeed: topSpeedRef.current,
      score: safetyScore,
    };

    setTripStats(stats);
    await saveTrip(user.id, stats, 'Current Location', destination?.name ?? 'Unknown');
    setShowTripSummary(true);
    setIsNavigating(false);
  };

  const handleSOS = () => {
    Alert.alert('SOS', 'Emergency alert sent to your contacts!');
    showAlert('SOS sent!', 'crash');
  };

  const mapCenter = location
    ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
    : { latitude: 6.9271, longitude: 79.8612 }; // Colombo default

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        showsUserLocation
        followsUserLocation={isNavigating}
        region={{ ...mapCenter, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        {/* Pothole markers */}
        {potholes.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            pinColor="#f97316"
            title="Pothole"
            description={`Force: ${p.bumpForce}`}
          />
        ))}

        {/* Route */}
        {isNavigating && destination && location && (
          <MapViewDirections
            origin={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            destination={{ latitude: destination.lat, longitude: destination.lng }}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor="#3b82f6"
          />
        )}
      </MapView>

      {/* Pre-trip: search bar */}
      {!isNavigating && (
        <View style={styles.searchContainer}>
          <GooglePlacesAutocomplete
            placeholder="Search destination..."
            onPress={(data, details) => {
              if (!details) return;
              setDestination({
                lat: details.geometry.location.lat,
                lng: details.geometry.location.lng,
                name: data.description,
              });
            }}
            fetchDetails
            query={{ key: GOOGLE_MAPS_API_KEY, language: 'en', components: 'country:lk' }}
            styles={{
              container: { flex: 0 },
              textInputContainer: { backgroundColor: 'transparent' },
              textInput: {
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                borderRadius: 10,
                height: 46,
                paddingHorizontal: 14,
              },
              listView: { backgroundColor: '#1e293b', borderRadius: 10, marginTop: 4 },
              row: { backgroundColor: '#1e293b' },
              description: { color: '#f8fafc' },
            }}
          />

          {destination && (
            <TouchableOpacity style={styles.startButton} onPress={startTrip}>
              <Text style={styles.startButtonText}>🚀 START TRIP</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Navigating: overlays */}
      {isNavigating && (
        <>
          <AlertBanner
            message={currentAlert?.message ?? ''}
            visible={!!currentAlert}
            type={(currentAlert?.type as any) === 'pothole' || (currentAlert?.type as any) === 'proximity' ? 'warning' : (currentAlert?.type as any) === 'braking' ? 'warning' : 'danger'}
          />
          <Dashboard
            speedKmh={speedKmh}
            safetyScore={safetyScore}
            potholeCount={potholeCount}
            isNavigating={isNavigating}
            onSOS={handleSOS}
            onEndTrip={endTrip}
          />
        </>
      )}

      {tripStats && (
        <TripSummary
          visible={showTripSummary}
          stats={tripStats}
          onDone={() => {
            setShowTripSummary(false);
            setDestination(null);
            totalDistanceRef.current = 0;
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  startButton: {
    backgroundColor: '#1a56db',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  startButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});