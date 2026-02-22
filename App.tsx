import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Animated,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { db } from './firebaseConfig';
import { ref, push, onValue } from 'firebase/database';
import { getDistance } from 'geolib';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD10BuXahvSztGTXNomZ2ym5teXwA5-ml0';

// ─────────────────────────────────────────────────────────────────────────────
// ANDROID-SPECIFIC NOTES:
//
//  ACCELEROMETER on Android:
//    - Android reports raw accelerometer WITH gravity (~9.8 m/s²).
//      So at rest: magnitude = √(0²+9.8²+0²) ≈ 9.8, NOT 1.0 like iOS.
//    - To detect bumps we use a HIGH-PASS FILTER to isolate sudden changes.
//    - Threshold: delta magnitude > 3.0 m/s² from running average = pothole.
//
//  GPS on Android:
//    - `loc.coords.speed` can return -1 if unavailable (iOS returns null).
//    - Always clamp with Math.max(0, speed).
//    - `distanceInterval` works reliably on Android.
//
//  VIBRATION:
//    - Android supports Vibration.vibrate() natively — used for haptic alerts.
//
//  POTHOLE COOLDOWN:
//    - Both sensor AND GPS proximity share a 5-second cooldown so alerts
//      don't overlap or spam each other.
// ─────────────────────────────────────────────────────────────────────────────

// Android accelerometer high-pass filter config
const ACCEL_INTERVAL_MS   = 100;   // 10 readings/sec — good balance on Android
const ALPHA               = 0.8;   // low-pass filter coefficient (0=slow, 1=fast)
const BUMP_THRESHOLD      = 3.0;   // m/s² delta from filtered baseline = bump
const POTHOLE_COOLDOWN_MS = 5000;  // min ms between pothole alerts

