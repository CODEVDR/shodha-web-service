import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";
import NetInfo from "@react-native-community/netinfo";

const STORAGE_KEYS = {
  OFFLINE_LOCATIONS: "@tracking:offlineLocations",
  LAST_SYNC: "@tracking:lastSync",
  IS_TRACKING: "@tracking:isTracking",
};

class OfflineTrackingService {
  constructor() {
    this.syncInProgress = false;
    this.locationQueue = [];
    this.isOnline = true;
    this.trackingEnabled = false;

    // Monitor network status
    this.unsubscribeNetInfo = null;
    this.initNetworkMonitoring();
  }

  /**
   * Initialize network monitoring
   */
  initNetworkMonitoring() {
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;

      // If we just came back online, sync offline data
      if (wasOffline && this.isOnline) {
        console.log("Network reconnected, syncing offline locations...");
        this.syncOfflineLocations();
      }
    });
  }

  /**
   * Save location to local storage (when offline)
   */
  async saveLocationOffline(locationData) {
    try {
      const existingLocations = await this.getOfflineLocations();
      const newLocation = {
        ...locationData,
        deviceTimestamp: new Date().toISOString(),
        syncStatus: "pending",
      };

      existingLocations.push(newLocation);
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_LOCATIONS,
        JSON.stringify(existingLocations)
      );

      console.log(
        `Location saved offline. Queue size: ${existingLocations.length}`
      );
      return true;
    } catch (error) {
      console.error("Failed to save location offline:", error);
      return false;
    }
  }

  /**
   * Get all offline locations from storage
   */
  async getOfflineLocations() {
    try {
      const locations = await AsyncStorage.getItem(
        STORAGE_KEYS.OFFLINE_LOCATIONS
      );
      return locations ? JSON.parse(locations) : [];
    } catch (error) {
      console.error("Failed to get offline locations:", error);
      return [];
    }
  }

  /**
   * Clear offline locations from storage
   */
  async clearOfflineLocations() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_LOCATIONS);
    } catch (error) {
      console.error("Failed to clear offline locations:", error);
    }
  }

  /**
   * Update driver location (online or offline)
   */
  async updateLocation(locationData) {
    try {
      const netState = await NetInfo.fetch();
      this.isOnline = netState.isConnected;

      if (this.isOnline) {
        // Try to send location to server
        try {
          const response = await apiClient.post(
            API_CONFIG.endpoints.tracking.updateLocation,
            locationData
          );

          // If successful and there are offline locations, sync them
          if (response.success) {
            const offlineCount = await this.getOfflineLocationsCount();
            if (offlineCount > 0) {
              // Trigger sync in background
              this.syncOfflineLocations();
            }
          }

          return response;
        } catch (error) {
          // If API call fails, save offline
          console.warn("Failed to send location online, saving offline");
          await this.saveLocationOffline(locationData);
          return { success: false, offline: true };
        }
      } else {
        // Save to offline storage
        await this.saveLocationOffline(locationData);
        return { success: true, offline: true };
      }
    } catch (error) {
      console.error("Failed to update location:", error);
      throw error;
    }
  }

  /**
   * Sync offline locations to server
   */
  async syncOfflineLocations() {
    if (this.syncInProgress) {
      console.log("Sync already in progress, skipping...");
      return;
    }

    try {
      this.syncInProgress = true;

      const offlineLocations = await this.getOfflineLocations();

      if (offlineLocations.length === 0) {
        console.log("No offline locations to sync");
        return { success: true, syncedCount: 0 };
      }

      console.log(`Syncing ${offlineLocations.length} offline locations...`);

      // Send batch request to server
      const response = await apiClient.post(
        API_CONFIG.endpoints.tracking.batchUpdateLocation,
        {
          locations: offlineLocations,
        }
      );

      if (response.success) {
        // Clear offline storage after successful sync
        await this.clearOfflineLocations();
        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_SYNC,
          new Date().toISOString()
        );

        console.log(
          `Successfully synced ${response.data.syncedCount} locations`
        );
        return response;
      } else {
        console.error("Failed to sync offline locations:", response.message);
        return response;
      }
    } catch (error) {
      console.error("Error syncing offline locations:", error);
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get offline locations count
   */
  async getOfflineLocationsCount() {
    const locations = await this.getOfflineLocations();
    return locations.length;
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime() {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error("Failed to get last sync time:", error);
      return null;
    }
  }

  /**
   * Check if tracking is enabled
   */
  async isTrackingEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.IS_TRACKING);
      return enabled === "true";
    } catch (error) {
      return false;
    }
  }

  /**
   * Enable tracking
   */
  async enableTracking() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IS_TRACKING, "true");
      this.trackingEnabled = true;
    } catch (error) {
      console.error("Failed to enable tracking:", error);
    }
  }

  /**
   * Disable tracking
   */
  async disableTracking() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IS_TRACKING, "false");
      this.trackingEnabled = false;
    } catch (error) {
      console.error("Failed to disable tracking:", error);
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }
}

export default new OfflineTrackingService();
