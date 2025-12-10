import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";

class ShiftScheduleService {
  /**
   * Get all shift schedules
   */
  async getAllShiftSchedules() {
    try {
      return await apiClient.get("/shift-schedules");
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get shift schedule by ID
   */
  async getShiftScheduleById(id) {
    try {
      return await apiClient.get(`/shift-schedules/${id}`);
    } catch (error) {
      throw error;
    }
  }
}

export default new ShiftScheduleService();