export default function App() {

  // ── State ──────────────────────────────────────────────────────────────────
  const [origin,        setOrigin]        = useState<{latitude:number;longitude:number}|null>(null);
  const [destination,   setDestination]   = useState<{latitude:number;longitude:number}|null>(null);
  const [isNavigating,  setIsNavigating]  = useState(false);
  const [showSummary,   setShowSummary]   = useState(false);

  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);

  const [potholes,      setPotholes]      = useState<any[]>([]);
  const [speed,         setSpeed]         = useState(0);
  const [activeAlert,   setActiveAlert]   = useState<string|null>(null);
  const [score,         setScore]         = useState(100);
  const [actualDuration,setActualDuration]= useState(0);

  // ── Refs ───────────────────────────────────────────────────────────────────
  // Alert
  const activeAlertRef    = useRef<string|null>(null);
  const fadeAnim          = useRef(new Animated.Value(0)).current;

  // Route (closure-safe)
  const routeDistanceRef  = useRef(0);
  const routeDurationRef  = useRef(0);

  // Trip
  const isNavigatingRef   = useRef(false);
  const tripStartRef      = useRef<number|null>(null);
  const scoreRef          = useRef(100);

  // GPS
  const lastSpeedRef      = useRef(0);         // m/s
  const currentLocRef     = useRef<{latitude:number;longitude:number}|null>(null);
  const locSubRef         = useRef<Location.LocationSubscription|null>(null);
  const potholeRef        = useRef<any[]>([]);

  // Pothole cooldown (shared between sensor + GPS paths)
  const lastPotholeAlertRef = useRef(0);

  // Android accelerometer high-pass filter state
  // We track a low-pass filtered "gravity" baseline and compute delta
  const gravityRef = useRef({ x: 0, y: 0, z: 0 });
  const sensorSubRef = useRef<any>(null);

  // Braking
  const harshBrakeCooldownRef = useRef(0);

  const mapRef = useRef<MapView>(null);

  // ── 1. Permissions + Firebase ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is needed for navigation.');
        return;
      }
      // Android: use Balanced for initial fix (faster than High)
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setOrigin(coords);
      currentLocRef.current = coords;
    })();

    // Firebase: load existing potholes and listen for changes
    const dbRef = ref(db, 'detected_potholes');
    const unsub = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      const arr: any[] = data
        ? Object.keys(data).map(k => ({ id: k, ...data[k] }))
        : [];
      setPotholes(arr);
      potholeRef.current = arr;
    });
    return () => unsub();
  }, []);

  // ── 2. Sensors: start/stop with navigation ─────────────────────────────────
  useEffect(() => {
    isNavigatingRef.current = isNavigating;

    if (!isNavigating) {
      sensorSubRef.current?.remove();
      sensorSubRef.current = null;
      locSubRef.current?.remove();
      locSubRef.current = null;
      return;
    }

    tripStartRef.current      = Date.now();
    lastPotholeAlertRef.current = 0;
    harshBrakeCooldownRef.current = 0;
    lastSpeedRef.current      = 0;

    // ── ACCELEROMETER (Android high-pass filter) ──────────────────────────
    // On Android, raw accel includes gravity vector.
    // High-pass filter: linear_acceleration = raw - gravity_estimate
    // If the spike in linear_acceleration > BUMP_THRESHOLD → pothole.

    // Seed the gravity baseline with first reading
    let gravitySeeded = false;

    Accelerometer.setUpdateInterval(ACCEL_INTERVAL_MS);
    sensorSubRef.current = Accelerometer.addListener(({ x, y, z }) => {
      if (!isNavigatingRef.current) return;

      const g = gravityRef.current;

      if (!gravitySeeded) {
        // First reading: use raw values as initial gravity estimate
        gravityRef.current = { x, y, z };
        gravitySeeded = true;
        return;
      }

      // Low-pass: update gravity estimate (isolates slow gravity component)
      g.x = ALPHA * g.x + (1 - ALPHA) * x;
      g.y = ALPHA * g.y + (1 - ALPHA) * y;
      g.z = ALPHA * g.z + (1 - ALPHA) * z;

      // High-pass: linear acceleration = raw - gravity
      const linX = x - g.x;
      const linY = y - g.y;
      const linZ = z - g.z;

      // Magnitude of linear (non-gravity) acceleration
      const bump = Math.sqrt(linX * linX + linY * linY + linZ * linZ);

      const now = Date.now();
      if (bump > BUMP_THRESHOLD && (now - lastPotholeAlertRef.current) > POTHOLE_COOLDOWN_MS) {
        lastPotholeAlertRef.current = now;

        // Log detected pothole to Firebase
        if (currentLocRef.current) {
          push(ref(db, 'detected_potholes'), {
            latitude:   currentLocRef.current.latitude,
            longitude:  currentLocRef.current.longitude,
            detectedBy: 'accelerometer',
            bumpForce:  bump.toFixed(2),
            timestamp:  now,
          });
        }

        // Vibrate on Android to confirm detection
        Vibration.vibrate([0, 80, 60, 80]);
        penalizeScore(10, `🕳️ POTHOLE DETECTED! (${bump.toFixed(1)} m/s²)`);
      }
    });

    // ── GPS LOCATION WATCHER ──────────────────────────────────────────────
    (async () => {
      try {
        locSubRef.current = await Location.watchPositionAsync(
          {
            accuracy:         Location.Accuracy.BestForNavigation,
            distanceInterval: 2,    // fire every 2m — reliable on Android
            timeInterval:     1000,
          },
          (loc) => {
            if (!isNavigatingRef.current) return;

            const coords = {
              latitude:  loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            currentLocRef.current = coords;
            setOrigin(coords);

            // Android: speed can be -1; clamp to 0
            const speedMs  = Math.max(0, loc.coords.speed ?? 0);
            const speedKmh = Math.round(speedMs * 3.6);
            setSpeed(speedKmh);

            // ── GPS Pothole Proximity Alert ──
            const now = Date.now();
            if ((now - lastPotholeAlertRef.current) > POTHOLE_COOLDOWN_MS) {
              const nearby = potholeRef.current
                .map(p => ({
                  ...p,
                  dist: getDistance(coords, { latitude: p.latitude, longitude: p.longitude }),
                }))
                .filter(p => p.dist < 100 && p.dist > 5)
                .sort((a, b) => a.dist - b.dist)[0];

              if (nearby) {
                lastPotholeAlertRef.current = now;
                Vibration.vibrate(200);
                triggerAlert(`⚠️ POTHOLE ${nearby.dist}m AHEAD — SLOW DOWN`);
              }
            }

            // ── Harsh Braking Detection ──
            // Android GPS updates every ~1s. Delta < -3.5 m/s in 1s ≈ 0.35g = harsh.
            const speedDiff = speedMs - lastSpeedRef.current;
            const nowB = Date.now();
            if (
              speedDiff < -3.5 &&
              lastSpeedRef.current > 2 &&  // avoid false trigger from GPS jitter at standstill
              (nowB - harshBrakeCooldownRef.current) > 3000
            ) {
              harshBrakeCooldownRef.current = nowB;
              Vibration.vibrate(300);
              penalizeScore(5, '🛑 HARSH BRAKE DETECTED!');
            }
            lastSpeedRef.current = speedMs;

            // ── Over Speed ──
            if (speedKmh > 80) {
              triggerAlert(`🚨 OVER SPEED LIMIT — ${speedKmh} KM/H`);
            }
          }
        );
      } catch (e) {
        console.warn('Location watch error:', e);
        Alert.alert('GPS Error', 'Could not start location tracking.');
      }
    })();

    return () => {
      sensorSubRef.current?.remove();
      sensorSubRef.current = null;
      locSubRef.current?.remove();
      locSubRef.current = null;
    };
  }, [isNavigating]); // ✅ ONLY isNavigating — no stale deps

  // ── Alert helper ───────────────────────────────────────────────────────────
  const triggerAlert = useCallback((msg: string) => {
    if (activeAlertRef.current) return; // debounce
    activeAlertRef.current = msg;
    setActiveAlert(msg);

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setActiveAlert(null);
        activeAlertRef.current = null;
      });
    }, 3500);
  }, [fadeAnim]);

  const penalizeScore = useCallback((amount: number, msg: string) => {
    scoreRef.current = Math.max(0, scoreRef.current - amount);
    setScore(scoreRef.current);
    triggerAlert(msg);
  }, [triggerAlert]);

  // ── Route ready ────────────────────────────────────────────────────────────
  const handleRouteReady = useCallback((result: any) => {
    routeDistanceRef.current = result.distance;
    routeDurationRef.current = result.duration;
    setRouteDistance(result.distance);
    setRouteDuration(result.duration);
    mapRef.current?.fitToCoordinates(result.coordinates, {
      edgePadding: { top: 120, right: 50, bottom: 280, left: 50 },
      animated: true,
    });
  }, []);

  // ── Trip controls ──────────────────────────────────────────────────────────
  const handleStartTrip = useCallback(() => {
    scoreRef.current = 100;
    lastSpeedRef.current = 0;
    activeAlertRef.current = null;
    gravityRef.current = { x: 0, y: 0, z: 0 };
    setScore(100);
    setActiveAlert(null);
    setIsNavigating(true);
  }, []);

  const handleEndTrip = useCallback(() => {
    if (tripStartRef.current) {
      setActualDuration(Math.round((Date.now() - tripStartRef.current) / 60000));
    }
    isNavigatingRef.current = false;
    setIsNavigating(false);
    setShowSummary(true);
  }, []);

  const handleDone = useCallback(() => {
    setShowSummary(false);
    setDestination(null);
    setSpeed(0);
    scoreRef.current = 100;
    setScore(100);
    lastSpeedRef.current = 0;
    activeAlertRef.current = null;
    setActiveAlert(null);
    setRouteDistance(0);
    setRouteDuration(0);
    routeDistanceRef.current = 0;
    routeDurationRef.current = 0;
    gravityRef.current = { x: 0, y: 0, z: 0 };
  }, []);

  const getScoreColor = () => score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation
        followsUserLocation={isNavigating}
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
        initialRegion={
          origin
            ? { ...origin, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : { latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {/* Route line */}
        {origin && destination && (
          <MapViewDirections
            origin={origin}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor="#3b82f6"
            onReady={handleRouteReady}
            onError={(err) => {
              console.warn('Directions error:', err);
              Alert.alert('Route Error', 'Check your Google Maps API key and internet connection.');
            }}
          />
        )}

        {/* Pothole markers */}
        {potholes.map(p => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            pinColor="orange"
            title={`Pothole (${p.detectedBy ?? 'reported'})`}
          />
        ))}

        {/* Destination */}
        {destination && (
          <Marker coordinate={destination} pinColor="#ef4444" title="Destination" />
        )}
      </MapView>

      {/* ── Search (pre-trip) ── */}
      {!isNavigating && !showSummary && (
        <View style={styles.searchBox}>
          <GooglePlacesAutocomplete
            placeholder="Where to go? (ශ්‍රී ලංකාව තුළ සොයන්න)"
            minLength={2}
            fetchDetails
            returnKeyType="search"
            enablePoweredByContainer={false}
            nearbyPlacesAPI="GooglePlacesSearch"
            debounce={400}
            onPress={(_data, details = null) => {
              if (!details?.geometry?.location) {
                Alert.alert('Error', 'Could not get location details. Please try again.');
                return;
              }
              const dest = {
                latitude:  details.geometry.location.lat,
                longitude: details.geometry.location.lng,
              };
              setDestination(dest);
              mapRef.current?.animateToRegion({
                ...dest,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
              // Reset route so START is disabled until new route loads
              setRouteDistance(0);
              setRouteDuration(0);
              routeDistanceRef.current = 0;
              routeDurationRef.current = 0;
            }}
            query={{
              key:        GOOGLE_MAPS_API_KEY,
              language:   'en',
              components: 'country:lk',
              location:   origin ? `${origin.latitude},${origin.longitude}` : undefined,
              radius:     50000,
            }}
            styles={searchStyles}
          />
        </View>
      )}

      {/* ── Nav header (during trip) ── */}
      {isNavigating && (
        <View style={styles.navHeader}>
          <View style={styles.navIconBox}>
            <MaterialCommunityIcons name="navigation" size={26} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.navSub}>NAVIGATING</Text>
            <Text style={styles.navMain}>
              {routeDistanceRef.current > 0
                ? `${routeDistanceRef.current.toFixed(1)} km remaining`
                : 'Follow the route'}
            </Text>
          </View>
          {/* Live speed badge in header */}
          <View style={[styles.speedBadge, { borderColor: speed > 80 ? '#ef4444' : '#10b981' }]}>
            <Text style={[styles.speedBadgeVal, { color: speed > 80 ? '#ef4444' : '#10b981' }]}>
              {speed}
            </Text>
            <Text style={styles.speedBadgeUnit}>km/h</Text>
          </View>
        </View>
      )}

      {/* ── Alert banner ── */}
      {activeAlert && (
        <Animated.View style={[styles.alertBanner, { opacity: fadeAnim }]}>
          <Ionicons name="warning" size={22} color="#f59e0b" />
          <Text style={styles.alertText}>{activeAlert}</Text>
        </Animated.View>
      )}

      {/* ── Bottom dashboard ── */}
      {!showSummary && (
        <View style={styles.dashboard}>

          {/* PRE-TRIP */}
          {!isNavigating && destination && (
            <View style={styles.preTripBox}>
              <Text style={styles.routeLabel}>ROUTE SUMMARY</Text>
              {routeDistance > 0 ? (
                <Text style={styles.routeInfoText}>
                  {routeDistance.toFixed(1)} KM  ·  {Math.round(routeDuration)} MIN
                </Text>
              ) : (
                <Text style={styles.routeLoading}>⏳ Calculating route…</Text>
              )}
              <Text style={styles.potholeNotice}>
                🕳️  {potholes.length} potholes reported on this route
              </Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setDestination(null);
                    setRouteDistance(0);
                    setRouteDuration(0);
                  }}
                >
                  <Text style={styles.btnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.startBtn, routeDistance === 0 && styles.disabledBtn]}
                  onPress={handleStartTrip}
                  disabled={routeDistance === 0}  // wait for route
                >
                  <Text style={styles.btnText}>
                    {routeDistance === 0 ? 'LOADING…' : 'START TRIP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* IDLE (no destination) */}
          {!isNavigating && !destination && (
            <View style={styles.idleBox}>
              <Text style={styles.idleText}>🗺️  Search a destination above to begin</Text>
            </View>
          )}

          {/* DURING TRIP */}
          {isNavigating && (
            <View>
              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>SPEED</Text>
                  <Text style={[styles.statValue, { color: speed > 80 ? '#ef4444' : 'white' }]}>
                    {speed}
                  </Text>
                  <Text style={[styles.statUnit, { color: speed > 80 ? '#ef4444' : '#64748b' }]}>
                    KM/H
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>LIMIT</Text>
                  <View style={[styles.limitCircle, { borderColor: speed > 80 ? '#ef4444' : '#64748b' }]}>
                    <Text style={styles.limitValue}>80</Text>
                  </View>
                  <Text style={styles.statUnit}>KM/H</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>SCORE</Text>
                  <Text style={[styles.statValue, { color: getScoreColor() }]}>{score}</Text>
                  <Text style={[styles.statUnit, { color: getScoreColor() }]}>
                    {score >= 80 ? 'GOOD' : score >= 50 ? 'FAIR' : 'POOR'}
                  </Text>
                </View>
              </View>

              {/* Detection mode badge */}
              <View style={styles.detectionBadge}>
                <Ionicons name="radio" size={12} color="#10b981" />
                <Text style={styles.detectionText}>
                  Sensor + GPS pothole detection ACTIVE
                </Text>
                <View style={styles.liveDot} />
              </View>

              {/* Pothole count */}
              <View style={styles.potholeBar}>
                <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
                <Text style={styles.potholeBarText}>
                  {potholes.length} potholes on route
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.sosBtn}
                  onPress={() => Alert.alert('🚨 SOS Sent', 'Emergency services have been notified.')}
                >
                  <Ionicons name="call" size={15} color="white" />
                  <Text style={[styles.btnText, { marginLeft: 6 }]}>EMERGENCY SOS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.endBtn}
                  onPress={handleEndTrip}
                  activeOpacity={0.7}
                >
                  <Ionicons name="stop-circle-outline" size={16} color="white" />
                  <Text style={[styles.btnText, { marginLeft: 4 }]}>End Trip</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Trip Summary Modal ── */}
      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>🏁 Trip Complete</Text>

            <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
              <Text style={[styles.scoreNum, { color: getScoreColor() }]}>{score}</Text>
              <Text style={styles.scoreSubLabel}>/ 100</Text>
            </View>

            <Text style={[styles.scoreVerdict, { color: getScoreColor() }]}>
              {score >= 80
                ? '🟢 Excellent Driver!'
                : score >= 50
                ? '🟡 Drive More Carefully'
                : '🔴 Dangerous Driving Detected'}
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statsGridItem}>
                <Text style={styles.statsGridLabel}>DISTANCE</Text>
                <Text style={styles.statsGridValue}>
                  {routeDistanceRef.current > 0
                    ? `${routeDistanceRef.current.toFixed(1)} km`
                    : '—'}
                </Text>
              </View>
              <View style={styles.statsGridItem}>
                <Text style={styles.statsGridLabel}>DURATION</Text>
                <Text style={styles.statsGridValue}>
                  {actualDuration > 0 ? `${actualDuration} min` : '< 1 min'}
                </Text>
              </View>
              <View style={styles.statsGridItem}>
                <Text style={styles.statsGridLabel}>POTHOLES</Text>
                <Text style={styles.statsGridValue}>{potholes.length}</Text>
              </View>
              <View style={styles.statsGridItem}>
                <Text style={styles.statsGridLabel}>TOP SPEED</Text>
                <Text style={styles.statsGridValue}>{speed} km/h</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
              <Text style={styles.btnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  searchBox: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 100 },

  navHeader: {
    position: 'absolute', top: 50, left: 16, right: 16,
    backgroundColor: '#1e293b', padding: 14, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', zIndex: 10, elevation: 10,
  },
  navIconBox: { backgroundColor: '#3b82f6', padding: 10, borderRadius: 12, marginRight: 14 },
  navSub:  { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  navMain: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 2 },

  speedBadge: {
    borderWidth: 2, borderRadius: 10, paddingHorizontal: 8,
    paddingVertical: 4, alignItems: 'center', marginLeft: 8,
  },
  speedBadgeVal:  { color: 'white', fontSize: 18, fontWeight: '900' },
  speedBadgeUnit: { color: '#64748b', fontSize: 8, fontWeight: '700' },

  alertBanner: {
    position: 'absolute', top: 150, left: 16, right: 16,
    backgroundColor: 'rgba(15,23,42,0.97)', padding: 14, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: '#f59e0b', zIndex: 20, elevation: 15,
  },
  alertText: { color: 'white', marginLeft: 10, fontWeight: '700', fontSize: 13, flex: 1 },

  dashboard: { position: 'absolute', bottom: 24, left: 16, right: 16 },

  idleBox:  { backgroundColor: '#1e293b', padding: 20, borderRadius: 20, alignItems: 'center' },
  idleText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

  preTripBox: { backgroundColor: '#1e293b', padding: 24, borderRadius: 20, elevation: 10 },
  routeLabel: {
    color: '#64748b', fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, textAlign: 'center', marginBottom: 6,
  },
  routeInfoText: {
    color: 'white', textAlign: 'center', fontSize: 24, fontWeight: '800', marginBottom: 4,
  },
  routeLoading:  { color: '#94a3b8', textAlign: 'center', fontSize: 15, marginBottom: 4 },
  potholeNotice: {
    color: '#f59e0b', textAlign: 'center', fontSize: 12,
    fontWeight: '600', marginBottom: 16, marginTop: 4,
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statBox: {
    backgroundColor: '#1e293b', padding: 14, borderRadius: 16,
    flex: 1, alignItems: 'center', elevation: 5,
  },
  statLabel: { color: '#64748b', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  statValue: { color: 'white', fontSize: 30, fontWeight: '900', marginVertical: 2 },
  statUnit:  { color: '#64748b', fontSize: 9, fontWeight: '700' },

  limitCircle: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center', marginVertical: 4,
  },
  limitValue: { color: 'white', fontSize: 16, fontWeight: '800' },

  detectionBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 12, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: '#10b981',
  },
  detectionText: { color: '#10b981', fontSize: 10, fontWeight: '700', marginLeft: 6, flex: 1 },
  liveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981',
  },

  potholeBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 10,
    paddingVertical: 7, paddingHorizontal: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  potholeBarText: { color: '#f59e0b', fontSize: 11, fontWeight: '600', marginLeft: 6 },

  btnRow:    { flexDirection: 'row', gap: 10, marginTop: 2 },
  sosBtn: {
    backgroundColor: '#ef4444', padding: 16, borderRadius: 14,
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    elevation: 5,
  },
  endBtn: {
    backgroundColor: '#1e40af', padding: 16, borderRadius: 14,
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#3b82f6',
  },
  startBtn: {
    backgroundColor: '#10b981', padding: 14, borderRadius: 12,
    flex: 1, alignItems: 'center', elevation: 5,
  },
  disabledBtn: { backgroundColor: '#334155', opacity: 0.6 },
  cancelBtn: {
    backgroundColor: '#475569', padding: 14, borderRadius: 12,
    flex: 1, alignItems: 'center',
  },
  btnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end',
  },
  summaryBox: {
    backgroundColor: '#1e293b', padding: 30, borderRadius: 30,
    alignItems: 'center', margin: 16, elevation: 20,
  },
  summaryTitle:  { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  scoreCircle: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 5,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  scoreNum:      { fontSize: 36, fontWeight: '900' },
  scoreSubLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  scoreVerdict:  { fontSize: 14, fontWeight: '700', marginBottom: 20 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    width: '100%', marginBottom: 24,
  },
  statsGridItem: {
    backgroundColor: '#0f172a', borderRadius: 14,
    padding: 14, width: '47%', alignItems: 'center',
  },
  statsGridLabel: {
    color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4,
  },
  statsGridValue: { color: 'white', fontSize: 18, fontWeight: '800' },

  doneBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 14,
    borderRadius: 14, width: '100%', alignItems: 'center', elevation: 6,
  },
});

// ─── Search styles ─────────────────────────────────────────────────────────
const searchStyles = {
  container:          { flex: 0, zIndex: 100 },
  textInputContainer: { borderRadius: 14, overflow: 'hidden' as const },
  textInput: {
    height: 52, borderRadius: 14, fontSize: 15,
    paddingHorizontal: 16, elevation: 8,
  },
  listView: {
    backgroundColor: 'white', borderRadius: 12,
    marginTop: 6, elevation: 8,
  },
  row:         { padding: 14, height: 52 },
  description: { fontSize: 14 },
};

// ─── Dark map style ────────────────────────────────────────────────────────
const darkMapStyle = [
  { elementType: 'geometry',              stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke',    stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill',      stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry',          stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke',   stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill',  stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry',  stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry',         stylers: [{ color: '#17263c' }] },
  { featureType: 'poi',   elementType: 'labels',           stylers: [{ visibility: 'off' }] },
];