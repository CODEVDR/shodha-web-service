import apiClient from "../api/apiClient";

const AutoShiftService = {
  /**
   * Get shift schedules and current active shift
   */
  async getShiftSchedules() {
    try {
      return await apiClient.get("/auto-shifts/schedules");
    } catch (error) {
      console.error("Get shift schedules error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch shift schedules",
      };
    }
  },

  /**
   * Driver activates their shift (auto-assigns truck)
   */
  async activateShift() {
    try {
      return await apiClient.post("/auto-shifts/activate");
    } catch (error) {
      console.error("Activate shift error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to activate shift",
      };
    }
  },

  /**
   * Admin manually assigns truck to driver
   */
  async manualAssignTruck(driverId, truckId) {
    try {
      return await apiClient.post("/auto-shifts/manual-assign", {
        driverId,
        truckId,
      });
    } catch (error) {
      console.error("Manual assign truck error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to assign truck",
      };
    }
  },

  /**
   * Get available trucks for assignment
   */
  async getAvailableTrucks() {
    try {
      return await apiClient.get("/auto-shifts/available-trucks");
    } catch (error) {
      console.error("Get available trucks error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch available trucks",
      };
    }
  },

  /**
   * Get all active shift assignments (admin only)
   */
  async getActiveAssignments() {
    try {
      return await apiClient.get("/auto-shifts/active-assignments");
    } catch (error) {
      console.error("Get active assignments error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch active assignments",
      };
    }
  },

  /**
   * Release truck from shift (end shift)
   */
  async releaseShift(shiftId) {
    try {
      return await apiClient.post(`/auto-shifts/release/${shiftId}`);
    } catch (error) {
      console.error("Release shift error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to release shift",
      };
    }
  },

  /**
   * Get driver's current active shift
   */
  async getMyShift() {
    try {
      return await apiClient.get("/auto-shifts/my-shift");
    } catch (error) {
      console.error("Get my shift error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch active shift",
      };
    }
  },
};

export default AutoShiftService;
