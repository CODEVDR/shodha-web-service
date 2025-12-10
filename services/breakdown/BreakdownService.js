import apiClient from "../api/apiClient";

class BreakdownService {
  /**
   * Report a breakdown
   */
  async reportBreakdown(breakdownData) {
    try {
      return await apiClient.post("/breakdowns", breakdownData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all breakdowns
   */
  async getAllBreakdowns(status) {
    try {
      const params = status ? { status } : {};
      return await apiClient.get("/breakdowns", { params });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get breakdown by ID
   */
  async getBreakdownById(id) {
    try {
      return await apiClient.get(`/breakdowns/${id}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update breakdown status (Admin only)
   */
  async updateBreakdownStatus(id, status) {
    try {
      return await apiClient.put(`/breakdowns/${id}/status`, {
        status,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new BreakdownService();
