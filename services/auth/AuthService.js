import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../utils";
import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";

const extractPayload = (response) => {
  if (
    response &&
    typeof response === "object" &&
    Object.prototype.hasOwnProperty.call(response, "success")
  ) {
    return response;
  }
  return response?.data || response;
};

class AuthService {
  /**
   * Login with username and password
   */
  async login(username, password) {
    try {
      console.log("AuthService.login called with:", {
        username,
        baseURL: API_CONFIG.baseURL,
      });

      const response = await apiClient.post(API_CONFIG.endpoints.auth.login, {
        username,
        password,
      });

      console.log("AuthService.login response:", response);

      const payload = extractPayload(response);

      if (payload.success && payload.data) {
        const { user, token } = payload.data;

        // Store credentials
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(user)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, user.role);

        return {
          user: {
            username: user.username,
            name: user.name,
            email: user.email,
          },
          role: user.role,
          token,
        };
      } else {
        throw new Error(payload.message || "Invalid response from server");
      }
    } catch (error) {
      console.error("AuthService.login error:", error);

      // Provide more detailed error messages
      if (error.code === "ECONNREFUSED" || error.message?.includes("Network")) {
        throw new Error(
          `Cannot connect to server at ${API_CONFIG.baseURL}. Make sure backend is running.`
        );
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const response = await apiClient.post(
        API_CONFIG.endpoints.auth.register,
        userData
      );

      const payload = extractPayload(response);

      if (payload.success && payload.data) {
        const { user, token } = payload.data;

        // Store credentials
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(user)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, user.role);

        return {
          user,
          role: user.role,
          token,
        };
      } else {
        throw new Error(payload.message || "Invalid response from server");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw new Error(error.message || "Registration failed.");
    }
  }

  /**
   * Logout and clear storage
   */
  async logout() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ROLE,
      ]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return !!token;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stored user data
   */
  async getUserData() {
    try {
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (!userDataString || !role || !token) {
        return null;
      }

      const userData = JSON.parse(userDataString);
      return {
        ...userData,
        role,
        token,
      };
    } catch (error) {
      console.error("Get user data error:", error);
      return null;
    }
  }

  /**
   * Refresh user data from server
   */
  async refreshUserData() {
    try {
      const response = await apiClient.get(API_CONFIG.endpoints.auth.me);
      const payload = extractPayload(response);

      if (payload.success && payload.data) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(payload.data)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, payload.data.role);

        return payload.data;
      }

      return null;
    } catch (error) {
      console.error("Refresh user data error:", error);
      return null;
    }
  }

  /**
   * Get auth token
   */
  async getToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user role
   */
  async getUserRole() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    } catch (error) {
      return null;
    }
  }
}

export default new AuthService();
