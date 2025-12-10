import apiClient from "../api/apiClient";
import { API_CONFIG } from "../../config/apiConfig";

// services/GeofenceService.js
class GeofenceService {
  /**
   * Create circular geofence without GraphHopper Isochrone
   */
  async createGeofence(data) {
    try {
      const { name, centerPoint, radiusMeters, type } = data;

      // Create circular polygon locally
      const geofenceData = {
        name,
        type: "circular",
        center: centerPoint,
        radius: radiusMeters,
        coordinates: this.createCircularPolygon(
          centerPoint.coordinates[1], // latitude
          centerPoint.coordinates[0], // longitude
          radiusMeters / 1000 // convert to km
        ),
        address: data.address,
        active: true,
      };

      const response = await apiClient.post("/geofences", geofenceData);
      return response.data;
    } catch (error) {
      console.error("Create geofence error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create geofence",
      };
    }
  }

  /**
   * Create circular polygon coordinates
   */
  createCircularPolygon(lat, lng, radiusKm, points = 64) {
    const coordinates = [];
    const earthRadius = 6371; // km

    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const angleRad = (angle * Math.PI) / 180;

      const latRad = (lat * Math.PI) / 180;

      const newLat =
        Math.asin(
          Math.sin(latRad) * Math.cos(radiusKm / earthRadius) +
            Math.cos(latRad) *
              Math.sin(radiusKm / earthRadius) *
              Math.cos(angleRad)
        ) *
        (180 / Math.PI);

      const newLng =
        ((lng * Math.PI) / 180 +
          Math.atan2(
            Math.sin(angleRad) *
              Math.sin(radiusKm / earthRadius) *
              Math.cos(latRad),
            Math.cos(radiusKm / earthRadius) -
              Math.sin(latRad) * Math.sin((newLat * Math.PI) / 180)
          )) *
        (180 / Math.PI);

      coordinates.push([newLng, newLat]);
    }

    return {
      type: "Polygon",
      coordinates: [coordinates],
    };
  }
}

export default new GeofenceService();
