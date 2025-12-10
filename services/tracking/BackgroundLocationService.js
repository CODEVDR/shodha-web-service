import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OfflineTrackingService from "./OfflineTrackingService";

const LOCATION_TASK_NAME = "background-location-tracking";

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error);
    return;
  }

  if (data) {
    const { locations } = data;

    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude, altitude, speed, heading, accuracy } =
        location.coords;

      console.log("Background location update:", { latitude, longitude });

      // Get current shift and truck info from async storage
      try {
        const shiftData = await AsyncStorage.getItem("@tracking:activeShift");
        const parsedShift = shiftData ? JSON.parse(shiftData) : null;

        const locationData = {
          latitude,
          longitude,
          accuracy,
          altitude,
          speed,
          heading,
          shiftId: parsedShift?.shiftId || null,
          tripId: parsedShift?.tripId || null,
          truckId: parsedShift?.truckId || null,
        };

        // Use offline tracking service to handle online/offline scenarios
        await OfflineTrackingService.updateLocation(locationData);
      } catch (error) {
        console.error("Failed to update background location:", error);
      }
    }
  }
});

class BackgroundLocationService {
  static isTracking = false;

  /**
   * Check if background location tracking is available
   */
  static async isAvailable() {
    const hasStarted =
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    return hasStarted;
  }

  /**
   * Request necessary permissions for background location
   */
  static async requestPermissions() {
    try {
      // Request foreground location permission
      const foregroundStatus =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus.status !== "granted") {
        return {
          success: false,
          message: "Foreground location permission denied",
        };
      }

      // Request background location permission
      const backgroundStatus =
        await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus.status !== "granted") {
        return {
          success: false,
          message:
            "Background location permission denied. Please enable 'Allow all the time' in settings.",
        };
      }

      return {
        success: true,
        message: "All permissions granted",
      };
    } catch (error) {
      console.error("Permission request error:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Start background location tracking
   */
  static async startTracking(shiftData = {}) {
    try {
      // Check permissions first
      const permissionResult = await this.requestPermissions();

      if (!permissionResult.success) {
        return permissionResult;
      }

      // Store shift data for background task
      if (shiftData.shiftId || shiftData.tripId || shiftData.truckId) {
        await AsyncStorage.setItem(
          "@tracking:activeShift",
          JSON.stringify(shiftData)
        );
      }

      // Check if already tracking
      const hasStarted =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

      if (hasStarted) {
        console.log("Background tracking already started");
        return {
          success: true,
          message: "Already tracking",
        };
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000, // Update every 10 seconds
        distanceInterval: 50, // Or every 50 meters
        foregroundService: {
          notificationTitle: "Shodha Truck Tracking",
          notificationBody:
            "Your location is being tracked for shift management",
          notificationColor: "#D4AF37",
        },
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
      });

      this.isTracking = true;
      console.log("Background tracking started");

      return {
        success: true,
        message: "Background tracking started",
      };
    } catch (error) {
      console.error("Failed to start background tracking:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Stop background location tracking
   */
  static async stopTracking() {
    try {
      const hasStarted =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        this.isTracking = false;

        // Clear shift data
        await AsyncStorage.removeItem("@tracking:activeShift");

        console.log("Background tracking stopped");

        return {
          success: true,
          message: "Background tracking stopped",
        };
      }

      return {
        success: true,
        message: "Tracking was not active",
      };
    } catch (error) {
      console.error("Failed to stop background tracking:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update shift data for background tracking
   */
  static async updateShiftData(shiftData) {
    try {
      await AsyncStorage.setItem(
        "@tracking:activeShift",
        JSON.stringify(shiftData)
      );
      return { success: true };
    } catch (error) {
      console.error("Failed to update shift data:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get current tracking status
   */
  static async getStatus() {
    try {
      const hasStarted =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      const shiftData = await AsyncStorage.getItem("@tracking:activeShift");

      return {
        isTracking: hasStarted,
        shiftData: shiftData ? JSON.parse(shiftData) : null,
      };
    } catch (error) {
      console.error("Failed to get tracking status:", error);
      return {
        isTracking: false,
        shiftData: null,
      };
    }
  }
}

export default BackgroundLocationService;
