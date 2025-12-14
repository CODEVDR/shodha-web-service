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
      // If the server returned a structured error (e.g. { success: false, message: ... }),
      // return that payload so callers can handle business errors properly.
      console.error("Activate shift error:", error.response?.data ?? error);
      if (error.response && error.response.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: error.message || "Failed to activate shift",
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
   * Initialize automatic shift assignments for all drivers
   * @param {string} date - Optional date in YYYY-MM-DD format (defaults to today)
   */
  async initializeShiftAssignments(date = null) {
    try {
      const payload = date ? { date } : {};
      return await apiClient.post("/auto-shifts/initialize", payload);
    } catch (error) {
      console.error("Initialize shift assignments error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to initialize shift assignments",
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
   * @param {string} date - Optional date filter in YYYY-MM-DD format
   */
  async getActiveAssignments(date = null) {
    try {
      const params = date ? { date } : {};
      return await apiClient.get("/auto-shifts/active-assignments", { params });
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
   * Get shifts by date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   */
  async getShiftsByDateRange(startDate, endDate) {
    try {
      return await apiClient.get("/auto-shifts/shifts-by-date-range", {
        params: { startDate, endDate },
      });
    } catch (error) {
      console.error("Get shifts by date range error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to fetch shifts by date range",
      };
    }
  },

  /**
   * Get shifts for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async getShiftsByDate(date) {
    try {
      return await apiClient.get("/auto-shifts/shifts-by-date", {
        params: { date },
      });
    } catch (error) {
      console.error("Get shifts by date error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch shifts by date",
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

  /**
   * Get shift statistics for a date or date range
   * @param {Object} params - Query parameters
   * @param {string} params.date - Single date in YYYY-MM-DD format
   * @param {string} params.startDate - Start date for range query
   * @param {string} params.endDate - End date for range query
   */
  async getShiftStatistics(params = {}) {
    try {
      return await apiClient.get("/auto-shifts/statistics", { params });
    } catch (error) {
      console.error("Get shift statistics error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch shift statistics",
      };
    }
  },

  /**
   * Reassign driver to different shift for a specific date
   * @param {string} driverId - Driver ID
   * @param {string} shiftType - Shift type (morning, afternoon, night)
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async reassignDriverShift(driverId, shiftType, date) {
    try {
      return await apiClient.post("/auto-shifts/reassign", {
        driverId,
        shiftType,
        date,
      });
    } catch (error) {
      console.error("Reassign driver shift error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to reassign driver shift",
      };
    }
  },
};

export default AutoShiftService;
