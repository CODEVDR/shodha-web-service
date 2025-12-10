import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";
import Toast from "react-native-toast-message";
import { GeofenceService } from "../../../services";
import LocationAutocomplete from "../../components/LocationAutocomplete";

// Conditionally import WebView only for native platforms
let WebView = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

export default function CreateGeofence() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState("500");
  const [selectedLocation, setSelectedLocation] = useState(null);

  const defaultRegion = {
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 15,
    longitudeDelta: 15,
  };

  const mapRegion = useMemo(() => {
    if (!selectedLocation) return defaultRegion;

    const radiusKm = parseInt(radius) / 1000 || 0.5;
    const latDelta = (radiusKm / 111) * 2.5;
    const lngDelta = latDelta;

    return {
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [selectedLocation, radius]);

  const generateMapHtml = () => {
    const centerLat = selectedLocation?.latitude || defaultRegion.latitude;
    const centerLon = selectedLocation?.longitude || defaultRegion.longitude;
    const radiusValue = parseInt(radius) || 500;

    return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>
    body, html { margin:0; padding:0; height:100%; }
    #map { position:absolute; top:0; bottom:0; width:100%; }
    .geofence-marker {
      background-color: #D4AF37;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      border: 2px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .company-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.9);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      color: #333;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
    }
  </style>
  <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet" />
</head>
<body>
  <div id="map"></div>
  <div class="company-overlay">&copy; KanProkagno Innovation Private Limited</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Initialize OpenStreetMap
    const map = L.map('map').setView([${centerLat}, ${centerLon}], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    ${
      selectedLocation
        ? `
      // Add geofence center marker
      const centerIcon = L.divIcon({
        className: 'geofence-marker',
        html: '📍',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      L.marker([${centerLat}, ${centerLon}], { icon: centerIcon })
        .bindPopup('<strong>Geofence Center</strong><br>Selected Location')
        .addTo(map);
      
      // Add geofence circle
      L.circle([${centerLat}, ${centerLon}], {
        color: 'rgba(16, 185, 129, 0.8)',
        fillColor: 'rgba(16, 185, 129, 0.2)',
        fillOpacity: 0.2,
        radius: ${radiusValue}
      }).addTo(map);
    `
        : ""
    }
    
    // Signal that map is loaded
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('MAP_LOADED');
    }
  </script>
</body>
</html>`;
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter geofence name",
      });
      return;
    }

    if (!selectedLocation) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please select a location for the geofence center",
      });
      return;
    }

    if (!radius.trim() || parseInt(radius) <= 0) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter a valid radius greater than 0",
      });
      return;
    }

    try {
      setLoading(true);

      const centerPoint = {
        type: "Point",
        coordinates: [selectedLocation.longitude, selectedLocation.latitude],
      };

      const response = await GeofenceService.createGeofence({
        name: name.trim(),
        type: "circular",
        centerPoint,
        radiusMeters: parseInt(radius),
        address: selectedLocation.name,
      });

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Geofence created successfully!",
        });
        router.back();
      } else {
        throw new Error(response.message || "Failed to create geofence");
      }
    } catch (error) {
      console.error("Error creating geofence:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to create geofence. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Map component with OpenStreetMap support
  const renderMap = () => {
    return (
      <View style={{ width: "100%", height: 300 }}>
        {Platform.OS === "web" ? (
          <iframe
            srcDoc={generateMapHtml()}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Geofence Map"
          />
        ) : WebView ? (
          <WebView
            source={{ html: generateMapHtml() }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={(event) => {
              if (event.nativeEvent.data === "MAP_LOADED") {
                console.log("Geofence map loaded successfully");
              }
            }}
          />
        ) : (
          <View
            className="bg-gray-100 rounded-2xl p-8 items-center justify-center"
            style={{ height: 300 }}
          >
            <Ionicons name="map-outline" size={64} color="#9CA3AF" />
            <Text
              className="text-gray-500 mt-4 text-center"
              style={{ fontFamily: "Poppins" }}
            >
              Map not available
            </Text>
            {selectedLocation && (
              <View className="mt-4 text-center">
                <Text
                  className="text-gray-700 text-sm font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  Selected Location:
                </Text>
                <Text
                  className="text-gray-600 text-sm"
                  style={{ fontFamily: "Poppins" }}
                >
                  {selectedLocation.latitude.toFixed(6)},{" "}
                  {selectedLocation.longitude.toFixed(6)}
                </Text>
                <Text
                  className="text-green-600 text-sm mt-2 font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  Radius: {(parseInt(radius) / 1000).toFixed(2)} km
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={{ padding: 24 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 16, padding: 8 }}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: "Cinzel",
                fontSize: 24,
                color: "#1F2937",
                flex: 1,
              }}
            >
              Create Geofence
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 24 }}>
            {/* Name Input */}
            <View>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Geofence Name *
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: "#1F2937",
                  fontFamily: "Poppins",
                }}
                placeholder="Enter geofence name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            {/* Location Selection */}
            <View>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Center Location *
              </Text>
              <LocationAutocomplete
                onLocationSelect={setSelectedLocation}
                placeholder="Search for location..."
                disabled={loading}
              />
            </View>

            {/* Radius Input */}
            <View>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Radius (meters) *
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: "#1F2937",
                  fontFamily: "Poppins",
                }}
                placeholder="500"
                placeholderTextColor="#9CA3AF"
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            {/* Map Preview */}
            <View>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Map Preview
              </Text>
              <View style={{ height: 300 }}>{renderMap()}</View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={{
                backgroundColor: "#D4AF37",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
              }}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    fontFamily: "Poppins",
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  Create Geofence
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
