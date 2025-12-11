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
import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
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
  BreakdownService,
  AuthService,
  TruckService,
  NotificationService,
} from "../../../services";
import { MAP_CONFIG } from "../../../config/mapConfig";
import { useSelector, useDispatch } from "react-redux";
import { restoreAuth } from "../../../store/slices/authSlice";
import { useFocusEffect } from "@react-navigation/native";

export default function DriverActiveShift() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
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
    // Restore user auth if not available
    const restoreUserAuth = async () => {
      if (!user) {
        //console.log("User not available, trying to restore from token...");
        try {
          const authData = await AuthService.restoreUserFromToken();
          if (authData) {
            //console.log("Restored user from token:", authData.user);
            dispatch(restoreAuth(authData));
          } else {
            //console.log("No valid token found");
          }
        } catch (error) {
          console.error("Failed to restore user:", error);
        }
      }
    };

    restoreUserAuth();
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

  // Effect to reload data when user becomes available
  useEffect(() => {
    const handleUserLoad = async () => {
      if (user) {
        // Check if user object has required ID field
        const hasId = user._id || user.id;

        if (!hasId) {
          //console.log("User object missing ID, attempting to refresh from server...");
          try {
            // Try to refresh user data
            const refreshedAuth = await AuthService.restoreUserFromToken();
            if (
              refreshedAuth &&
              refreshedAuth.user &&
              (refreshedAuth.user._id || refreshedAuth.user.id)
            ) {
              //console.log("Successfully refreshed user data:",refreshedAuth.user);
              dispatch(restoreAuth(refreshedAuth));
              return; // Exit early, the useEffect will run again with new user
            }
          } catch (error) {
            console.error("Failed to refresh user data:", error);
          }
        }

        if (hasId) {
          //console.log("User loaded with ID, reloading shift and trips...");
          //console.log("User object source debug:", {hasId: !!user._id,hasIdField: !!user.id,idValue: user._id || user.id,fullUser: user,});
          loadActiveShift();
          loadAvailableTrips();
        } else {
          //console.log("User object loaded but still missing ID fields afterattempt:",user);
        }
      }
    };

    handleUserLoad();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      // Reload data when screen comes into focus
      if (user) {
        loadActiveShift();
      }
    }, [user])
  );

  const loadActiveShift = async () => {
    try {
      setLoading(true);
      console.log("Loading active shift...");
      const driverId = user?._id || user?.id;
      console.log("Using driver ID for shift loading:", driverId);

      const response = await ShiftService.getActiveShift();
      console.log("Active shift response:", JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        setShift(response.data);

        // Check for active trip (in-progress or paused) - also check available trips
        const trips = response.data.trips || [];
        let activeTrip = trips.find(
          (t) => t.status === "in-progress" || t.status === "paused"
        );

        // If no active trip in shift, check if driver has any in-progress trip
        if (!activeTrip) {
          const response2 = await TripService.getDriverAvailableTrips();
          if (response2.success && response2.data) {
            activeTrip = response2.data.find((trip) => {
              const isAssignedToDriver =
                (trip.drivers &&
                  trip.drivers.some((d) => d._id === driverId)) ||
                (trip.driver && trip.driver._id === driverId);
              return (
                isAssignedToDriver &&
                (trip.status === "in-progress" || trip.status === "paused")
              );
            });
          }
        }

        if (activeTrip) {
          setActiveTrip(activeTrip);
          if (activeTrip.route) {
            setPlannedRoute(activeTrip.route.path || []);
            setNavigationInstructions(activeTrip.route.instructions || []);
          }

          // Load truck data if available
          if (activeTrip.assignedTruck) {
            loadTruckData(activeTrip.assignedTruck);
          }
        } else {
          // If no active trip, fetch available pending trips
          loadAvailableTrips();
        }

        // Load truck data from shift if available
        if (response.data.truck) {
          const truckId =
            typeof response.data.truck === "string"
              ? response.data.truck
              : response.data.truck._id;
          loadTruckData(truckId);
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
        //console.log("No active shift found, loading available trips anyway");
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

  const loadTruckData = async (truckId) => {
    try {
      if (!truckId) return;
      //console.log("Loading truck data for ID:", truckId);

      const response = await TruckService.getTruckById(truckId);
      if (response.success && response.data) {
        setTruckData(response.data);
        //console.log("Truck data loaded:", response.data.registrationNumber);
      }
    } catch (error) {
      console.error("Failed to load truck data:", error);
    }
  };

  const loadAvailableTrips = async () => {
    try {
      //console.log("Loading available trips for driver...");
      // Fetch all trips available for this driver (assigned, pending, planned)
      // Backend automatically filters by driver ID for driver role
      const response = await TripService.getDriverAvailableTrips();
      //console.log("Available trips response:",JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        //console.log("=== TRIP FILTERING DEBUG ===");
        //console.log("Current user object:", JSON.stringify(user, null, 2));
        //console.log("Current driver ID (_id):", user?._id);
        //console.log("Current driver ID (id):", user?.id);
        //console.log("Total trips received:", response.data.length);

        // Check if user is available
        if (!user || (!user._id && !user.id)) {
          //console.log("❌ User not loaded yet - skipping trip filtering");
          setAvailableTrips([]);
          return;
        }

        const driverId = user._id || user.id;
        //console.log("✅ User loaded, proceeding with filtering...");
        //console.log("Using driver ID:", driverId);

        // Filter trips for this driver - include in-progress trips
        const availableTripsData = response.data.filter((trip) => {
          // Check if this driver is assigned to the trip
          let isAssignedToDriver = false;

          // Check drivers array format
          if (trip.drivers && Array.isArray(trip.drivers)) {
            isAssignedToDriver = trip.drivers.some((d) => d._id === driverId);
            //console.log(`Trip ${trip._id.slice(-6)} drivers check:`,trip.drivers.map((d) => d._id),"vs current:",driverId,"match:",isAssignedToDriver);
          }

          // Check legacy driver format
          if (!isAssignedToDriver && trip.driver && trip.driver._id) {
            isAssignedToDriver = trip.driver._id === driverId;
            //console.log(`Trip ${trip._id.slice(-6)} legacy driver check:`,trip.driver._id,"vs current:",driverId,"match:",isAssignedToDriver);
          }

          // Include trips that are not completed/cancelled/expired
          const isValidStatus =
            trip.status !== "completed" &&
            trip.status !== "cancelled" &&
            trip.status !== "expired";

          //console.log(`Trip ${trip._id.slice(-6)} final result:`,"assigned:",isAssignedToDriver,"validStatus:",isValidStatus,"status:",trip.status);

          return isAssignedToDriver && isValidStatus;
        });
        //console.log("Filtered available trips:", availableTripsData.length);
        //console.log("Trip statuses:",availableTripsData.map((t) => ({ id: t._id, status: t.status })));
        setAvailableTrips(availableTripsData);
      } else {
        //console.log("No trips in response or request failed");
        setAvailableTrips([]);
      }
    } catch (error) {
      console.error("Failed to load trips:", error);
    }
  };
  const startTrip = async (tripId) => {
    try {
      setLoading(true);
      //console.log("Starting trip with ID:", tripId);
      const response = await TripService.startTrip(tripId);
      //console.log("Start trip response:", JSON.stringify(response, null, 2));

      if (response.success) {
        const tripData = response.data;

        // Set active trip and navigation data
        setActiveTrip(tripData);

        // Extract and set navigation data if available
        if (tripData.route) {
          //console.log("Setting up navigation with route data:", {pathPoints: tripData.route.path?.length || 0,instructions: tripData.route.instructions?.length || 0,});

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

  const updateTripStatus = async (tripId, newStatus) => {
    try {
      setLoading(true);
      //console.log("Updating trip status:", tripId, newStatus);

      let response;
      if (newStatus === "paused") {
        response = await TripService.pauseTrip(tripId);
      } else if (newStatus === "in-progress") {
        response = await TripService.resumeTrip(tripId);
      } else if (newStatus === "completed") {
        response = await TripService.endTrip(tripId);
      } else {
        throw new Error("Invalid trip status");
      }

      //console.log("Update trip status response:", response);

      if (response.success) {
        // Update the active trip status locally
        if (activeTrip && activeTrip._id === tripId) {
          setActiveTrip({ ...activeTrip, status: newStatus });
        }

        const statusText = {
          paused: "paused",
          "in-progress": "resumed",
          completed: "ended",
        };

        // Send alert to admin about trip status change
        try {
          await NotificationService.notifyTripStatusChange({
            tripId: tripId,
            driverName: user.name || user.username || "Driver",
            truckNumber: truckData?.registrationNumber || "Unknown",
            status:
              statusText[newStatus].charAt(0).toUpperCase() +
              statusText[newStatus].slice(1),
            location: currentLocation,
          });
        } catch (alertError) {
          console.error("Failed to send admin alert:", alertError);
        }

        Toast.show({
          type: "success",
          text1: "Trip Updated",
          text2: `Trip ${statusText[newStatus]}`,
        });

        // Reload shift data to get updated information
        loadActiveShift();
      } else {
        throw new Error(response.message || "Failed to update trip status");
      }
    } catch (error) {
      console.error("Failed to update trip status:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update trip status",
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

          // Update map with current location and bearing if available
          updateCurrentLocationOnMap(latitude, longitude, null);
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
    const diff = Math.max(0, Math.floor((now - start) / 1000)); // Ensure non-negative

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

  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [truckData, setTruckData] = useState(null);

  const breakdownTypes = [
    {
      id: "engine",
      icon: "car-sport",
      title: "Engine Issue",
      severity: "high",
    },
    { id: "tire", icon: "ellipse", title: "Tire Problem", severity: "medium" },
    {
      id: "brake",
      icon: "stop-circle",
      title: "Brake Failure",
      severity: "high",
    },
    {
      id: "electrical",
      icon: "flash",
      title: "Electrical",
      severity: "medium",
    },
    { id: "fuel", icon: "water", title: "Fuel Issue", severity: "medium" },
    {
      id: "transmission",
      icon: "settings",
      title: "Transmission",
      severity: "high",
    },
    {
      id: "steering",
      icon: "refresh-circle",
      title: "Steering",
      severity: "high",
    },
    {
      id: "overheating",
      icon: "thermometer",
      title: "Overheating",
      severity: "high",
    },
    {
      id: "accident",
      icon: "warning",
      title: "Accident",
      severity: "critical",
    },
    { id: "other", icon: "help-circle", title: "Other", severity: "medium" },
  ];

  const handleReportBreakdown = () => {
    setShowBreakdownModal(true);
  };

  const reportBreakdown = async (breakdownType) => {
    try {
      const driverId = user?._id || user?.id;
      if (!currentLocation || !truckData?._id) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Unable to determine location or truck information",
        });
        return;
      }

      const response = await BreakdownService.reportBreakdown({
        truckId: truckData._id,
        shiftId: shift?._id,
        tripId: activeTrip?._id,
        location: {
          coordinates: [currentLocation.longitude, currentLocation.latitude],
          address: "Driver location",
        },
        reportedBy: driverId,
        breakdownType: breakdownType.id,
        description: `${breakdownType.title} reported from driver app`,
        severity: breakdownType.severity,
      });

      if (response.success) {
        // Send alert to admin
        await NotificationService.notifyBreakdown({
          driverName: user.name || user.username || "Driver",
          truckNumber: truckData.registrationNumber,
          breakdownType: breakdownType.title,
          breakdownId: response.data?._id,
          location: currentLocation,
          severity: breakdownType.severity,
        });

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Breakdown reported. Admin has been notified.",
        });
        setShowBreakdownModal(false);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to report breakdown",
        });
      }
    } catch (error) {
      console.error("Breakdown reporting error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to report breakdown",
      });
    }
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

  const updateCurrentLocationOnMap = (latitude, longitude, bearing = null) => {
    const jsCode = `
      if (window.updateCurrentLocation) {
        window.updateCurrentLocation(${latitude}, ${longitude}, ${bearing});
      }
    `;
    if (webViewRef.current) webViewRef.current.injectJavaScript(jsCode);
    if (fullScreenWebViewRef.current)
      fullScreenWebViewRef.current.injectJavaScript(jsCode);
  };

  const toggleMapCompass = () => {
    const jsCode = `
      if (window.toggleCompass) {
        const isEnabled = window.toggleCompass();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('COMPASS_TOGGLED:' + isEnabled);
        }
      }
    `;
    if (webViewRef.current) webViewRef.current.injectJavaScript(jsCode);
    if (fullScreenWebViewRef.current)
      fullScreenWebViewRef.current.injectJavaScript(jsCode);
  };

  const resetMapOrientation = () => {
    const jsCode = `
      if (window.resetMapOrientation) {
        window.resetMapOrientation();
      }
    `;
    if (webViewRef.current) webViewRef.current.injectJavaScript(jsCode);
    if (fullScreenWebViewRef.current)
      fullScreenWebViewRef.current.injectJavaScript(jsCode);
  };

  const updateMapWithRoute = (routePoints) => {
    //console.log("Updating map with route points:", routePoints.length);
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
        currentLocation.longitude,
        null
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
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>3D Map Tracker</title>
  <link href="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js"></script>
  <style>
    body, html { margin:0; padding:0; height:100%; overflow:hidden; }
    #map { position:absolute; top:0; bottom:0; width:100%; }
    
    .marker-current {
      width: 24px;
      height: 24px;
      background-color: #4CAF50;
      border: 4px solid #fff;
      border-radius: 50%;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      cursor: pointer;
      position: relative;
    }
    
    .marker-current::after {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 16px solid #fff;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    }
    
    .marker-start {
      width: 20px;
      height: 20px;
      background-color: #D4AF37;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    .company-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.95);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    
    .compass-toggle {
      position: absolute;
      bottom: 120px;
      right: 10px;
      background: rgba(255,255,255,0.95);
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      font-size: 20px;
      user-select: none;
      transition: transform 0.2s;
    }
    
    .compass-toggle:active {
      transform: scale(0.95);
    }
    
    .compass-toggle.active {
      background: rgba(76, 175, 80, 0.95);
      color: white;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="company-overlay">© KanProkagno Innovation Private Limited</div>
  <div class="compass-toggle" id="compassToggle" title="Toggle Compass Mode">🧭</div>
  
  <script>
    // Initialize MapLibre GL JS map with 3D terrain
    const map = new maplibregl.Map({
      container: 'map',
      center: [${startLon}, ${startLat}],
      zoom: 14,
      pitch: ${MAP_CONFIG.defaultPitch || 60}, // 3D tilt angle
      bearing: 0,
      maxPitch: 85,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19
          },
          terrainSource: {
            type: 'raster-dem',
            url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
            tileSize: 256
          },
          hillshadeSource: {
            type: 'raster-dem',
            url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          },
          {
            id: 'hills',
            type: 'hillshade',
            source: 'hillshadeSource',
            layout: { visibility: 'visible' },
            paint: {
              'hillshade-shadow-color': '#473B24',
              'hillshade-exaggeration': 0.8
            }
          }
        ],
        terrain: {
          source: 'terrainSource',
          exaggeration: ${MAP_CONFIG.mapStyle?.terrain?.exaggeration || 1.5}
        }
      }
    });

    // Add navigation controls with compass
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
      }),
      'top-left'
    );

    // Add terrain control
    map.addControl(
      new maplibregl.TerrainControl({
        source: 'terrainSource',
        exaggeration: ${MAP_CONFIG.mapStyle?.terrain?.exaggeration || 1.5}
      }),
      'top-left'
    );

    // Variables
    let currentMarker = null;
    let startMarker = null;
    let plannedRouteLayer = null;
    let actualRouteLayer = null;
    let compassEnabled = false;
    let lastPosition = null;
    let currentBearing = 0;

    // Add start location marker
    map.on('load', () => {
      const startEl = document.createElement('div');
      startEl.className = 'marker-start';
      
      startMarker = new maplibregl.Marker({ element: startEl })
        .setLngLat([${startLon}, ${startLat}])
        .addTo(map);

      // Signal that map is loaded
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('MAP_LOADED');
      }
    });

    // Update planned route (blue)
    window.updatePlannedRoute = function(route) {
      if (!route || route.length === 0) return;
      
      // Remove existing planned route
      if (map.getLayer('planned-route')) {
        map.removeLayer('planned-route');
      }
      if (map.getSource('planned-route')) {
        map.removeSource('planned-route');
      }
      
      // Convert to GeoJSON LineString format [lon, lat]
      const coordinates = route.map(point => [point.longitude, point.latitude]);
      
      map.addSource('planned-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });
      
      map.addLayer({
        id: 'planned-route',
        type: 'line',
        source: 'planned-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2196F3',
          'line-width': 5,
          'line-opacity': 0.6
        }
      });
      
      // Fit bounds to show full route
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
        
        map.fitBounds(bounds, { padding: 50, duration: 1000 });
      }
    };

    // Update actual route (gold)
    window.updateRoute = function(route) {
      if (!route || route.length === 0) return;
      
      // Remove existing actual route
      if (map.getLayer('actual-route')) {
        map.removeLayer('actual-route');
      }
      if (map.getSource('actual-route')) {
        map.removeSource('actual-route');
      }
      
      // Convert to GeoJSON LineString format [lon, lat]
      const coordinates = route.map(point => [point.longitude, point.latitude]);
      
      map.addSource('actual-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });
      
      map.addLayer({
        id: 'actual-route',
        type: 'line',
        source: 'actual-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#D4AF37',
          'line-width': 4,
          'line-opacity': 1
        }
      });
    };

    // Update current location with bearing
    window.updateCurrentLocation = function(lat, lon, bearing) {
      const newPosition = [lon, lat]; // MapLibre uses [lon, lat]
      
      // Calculate bearing if not provided
      if (lastPosition && bearing === undefined) {
        const lat1 = lastPosition[1] * Math.PI / 180;
        const lat2 = lat * Math.PI / 180;
        const deltaLon = (lon - lastPosition[0]) * Math.PI / 180;
        
        const y = Math.sin(deltaLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
        
        currentBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      } else if (bearing !== undefined) {
        currentBearing = bearing;
      }
      
      // Create or update current location marker
      if (currentMarker) {
        currentMarker.setLngLat(newPosition);
        currentMarker.setRotation(currentBearing);
      } else {
        const currentEl = document.createElement('div');
        currentEl.className = 'marker-current';
        
        currentMarker = new maplibregl.Marker({
          element: currentEl,
          rotationAlignment: 'map',
          pitchAlignment: 'map'
        })
          .setLngLat(newPosition)
          .setRotation(currentBearing)
          .addTo(map);
      }
      
      // Update map view
      if (compassEnabled && currentBearing !== 0) {
        // Smooth compass mode: center on position with bearing rotation
        map.easeTo({
          center: newPosition,
          bearing: currentBearing,
          duration: 500,
          easing: (t) => t
        });
      } else {
        // Simple pan without rotation
        map.easeTo({
          center: newPosition,
          duration: 500
        });
      }
      
      lastPosition = newPosition;
    };

    // Toggle compass mode
    const compassToggle = document.getElementById('compassToggle');
    compassToggle.addEventListener('click', () => {
      compassEnabled = !compassEnabled;
      compassToggle.classList.toggle('active', compassEnabled);
      
      if (!compassEnabled) {
        // Reset bearing to north
        map.easeTo({
          bearing: 0,
          duration: 500
        });
      }
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'COMPASS_TOGGLED',
          enabled: compassEnabled
        }));
      }
    });

    window.toggleCompass = function() {
      compassEnabled = !compassEnabled;
      compassToggle.classList.toggle('active', compassEnabled);
      
      if (!compassEnabled) {
        map.easeTo({
          bearing: 0,
          duration: 500
        });
      }
      
      return compassEnabled;
    };

    // Reset map orientation
    window.resetMapOrientation = function() {
      compassEnabled = false;
      compassToggle.classList.remove('active');
      currentBearing = 0;
      
      map.easeTo({
        bearing: 0,
        pitch: ${MAP_CONFIG.defaultPitch || 60},
        duration: 500
      });
    };

    // Set map pitch (3D tilt)
    window.setMapPitch = function(pitch) {
      map.easeTo({
        pitch: pitch,
        duration: 500
      });
    };

    // Set terrain exaggeration
    window.setTerrainExaggeration = function(exaggeration) {
      map.setTerrain({
        source: 'terrainSource',
        exaggeration: exaggeration
      });
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
                Truck:{" "}
                {truckData?.registrationNumber ||
                  shift.truck?.truckNumber ||
                  "Loading..."}
              </Text>
              {activeTrip && (
                <Text
                  className="text-white text-xs mt-1"
                  style={{ fontFamily: "Poppins" }}
                >
                  ETA:{" "}
                  {activeTrip.estimatedDuration
                    ? formatTime(activeTrip.estimatedDuration)
                    : "Calculating..."}
                </Text>
              )}
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
        <View className="mx-6 mb-4 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden relative">
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
          {/* Map Controls */}
          <View className="absolute bottom-4 right-4 flex-col space-y-2">
            {/* Compass Toggle */}
            <TouchableOpacity
              className="bg-white p-3 rounded-full shadow-md"
              onPress={toggleMapCompass}
            >
              <Ionicons name="compass" size={20} color="#D4AF37" />
            </TouchableOpacity>

            {/* Reset Orientation */}
            <TouchableOpacity
              className="bg-white p-3 rounded-full shadow-md"
              onPress={resetMapOrientation}
            >
              <Ionicons name="refresh" size={20} color="#666" />
            </TouchableOpacity>

            {/* Fullscreen */}
            <TouchableOpacity
              className="bg-white p-3 rounded-full shadow-md"
              onPress={() => setIsFullScreen(true)}
            >
              <Ionicons name="expand" size={20} color="#333" />
            </TouchableOpacity>
          </View>
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

              {/* Trip Status and Controls */}
              <View
                style={{
                  backgroundColor:
                    activeTrip.status === "in-progress" ? "#059669" : "#DC2626",
                  padding: 12,
                  borderRadius: 12,
                  marginTop: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name={
                      activeTrip.status === "in-progress"
                        ? "play-circle"
                        : "pause-circle"
                    }
                    size={24}
                    color="#fff"
                  />
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      marginLeft: 8,
                      fontSize: 16,
                    }}
                  >
                    {activeTrip.status === "in-progress"
                      ? "Trip In Progress"
                      : "Trip Paused"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {activeTrip.status === "in-progress" ? (
                    <TouchableOpacity
                      onPress={() => updateTripStatus(activeTrip._id, "paused")}
                      style={{
                        backgroundColor: "#FBBF24",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="pause" size={16} color="#000" />
                      <Text
                        style={{
                          color: "#000",
                          marginLeft: 4,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Pause
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        updateTripStatus(activeTrip._id, "in-progress")
                      }
                      style={{
                        backgroundColor: "#10B981",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="play" size={16} color="#fff" />
                      <Text
                        style={{
                          color: "#fff",
                          marginLeft: 4,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Resume
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        "End Trip",
                        "Are you sure you want to end this trip?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "End Trip",
                            onPress: () =>
                              updateTripStatus(activeTrip._id, "completed"),
                          },
                        ]
                      )
                    }
                    style={{
                      backgroundColor: "#DC2626",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="stop" size={16} color="#fff" />
                    <Text
                      style={{
                        color: "#fff",
                        marginLeft: 4,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      End
                    </Text>
                  </TouchableOpacity>
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

        {/* Action Buttons */}
        <View className="mx-6 mb-4 flex-row space-x-3">
          <TouchableOpacity
            onPress={handleReportBreakdown}
            className="flex-1 bg-red-600 p-4 rounded-xl flex-row items-center justify-center"
          >
            <Ionicons name="warning" size={20} color="#fff" />
            <Text
              className="text-white font-semibold ml-2"
              style={{ fontFamily: "Poppins" }}
            >
              Report Breakdown
            </Text>
          </TouchableOpacity>
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
        <View className="mx-6 mb-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
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
        <SafeAreaView className="flex-1 bg-gray-50">
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
                      <View className="flex-row items-center">
                        <Text className="font-bold text-gray-800">
                          Trip #{item._id.slice(-6)}
                        </Text>
                        {item.drivers?.length > 1 && (
                          <View className="bg-orange-100 px-2 py-1 rounded-full ml-2">
                            <Text
                              style={{
                                fontFamily: "Poppins",
                                fontSize: 9,
                                color: "#EA580C",
                                fontWeight: "600",
                              }}
                            >
                              {item.drivers.length} DRIVERS
                            </Text>
                          </View>
                        )}
                      </View>
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

      {/* Breakdown Selection Modal */}
      <Modal
        visible={showBreakdownModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBreakdownModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text
                className="text-xl font-bold text-red-600"
                style={{ fontFamily: "Cinzel" }}
              >
                Report Breakdown
              </Text>
              <TouchableOpacity onPress={() => setShowBreakdownModal(false)}>
                <Ionicons name="close-circle" size={32} color="#DC2626" />
              </TouchableOpacity>
            </View>

            <Text
              className="text-gray-600 mb-4"
              style={{ fontFamily: "Poppins" }}
            >
              Select the type of breakdown:
            </Text>

            <View className="flex-row flex-wrap justify-between">
              {breakdownTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => reportBreakdown(type)}
                  className="w-[48%] mb-4 p-4 border border-gray-200 rounded-xl items-center"
                  style={{
                    backgroundColor:
                      type.severity === "critical"
                        ? "#FEF2F2"
                        : type.severity === "high"
                          ? "#FFF7ED"
                          : "#F9FAFB",
                  }}
                >
                  <Ionicons
                    name={type.icon}
                    size={32}
                    color={
                      type.severity === "critical"
                        ? "#DC2626"
                        : type.severity === "high"
                          ? "#EA580C"
                          : "#6B7280"
                    }
                  />
                  <Text
                    className="text-center mt-2 font-semibold"
                    style={{
                      fontFamily: "Poppins",
                      color:
                        type.severity === "critical"
                          ? "#DC2626"
                          : type.severity === "high"
                            ? "#EA580C"
                            : "#374151",
                    }}
                  >
                    {type.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
