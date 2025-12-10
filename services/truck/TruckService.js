import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";

class TruckService {
  /**
   * Get all trucks
   */
  async getAllTrucks() {
    try {
      return await apiClient.get(API_CONFIG.endpoints.trucks.getAll);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get truck by ID
   */
  async getTruckById(id) {
    try {
      return await apiClient.get(API_CONFIG.endpoints.trucks.getById(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new truck
   */
  async createTruck(truckData) {
    try {
      return await apiClient.post(
        API_CONFIG.endpoints.trucks.create,
        truckData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update truck
   */
  async updateTruck(id, truckData) {
    try {
      return await apiClient.put(
        API_CONFIG.endpoints.trucks.update(id),
        truckData
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update truck location
   */
  async updateTruckLocation(id, latitude, longitude) {
    try {
      return await apiClient.put(
        API_CONFIG.endpoints.trucks.updateLocation(id),
        {
          latitude,
          longitude,
        }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete truck
   */
  async deleteTruck(id) {
    try {
      return await apiClient.delete(API_CONFIG.endpoints.trucks.delete(id));
    } catch (error) {
      throw error;
    }
  }
}

export default new TruckService();
