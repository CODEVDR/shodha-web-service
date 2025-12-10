import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";

class TripService {
  /**
   * Get all trips
   * @param {string|string[]} status - Single status or array of statuses
   */
  async getAllTrips(status) {
    try {
      let params = {};
      if (status) {
        // Support array of statuses joined by comma
        params.status = Array.isArray(status) ? status.join(",") : status;
      }
      return await apiClient.get(API_CONFIG.endpoints.trips.getAll, {
        params,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available trips for driver (assigned or pending to this driver)
   */
  async getDriverAvailableTrips() {
    try {
      // Get trips that are assigned or pending
      return await apiClient.get(API_CONFIG.endpoints.trips.getAll, {
        params: { status: "assigned,pending,planned,in-progress" },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get trip by ID
   */
  async getTripById(id) {
    try {
      return await apiClient.get(API_CONFIG.endpoints.trips.getById(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new trip
   */
  async createTrip(tripData) {
    try {
      return await apiClient.post(API_CONFIG.endpoints.trips.create, tripData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start a trip
   */
  async startTrip(id) {
    try {
      return await apiClient.put(API_CONFIG.endpoints.trips.start(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * End a trip
   */
  async endTrip(id) {
    try {
      return await apiClient.put(API_CONFIG.endpoints.trips.end(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pause a trip
   */
  async pauseTrip(id) {
    try {
      return await apiClient.put(API_CONFIG.endpoints.trips.pause(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resume a paused trip
   */
  async resumeTrip(id) {
    try {
      return await apiClient.put(API_CONFIG.endpoints.trips.resume(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Track location during trip
   */
  async trackLocation(id, locationData) {
    try {
      return await apiClient.put(
        API_CONFIG.endpoints.trips.track(id),
        locationData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update trip
   */
  async updateTrip(id, tripData) {
    try {
      return await apiClient.put(`/trips/${id}`, tripData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete trip
   */
  async deleteTrip(id) {
    try {
      return await apiClient.delete(`/trips/${id}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign trip to a driver (Admin only)
   */
  async assignTrip(id, assignData) {
    try {
      return await apiClient.put(
        API_CONFIG.endpoints.trips.assign(id),
        assignData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign trip to multiple drivers (Admin only)
   */
  async assignTripToMultipleDrivers(id, driverIds, additionalData = {}) {
    try {
      return await apiClient.put(API_CONFIG.endpoints.trips.assign(id), {
        driverIds,
        ...additionalData,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reassign trip to another driver (Admin only)
   */
  async reassignTrip(id, reassignData) {
    try {
      return await apiClient.put(
        API_CONFIG.endpoints.trips.reassign(id),
        reassignData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a trip (Admin only)
   */
  async cancelTrip(id, reason) {
    try {
      return await apiClient.put(API_CONFIG.endpoints.trips.cancel(id), {
        reason,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get real-time navigation update for a trip
   */
  async getNavigation(id, latitude, longitude) {
    try {
      return await apiClient.get(
        `${API_CONFIG.endpoints.trips.navigation(id)}?latitude=${latitude}&longitude=${longitude}`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set trip expiration (Admin only)
   */
  async setExpiration(id, expirationData) {
    try {
      return await apiClient.put(
        API_CONFIG.endpoints.trips.setExpiration(id),
        expirationData
      );
    } catch (error) {
      throw error;
    }
  }
}

export default new TripService();
