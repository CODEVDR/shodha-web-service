import Constants from "expo-constants";

// Get API URL from environment variables
const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:5000/api";

export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  endpoints: {
    // Auth endpoints
    auth: {
      login: "/auth/login",
      register: "/auth/register",
      me: "/auth/me",
    },
    // Truck endpoints
    trucks: {
      getAll: "/trucks",
      getById: (id) => `/trucks/${id}`,
      create: "/trucks",
      update: (id) => `/trucks/${id}`,
      updateLocation: (id) => `/trucks/${id}/location`,
      delete: (id) => `/trucks/${id}`,
    },
    // Driver endpoints
    drivers: {
      getAll: "/drivers",
      getById: (id) => `/drivers/${id}`,
      update: (id) => `/drivers/${id}`,
      assignTruck: (id) => `/drivers/${id}/assign-truck`,
    },
    // Shift endpoints
    shifts: {
      getAll: "/shifts",
      getActive: "/shifts/active",
      getById: (id) => `/shifts/${id}`,
      start: "/shifts/start",
      end: (id) => `/shifts/${id}/end`,
    },
    // Trip endpoints
    trips: {
      getAll: "/trips",
      getById: (id) => `/trips/${id}`,
      create: "/trips",
      start: (id) => `/trips/${id}/start`,
      end: (id) => `/trips/${id}/end`,
      track: (id) => `/trips/${id}/track`,
      assign: (id) => `/trips/${id}/assign`,
      reassign: (id) => `/trips/${id}/reassign`,
      cancel: (id) => `/trips/${id}/cancel`,
      navigation: (id) => `/trips/${id}/navigation`,
      setExpiration: (id) => `/trips/${id}/expiration`,
    },
    // Notification endpoints
    notifications: {
      stream: "/notifications/stream",
      send: "/notifications/send",
      status: "/notifications/status",
    },
    // Geofence endpoints
    geofences: {
      getAll: "/geofences",
      getById: (id) => `/geofences/${id}`,
      create: "/geofences",
      check: "/geofences/check",
      update: (id) => `/geofences/${id}`,
      delete: (id) => `/geofences/${id}`,
    },
    // Tracking endpoints
    tracking: {
      trucks: "/tracking/trucks",
      activeTrips: "/tracking/trips/active",
      trip: (id) => `/tracking/trip/${id}`,
      updateLocation: "/tracking/location",
      batchUpdateLocation: "/tracking/location/batch",
      driverRoute: (driverId) => `/tracking/driver/${driverId}/route`,
      shiftRoute: (shiftId) => `/tracking/shift/${shiftId}/route`,
      tripRoute: (tripId) => `/tracking/trip/${tripId}/route`,
    },
  },
};

export default API_CONFIG;
