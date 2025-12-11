import axios from "axios";
import { API_CONFIG } from "../../config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../utils";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

// Request interceptor to add auth token and cache-busting
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log("apiClient interceptor - token found:", token ? "Yes" : "No");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("apiClient interceptor - No token found in AsyncStorage");
      }

      // Add cache-busting headers for all requests
      config.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      config.headers["Pragma"] = "no-cache";
      config.headers["If-None-Match"] = "no-match-for-this";

      // Add timestamp to prevent caching
      if (config.method === "get") {
        const separator = config.url.includes("?") ? "&" : "?";
        config.url = `${config.url}${separator}_t=${Date.now()}`;
      }
    } catch (error) {
      console.error("apiClient interceptor - Error reading token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  // Return response payload while preserving original response reference
  (response) => {
    const payload = response?.data ?? response;
    if (payload && typeof payload === "object") {
      Object.defineProperty(payload, "__rawResponse", {
        value: response,
        enumerable: false,
      });
    }
    return payload;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ROLE,
      ]);
    }
    // Preserve existing behavior for callers expecting error.response?.data
    return Promise.reject(error.response?.data || error);
  }
);

export default apiClient;
