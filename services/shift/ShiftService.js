import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";

class ShiftService {
  /**
   * Get all shifts
   */
  async getAllShifts(filters = {}) {
    try {
      return await apiClient.get(API_CONFIG.endpoints.shifts.getAll, {
        params: filters,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get active shift
   */
  async getActiveShift() {
    try {
      return await apiClient.get(API_CONFIG.endpoints.shifts.getActive);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get shift by ID
   */
  async getShiftById(id) {
    try {
      return await apiClient.get(API_CONFIG.endpoints.shifts.getById(id));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start a new shift
   */
  async startShift(shiftData) {
    try {
      return await apiClient.post(API_CONFIG.endpoints.shifts.start, shiftData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * End a shift
   */
  async endShift(id, endData) {
    try {
      return await apiClient.put(API_CONFIG.endpoints.shifts.end(id), endData);
    } catch (error) {
      throw error;
    }
  }
}

export default new ShiftService();
