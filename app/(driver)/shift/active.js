import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
// Conditionally import WebView only for native platforms
let WebView = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}
import Toast from "react-native-toast-message";
import * as Location from "expo-location";
import {
  ShiftService,
  TrackingService,
  OfflineTrackingService,
  TripService,
} from "../../../services";
import { MAP_CONFIG } from "../../../config/mapConfig";
import { useSelector } from "react-redux";

export default function DriverActiveShift() {
  const user = useSelector((state) => state.auth.user);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftDuration, setShiftDuration] = useState("00:00:00");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [plannedRoute, setPlannedRoute] = useState([]);
  const [actualRoute, setActualRoute] = useState([]);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [showTripSelection, setShowTripSelection] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [navigationInstructions, setNavigationInstructions] = useState([]);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const webViewRef = useRef(null);
  const fullScreenWebViewRef = useRef(null);

  useEffect(() => {
    loadActiveShift();
    checkOfflineQueue();

    return () => {
      // Cleanup location tracking
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (shift && shift.status === "active") {
      // Update duration every second
      const interval = setInterval(() => {
        updateShiftDuration();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [shift]);

  const loadActiveShift = async () => {
    try {
      setLoading(true);
      console.log("Loading active shift...");
      const response = await ShiftService.getActiveShift();
      console.log("Active shift response:", JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        setShift(response.data);

        // Check for active trip
        const trips = response.data.trips || [];
        const inProgressTrip = trips.find((t) => t.status === "in-progress");

        if (inProgressTrip) {
          setActiveTrip(inProgressTrip);
          if (inProgressTrip.route) {
            setPlannedRoute(inProgressTrip.route.path || []);
            setNavigationInstructions(inProgressTrip.route.instructions || []);
          }
        } else {
          // If no active trip, fetch available pending trips
          loadAvailableTrips();
        }

        // Load actual route if shift exists
        if (response.data._id) {
          loadShiftRoute(response.data._id);
        }

        // Start location tracking if shift is active
        if (response.data.status === "active") {
          startLocationTracking();
        }
      } else {
        console.log("No active shift found, loading available trips anyway");
        setShift(null);
        // Still load available trips even without an active shift
        loadAvailableTrips();
      }
    } catch (error) {
      console.error("Failed to load active shift:", error);
      // Still try to load available trips even if shift loading fails
      loadAvailableTrips();
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load active shift",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTrips = async () => {
    try {
      console.log("Loading available trips for driver...");
      // Fetch all trips available for this driver (assigned, pending, planned)
      // Backend automatically filters by driver ID for driver role
      const response = await TripService.getDriverAvailableTrips();
      console.log(
        "Available trips response:",
        JSON.stringify(response, null, 2)
      );

      if (response.success && response.data) {
        // Filter out completed/cancelled trips and ensure they're for this driver
        const availableTripsData = response.data.filter(
          (trip) =>
            trip.status !== "completed" &&
            trip.status !== "cancelled" &&
            trip.status !== "in-progress" &&
            trip.status !== "expired"
        );
        console.log("Filtered available trips:", availableTripsData.length);
        setAvailableTrips(availableTripsData);
      } else {
        console.log("No trips in response or request failed");
        setAvailableTrips([]);
      }
    } catch (error) {
      console.error("Failed to load trips:", error);
    }
  };
  const startTrip = async (tripId) => {
    try {
      setLoading(true);
      console.log("Starting trip with ID:", tripId);
      const response = await TripService.startTrip(tripId);
      console.log("Start trip response:", JSON.stringify(response, null, 2));

      if (response.success) {
        const tripData = response.data;

        // Set active trip and navigation data
        setActiveTrip(tripData);

        // Extract and set navigation data if available
        if (tripData.route) {
          console.log("Setting up navigation with route data:", {
            pathPoints: tripData.route.path?.length || 0,
            instructions: tripData.route.instructions?.length || 0,
          });

          setPlannedRoute(tripData.route.path || []);
          setNavigationInstructions(tripData.route.instructions || []);
          setCurrentInstructionIndex(0);

          // Update map with route
          if (tripData.route.path && tripData.route.path.length > 0) {
            updateMapWithRoute(tripData.route.path);
          }
        } else {
          console.warn("No route data found in trip response");
        }

        Toast.show({
          type: "success",
          text1: "Trip Started",
          text2: "Navigation ready! Have a safe journey!",
        });
        setShowTripSelection(false);
        loadActiveShift(); // Reload to get updated trip status
      }
    } catch (error) {
      console.error("Failed to start trip:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to start trip",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadShiftRoute = async (shiftId) => {
    try {
      const response = await TrackingService.getShiftRoute(shiftId);
      if (response.success && response.data) {
        setActualRoute(response.data);
        updateMapRoute(response.data);
      }
    } catch (error) {
      console.error("Failed to load shift route:", error);
    }
  };

  const checkOfflineQueue = async () => {
    try {
      const count = await OfflineTrackingService.getOfflineLocationsCount();
      setOfflineCount(count);
    } catch (error) {
      console.error("Failed to check offline queue:", error);
    }
  };

  const startLocationTracking = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for tracking"
        );
        return;
      }

      // Start watching location
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        async (location) => {
          const { latitude, longitude, altitude, speed, heading, accuracy } =
            location.coords;

          setCurrentLocation({ latitude, longitude });

          // Speed is in m/s. Convert to km/h
          const speedKmh = speed ? Math.round(speed * 3.6) : 0;
          setCurrentSpeed(speedKmh);

          // Update navigation instruction based on location
          updateNavigationInstruction(latitude, longitude);

          // Update location to server (or save offline)
          const locationData = {
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            heading,
            shiftId: shift?._id,
            truckId:
              shift?.truck?._id ||
              (typeof shift?.truck === "string" ? shift.truck : null),
            tripId: activeTrip?._id || null,
          };

          try {
            await OfflineTrackingService.updateLocation(locationData);
            checkOfflineQueue(); // Update offline count
          } catch (error) {
            console.error("Failed to update location:", error);
          }

          // Update map with current location
          updateCurrentLocationOnMap(latitude, longitude);
        }
      );

      setLocationSubscription(subscription);
      await OfflineTrackingService.enableTracking();
    } catch (error) {
      console.error("Failed to start location tracking:", error);
      Alert.alert("Error", "Failed to start location tracking");
    }
  };

  const updateNavigationInstruction = (lat, lon) => {
    if (!navigationInstructions || navigationInstructions.length === 0) return;
    if (currentInstructionIndex >= navigationInstructions.length) return;

    // Get the current instruction
    const currentInstruction = navigationInstructions[currentInstructionIndex];

    // If we have route path, find how far along we are
    if (plannedRoute && plannedRoute.length > 0) {
      // Find closest point on the planned route
      let minDist = Infinity;
      let closestIndex = 0;

      for (let i = 0; i < plannedRoute.length; i++) {
        const point = plannedRoute[i];
        const dist = calculateDistance(
          lat,
          lon,
          point.latitude,
          point.longitude
        );
        if (dist < minDist) {
          minDist = dist;
          closestIndex = i;
        }
      }

      // Check if we've passed the current instruction's interval
      if (
        currentInstruction.interval &&
        currentInstruction.interval.length >= 2
      ) {
        const instructionEndIndex = currentInstruction.interval[1];

        // If we're past the instruction endpoint, move to next instruction
        if (
          closestIndex >= instructionEndIndex &&
          currentInstructionIndex < navigationInstructions.length - 1
        ) {
          setCurrentInstructionIndex((prev) => prev + 1);
        }
      }
    }
  };

  // Helper function to calculate distance between two points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get navigation icon based on turn sign
  const getNavigationIcon = (sign) => {
    switch (sign) {
      case -3:
        return "arrow-back"; // Sharp left
      case -2:
        return "arrow-back"; // Left
      case -1:
        return "arrow-back"; // Slight left
      case 0:
        return "arrow-up"; // Straight
      case 1:
        return "arrow-forward"; // Slight right
      case 2:
        return "arrow-forward"; // Right
      case 3:
        return "arrow-forward"; // Sharp right
      case 4:
        return "flag"; // Finish/arrive
      case 5:
        return "navigate"; // Via reached
      case 6:
        return "sync"; // Roundabout
      case 7:
        return "arrow-forward"; // Keep right
      case -7:
        return "arrow-back"; // Keep left
      case 8:
        return "refresh"; // U-turn
      default:
        return "arrow-up";
    }
  };

  // Format distance for display
  const formatDistance = (meters) => {
    if (!meters && meters !== 0) return "";
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Format time for display
  const formatTime = (milliseconds) => {
    if (!milliseconds) return "";
    const minutes = Math.round(milliseconds / 60000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes} min`;
  };

  // Get remaining distance and time for navigation
  const getRemainingNavInfo = () => {
    if (!navigationInstructions || navigationInstructions.length === 0) {
      return { distance: 0, time: 0 };
    }

    let remainingDistance = 0;
    let remainingTime = 0;

    for (
      let i = currentInstructionIndex;
      i < navigationInstructions.length;
      i++
    ) {
      remainingDistance += navigationInstructions[i]?.distance || 0;
      remainingTime += navigationInstructions[i]?.time || 0;
    }

    return { distance: remainingDistance, time: remainingTime };
  };

  const stopLocationTracking = async () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    await OfflineTrackingService.disableTracking();
  };

  const syncOfflineLocations = async () => {
    try {
      Toast.show({
        type: "info",
        text1: "Syncing",
        text2: "Syncing offline locations...",
      });

      const response = await OfflineTrackingService.syncOfflineLocations();

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Synced",
          text2: `${response.data?.syncedCount || 0} locations synced`,
        });
        checkOfflineQueue();
      }
    } catch (error) {
      console.error("Failed to sync:", error);
      Toast.show({
        type: "error",
        text1: "Sync Failed",
        text2: "Will retry automatically",
      });
    }
  };

  const updateShiftDuration = () => {
    if (!shift || !shift.startTime) return;

    const start = new Date(shift.startTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    setShiftDuration(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`
    );
  };

  const updateMapRoute = (route) => {
    const jsCode = `
      if (window.updateRoute) {
        window.updateRoute(${JSON.stringify(route)});
      }
    `;
    if (webViewRef.current) webViewRef.current.injectJavaScript(jsCode);
    if (fullScreenWebViewRef.current)
      fullScreenWebViewRef.current.injectJavaScript(jsCode);
  };

  const updatePlannedRouteOnMap = (route) => {
    const jsCode = `
      if (window.updatePlannedRoute) {
        window.updatePlannedRoute(${JSON.stringify(route)});
      }
    `;
    if (webViewRef.current) webViewRef.current.injectJavaScript(jsCode);
    if (fullScreenWebViewRef.current)
      fullScreenWebViewRef.current.injectJavaScript(jsCode);
  };

  const updateCurrentLocationOnMap = (latitude, longitude) => {
    const jsCode = `
      if (window.updateCurrentLocation) {
        window.updateCurrentLocation(${latitude}, ${longitude});
      }
    `;
    if (webViewRef.current) webViewRef.current.injectJavaScript(jsCode);
    if (fullScreenWebViewRef.current)
      fullScreenWebViewRef.current.injectJavaScript(jsCode);
  };

  const updateMapWithRoute = (routePoints) => {
    console.log("Updating map with route points:", routePoints.length);
    const jsCode = `
      if (window.updatePlannedRoute) {
        window.updatePlannedRoute(${JSON.stringify(routePoints)});
      }
    `;
    if (webViewRef.current) webViewRef.current.injectJavaScript(jsCode);
    if (fullScreenWebViewRef.current)
      fullScreenWebViewRef.current.injectJavaScript(jsCode);
  };

  // Inject initial data when map loads
  const onMapLoad = () => {
    if (plannedRoute && plannedRoute.length > 0) {
      updatePlannedRouteOnMap(plannedRoute);
    }
    if (actualRoute && actualRoute.length > 0) {
      updateMapRoute(actualRoute);
    }
    if (currentLocation) {
      updateCurrentLocationOnMap(
        currentLocation.latitude,
        currentLocation.longitude
      );
    }
  };

  const generateMapHtml = () => {
    const startLat =
      shift?.startLocation?.latitude || MAP_CONFIG.defaultCenter.latitude;
    const startLon =
      shift?.startLocation?.longitude || MAP_CONFIG.defaultCenter.longitude;

    return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>
    body, html { margin:0; padding:0; height:100%; }
    #map { position:absolute; top:0; bottom:0; width:100%; }
    .marker-current { background-color:#4CAF50; border-radius:50%; width:20px; height:20px; border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .marker-start { background-color:#D4AF37; border-radius:50%; width:16px; height:16px; border: 2px solid #fff; }
    .company-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.9);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      color: #333;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
    }
  </style>
  <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet" />
</head>
<body>
  <div id="map"></div>
  <div class="company-overlay">© KanProkagno Innovation Private Limited</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Initialize OpenStreetMap
    const map = L.map('map').setView([${startLat}, ${startLon}], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    let currentMarker = null;
    let plannedRouteLayer = null;
    let actualRouteLayer = null;
    
    // Add start location marker
    const startIcon = L.divIcon({
      className: 'marker-start',
      iconSize: [16, 16]
    });
    L.marker([${startLat}, ${startLon}], { icon: startIcon }).addTo(map);
    
    // Signal that map is loaded
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('MAP_LOADED');
    }
    
    window.updatePlannedRoute = function(route) {
      if (!route || route.length === 0) return;
      
      // Remove existing planned route
      if (plannedRouteLayer) {
        map.removeLayer(plannedRouteLayer);
      }
      
      // Convert to Leaflet format [lat, lon]
      const coordinates = route.map(point => [point.latitude, point.longitude]);
      
      // Add planned route (blue)
      plannedRouteLayer = L.polyline(coordinates, {
        color: '#2196F3',
        weight: 5,
        opacity: 0.6
      }).addTo(map);
      
      // Fit bounds to show full route
      if (coordinates.length > 0) {
        map.fitBounds(coordinates, { padding: [20, 20] });
      }
    };

    window.updateRoute = function(route) {
      if (!route || route.length === 0) return;
      
      // Remove existing actual route
      if (actualRouteLayer) {
        map.removeLayer(actualRouteLayer);
      }
      
      // Convert to Leaflet format [lat, lon]
      const coordinates = route.map(point => [point.latitude, point.longitude]);
      
      // Add actual route (gold)
      actualRouteLayer = L.polyline(coordinates, {
        color: '#D4AF37',
        weight: 4,
        opacity: 1
      }).addTo(map);
    };

    window.updateCurrentLocation = function(lat, lon) {
      if (currentMarker) {
        currentMarker.setLatLng([lat, lon]);
      } else {
        const currentIcon = L.divIcon({
          className: 'marker-current',
          iconSize: [20, 20]
        });
        currentMarker = L.marker([lat, lon], { icon: currentIcon }).addTo(map);
      }
      
      map.panTo([lat, lon]);
    };
  </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
      </SafeAreaView>
    );
  }

  if (!shift) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="calendar-outline" size={64} color="#D4AF37" />
          <Text
            className="text-xl text-gray-800 mt-4 text-center"
            style={{ fontFamily: "Cinzel" }}
          >
            No Active Shift
          </Text>
          <Text
            className="text-gray-600 mt-2 text-center"
            style={{ fontFamily: "Poppins" }}
          >
            You don't have an active shift at the moment
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Status Card */}
        <View className="bg-green-500 rounded-b-3xl p-6 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="text-white text-2xl"
              style={{ fontFamily: "Cinzel" }}
            >
              Shift Active
            </Text>
            <Ionicons name="checkmark-circle" size={32} color="#fff" />
          </View>
          <View className="flex-row justify-between">
            <View>
              <Text
                className="text-white text-lg mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Duration: {shiftDuration}
              </Text>
              <Text
                className="text-white text-sm"
                style={{ fontFamily: "Poppins" }}
              >
                Truck: {shift.truck?.truckNumber || "N/A"}
              </Text>
            </View>
            <View className="items-end">
              <Text
                className="text-white text-3xl font-bold"
                style={{ fontFamily: "Poppins" }}
              >
                {currentSpeed}
              </Text>
              <Text className="text-white text-xs">km/h</Text>
            </View>
          </View>
        </View>

        {/* Offline Sync Status */}
        {offlineCount > 0 && (
          <TouchableOpacity
            onPress={syncOfflineLocations}
            className="mx-6 mb-4 bg-orange-100 border border-orange-300 rounded-xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="cloud-offline" size={24} color="#f97316" />
              <Text
                className="text-orange-700 ml-3 flex-1"
                style={{ fontFamily: "Poppins" }}
              >
                {offlineCount} location{offlineCount > 1 ? "s" : ""} pending
                sync
              </Text>
            </View>
            <Ionicons name="refresh" size={20} color="#f97316" />
          </TouchableOpacity>
        )}

        {/* Map View */}
        <View className="mx-6 mb-4 bg-white rounded-2xl overflow-hidden shadow-sm relative">
          <View className="h-80">
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={generateMapHtml()}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Driver Map"
              />
            ) : WebView ? (
              <WebView
                ref={webViewRef}
                source={{ html: generateMapHtml() }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={(event) => {
                  if (event.nativeEvent.data === "MAP_LOADED") {
                    onMapLoad();
                  }
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-500">Map not available</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-md"
            onPress={() => setIsFullScreen(true)}
          >
            <Ionicons name="expand" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Trip Status / Selection */}
        <View className="mx-6 mb-4 bg-white rounded-2xl p-5 shadow-sm">
          <Text
            className="text-lg text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Current Trip
          </Text>

          {activeTrip ? (
            <View>
              <View className="flex-row items-center mb-3">
                <View className="bg-blue-100 p-2 rounded-full mr-3">
                  <Ionicons name="navigate" size={24} color="#2196F3" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-base">
                    {activeTrip.startLocation?.address || "Start Point"}
                  </Text>
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color="#999"
                    className="my-1"
                  />
                  <Text className="text-gray-800 font-bold text-base">
                    {activeTrip.endLocation?.address || "Destination"}
                  </Text>
                </View>
              </View>

              {navigationInstructions && navigationInstructions.length > 0 && (
                <View className="bg-blue-600 p-4 rounded-xl mt-3 shadow-lg">
                  {/* Remaining distance/time header */}
                  <View className="flex-row justify-between mb-3 pb-2 border-b border-blue-500">
                    <View className="flex-row items-center">
                      <Ionicons name="navigate" size={16} color="#93C5FD" />
                      <Text className="text-blue-100 text-xs ml-1">
                        {formatDistance(getRemainingNavInfo().distance)}{" "}
                        remaining
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="time" size={16} color="#93C5FD" />
                      <Text className="text-blue-100 text-xs ml-1">
                        ETA: {formatTime(getRemainingNavInfo().time)}
                      </Text>
                    </View>
                  </View>

                  {/* Current instruction - PROMINENT */}
                  <View className="flex-row items-center mb-3">
                    <View className="bg-white p-3 rounded-xl mr-4 shadow">
                      <Ionicons
                        name={getNavigationIcon(
                          navigationInstructions[currentInstructionIndex]?.sign
                        )}
                        size={32}
                        color="#2563EB"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-white font-bold text-lg"
                        numberOfLines={2}
                      >
                        {navigationInstructions[currentInstructionIndex]?.text}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-blue-200 text-base font-semibold">
                          {formatDistance(
                            navigationInstructions[currentInstructionIndex]
                              ?.distance
                          )}
                        </Text>
                        {navigationInstructions[currentInstructionIndex]
                          ?.streetName && (
                          <Text
                            className="text-blue-200 text-sm ml-2"
                            numberOfLines={1}
                          >
                            on{" "}
                            {
                              navigationInstructions[currentInstructionIndex]
                                .streetName
                            }
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Next instruction preview */}
                  {currentInstructionIndex <
                    navigationInstructions.length - 1 && (
                    <View className="flex-row items-center bg-blue-700 p-3 rounded-lg">
                      <Ionicons
                        name={getNavigationIcon(
                          navigationInstructions[currentInstructionIndex + 1]
                            ?.sign
                        )}
                        size={20}
                        color="#93C5FD"
                      />
                      <Text
                        className="text-blue-200 text-sm ml-3 flex-1"
                        numberOfLines={1}
                      >
                        Then:{" "}
                        {
                          navigationInstructions[currentInstructionIndex + 1]
                            ?.text
                        }
                      </Text>
                      <Text className="text-blue-300 text-xs">
                        {formatDistance(
                          navigationInstructions[currentInstructionIndex + 1]
                            ?.distance
                        )}
                      </Text>
                    </View>
                  )}

                  {/* Progress indicator */}
                  <View className="mt-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-blue-200 text-xs">
                        Step {currentInstructionIndex + 1} of{" "}
                        {navigationInstructions.length}
                      </Text>
                      <Text className="text-blue-200 text-xs">
                        {activeTrip?.estimatedDistance} km total
                      </Text>
                    </View>
                    <View className="bg-blue-800 h-2 rounded-full">
                      <View
                        className="bg-white h-2 rounded-full"
                        style={{
                          width: `${((currentInstructionIndex + 1) / navigationInstructions.length) * 100}%`,
                        }}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View className="items-center py-4">
              <Text className="text-gray-500 mb-4 text-center">
                No active trip. Select a trip to start navigation.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  loadAvailableTrips();
                  setShowTripSelection(true);
                }}
                className="bg-blue-600 px-6 py-3 rounded-full flex-row items-center"
              >
                <Ionicons name="play" size={20} color="#fff" className="mr-2" />
                <Text className="text-white font-bold">Start Trip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Navigation Debug Panel (remove in production) */}
        {__DEV__ && activeTrip && (
          <View className="mx-6 mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <Text className="text-yellow-800 font-bold mb-2">
              Navigation Debug
            </Text>
            <Text className="text-xs text-yellow-700 mb-1">
              Trip ID: {activeTrip._id}
            </Text>
            <Text className="text-xs text-yellow-700 mb-1">
              Route Points: {plannedRoute?.length || 0}
            </Text>
            <Text className="text-xs text-yellow-700 mb-1">
              Instructions: {navigationInstructions?.length || 0}
            </Text>
            <Text className="text-xs text-yellow-700 mb-1">
              Current Step: {currentInstructionIndex + 1} /{" "}
              {navigationInstructions?.length || 0}
            </Text>
            <Text className="text-xs text-yellow-700">
              Has Route Data: {activeTrip.route ? "Yes" : "No"}
            </Text>
          </View>
        )}

        {/* Shift Details */}
        <View className="mx-6 mb-6 bg-white rounded-2xl p-5 shadow-sm">
          <Text
            className="text-lg text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Shift Details
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600" style={{ fontFamily: "Poppins" }}>
                Started At
              </Text>
              <Text className="text-gray-800" style={{ fontFamily: "Poppins" }}>
                {shift.startTime
                  ? new Date(shift.startTime).toLocaleTimeString()
                  : "N/A"}
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600" style={{ fontFamily: "Poppins" }}>
                Distance Traveled
              </Text>
              <Text className="text-gray-800" style={{ fontFamily: "Poppins" }}>
                {actualRoute.length > 0
                  ? `~${(actualRoute.length * 0.05).toFixed(2)} km`
                  : "0 km"}
              </Text>
            </View>

            <View className="flex-row justify-between py-2">
              <Text className="text-gray-600" style={{ fontFamily: "Poppins" }}>
                Tracking Points
              </Text>
              <Text className="text-gray-800" style={{ fontFamily: "Poppins" }}>
                {actualRoute.length}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Full Screen Map Modal */}
      <Modal
        visible={isFullScreen}
        animationType="slide"
        onRequestClose={() => setIsFullScreen(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Full Screen Map</Text>
            <TouchableOpacity onPress={() => setIsFullScreen(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>
          <View className="flex-1">
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={generateMapHtml()}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Fullscreen Driver Map"
              />
            ) : WebView ? (
              <WebView
                ref={fullScreenWebViewRef}
                source={{ html: generateMapHtml() }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={(event) => {
                  if (event.nativeEvent.data === "MAP_LOADED") {
                    onMapLoad();
                  }
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-500">Map not available</Text>
              </View>
            )}
          </View>
          {/* Speed Overlay in Full Screen */}
          <View className="absolute bottom-10 left-6 bg-white/90 p-4 rounded-xl shadow-lg">
            <Text className="text-xs text-gray-500">Speed</Text>
            <Text className="text-2xl font-bold">
              {currentSpeed} <Text className="text-sm font-normal">km/h</Text>
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Trip Selection Modal */}
      <Modal
        visible={showTripSelection}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTripSelection(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl h-3/4 p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text
                className="text-xl font-bold"
                style={{ fontFamily: "Cinzel" }}
              >
                Select Trip
              </Text>
              <TouchableOpacity onPress={() => setShowTripSelection(false)}>
                <Ionicons name="close-circle" size={32} color="#999" />
              </TouchableOpacity>
            </View>

            {availableTrips.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-500">No pending trips found.</Text>
              </View>
            ) : (
              <FlatList
                data={availableTrips}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => startTrip(item._id)}
                    className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200"
                  >
                    <View className="flex-row justify-between mb-2">
                      <Text className="font-bold text-gray-800">
                        Trip #{item._id.slice(-6)}
                      </Text>
                      <View className="bg-blue-100 px-2 py-1 rounded">
                        <Text className="text-blue-800 text-xs font-bold">
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mb-2">
                      <Ionicons name="location" size={16} color="#2196F3" />
                      <Text
                        className="ml-2 text-gray-600 flex-1"
                        numberOfLines={1}
                      >
                        From: {item.startLocation?.address}
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Ionicons name="flag" size={16} color="#D4AF37" />
                      <Text
                        className="ml-2 text-gray-600 flex-1"
                        numberOfLines={1}
                      >
                        To: {item.endLocation?.address}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
