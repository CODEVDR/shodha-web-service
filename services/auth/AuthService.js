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
          user,
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

  /**
   * Decode JWT token to extract user info
   */
  decodeToken(token) {
    try {
      if (!token) return null;

      // Split the JWT token
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      // Decode the payload (middle part)
      const payload = parts[1];
      const decodedPayload = atob(payload);
      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error("Failed to decode token:", error);
      return null;
    }
  }

  /**
   * Restore user state from token
   */
  async restoreUserFromToken() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return null;

      // Decode token first to get user ID
      const decodedToken = this.decodeToken(token);

      // First try to get stored user data
      const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userDataString) {
        let userData = JSON.parse(userDataString);
        console.log(
          "AuthService.restoreUserFromToken - stored user data:",
          userData
        );

        // If stored user data is missing _id, try to refresh from server
        if (!userData._id) {
          console.log(
            "Stored user data missing _id, attempting to refresh from server..."
          );
          try {
            const refreshedUser = await this.refreshUserData();
            if (refreshedUser) {
              console.log("Successfully refreshed user data from server");
              return {
                user: refreshedUser,
                role: refreshedUser.role,
                token,
              };
            }
          } catch (error) {
            console.log("Could not refresh user data, using token data");
          }

          // Fallback: add _id from token if available
          if (decodedToken?.id) {
            userData._id = decodedToken.id;
            await AsyncStorage.setItem(
              STORAGE_KEYS.USER_DATA,
              JSON.stringify(userData)
            );
          }
        }

        return {
          user: userData,
          role: userData.role,
          token,
        };
      }

      // If no stored user data, decode from token and fetch from server
      if (decodedToken && decodedToken.id) {
        try {
          // Try to refresh user data from server
          const refreshedUser = await this.refreshUserData();
          if (refreshedUser) {
            return {
              user: refreshedUser,
              role: refreshedUser.role,
              token,
            };
          }
        } catch (error) {
          console.log("Could not refresh user data, using token data");
        }

        // Fallback: create minimal user object from token
        const userData = {
          _id: decodedToken.id,
          role: decodedToken.role,
        };

        // Store the minimal user data
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(userData)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, decodedToken.role);

        return {
          user: userData,
          role: decodedToken.role,
          token,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to restore user from token:", error);
      return null;
    }
  }
}

export default new AuthService();
