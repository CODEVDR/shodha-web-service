import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";

class TrackingService {
  /**
   * Get all trucks with current location
   */
  async getAllTruckLocations() {
    try {
      return await apiClient.get(API_CONFIG.endpoints.tracking.trucks);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all active trips
   */
  async getActiveTrips() {
    try {
      return await apiClient.get(API_CONFIG.endpoints.tracking.activeTrips);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get trip tracking data
   */
  async getTripTracking(id) {
    try {
      return await apiClient.get(API_CONFIG.endpoints.tracking.trip(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update driver location (single point)
   */
  async updateLocation(locationData) {
    try {
      return await apiClient.post(
        API_CONFIG.endpoints.tracking.updateLocation,
        locationData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Batch update locations (for offline sync)
   */
  async batchUpdateLocations(locations) {
    try {
      return await apiClient.post(
        API_CONFIG.endpoints.tracking.batchUpdateLocation,
        { locations }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get driver route history
   */
  async getDriverRoute(driverId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.startTime) params.append("startTime", options.startTime);
      if (options.endTime) params.append("endTime", options.endTime);
      if (options.limit) params.append("limit", options.limit);

      const queryString = params.toString();
      const url = `${API_CONFIG.endpoints.tracking.driverRoute(driverId)}${
        queryString ? `?${queryString}` : ""
      }`;

      return await apiClient.get(url);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get shift route
   */
  async getShiftRoute(shiftId) {
    try {
      return await apiClient.get(
        API_CONFIG.endpoints.tracking.shiftRoute(shiftId)
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get trip route
   */
  async getTripRoute(tripId) {
    try {
      return await apiClient.get(
        API_CONFIG.endpoints.tracking.tripRoute(tripId)
      );
    } catch (error) {
      throw error;
    }
  }
}

export default new TrackingService();
