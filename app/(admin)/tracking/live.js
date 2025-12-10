import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { TrackingService } from "../../../services";
import { MAP_CONFIG } from "../../../config/mapConfig";
import Toast from "react-native-toast-message";

// Conditionally import WebView only for native platforms
let WebView = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

// MapLibre native module not available in Expo Go — will use WebView MapLibre GL JS

export default function LiveTracking() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [webViewRef, setWebViewRef] = useState(null);

  // HTML generator for MapLibre GL JS fallback - Simple version
  function generateMapHtml(trucks = [], MAP_CONFIG) {
    const trucksData = JSON.stringify(
      (trucks || []).map((t) => ({
        id: t._id,
        latitude: t.currentLocation?.latitude || null,
        longitude: t.currentLocation?.longitude || null,
        status: t.status,
        truckNumber: t.truckNumber || t.registrationNumber || "Unknown",
      }))
    );

    return `<!doctype html>
  <html>
  <head>
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
    <style>
      body, html { margin:0; padding:0; height:100%; }
      #map { position:absolute; top:0; bottom:0; width:100%; }
      .truck-marker { 
        background-color:#D4AF37; 
        border-radius:50%; 
        width:28px; 
        height:28px; 
        display:flex; 
        align-items:center; 
        justify-content:center; 
        color:#fff; 
        font-weight:bold;
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
    <div class="company-overlay">© KanProkagno Innovation Private Limited</div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const trucks = ${trucksData};
      // Initialize OpenStreetMap
      const map = L.map('map').setView([${MAP_CONFIG.defaultCenter?.latitude || 28.6139}, ${MAP_CONFIG.defaultCenter?.longitude || 77.209}], ${MAP_CONFIG.defaultZoom || 10});
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      
      // Add truck markers
      trucks.forEach(t => {
        if (t.latitude && t.longitude) {
          const truckIcon = L.divIcon({
            className: 'truck-marker',
            html: '🚚',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          
          const marker = L.marker([t.latitude, t.longitude], { icon: truckIcon })
            .bindPopup(
              '<div style=\"text-align: center;\">' +\n                '<strong>' + t.truckNumber + '</strong><br>' +\n                '<small>Status: ' + t.status + '</small>' +\n              '</div>'\n            )
            .addTo(map);
        }
      });
      
      // Signal that map is loaded (for React Native WebView)
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('MAP_LOADED');
      }

      // Global function to update trucks from React Native
      window.updateTrucks = function(newTrucks) {
        console.log('Updating trucks:', newTrucks);
        // Simple implementation - just reload the page content
        location.reload();
      };
    </script>
  </body>
  </html>`;
  }

  useEffect(() => {
    loadTruckLocations();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadTruckLocations(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Update map when trucks change
  useEffect(() => {
    if (trucks.length > 0 && webViewRef) {
      updateMapTrucks();
    }
  }, [trucks, webViewRef]);

  const loadTruckLocations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      console.log("Loading truck locations...");
      const response = await TrackingService.getAllTruckLocations();
      console.log(
        "Truck locations response:",
        JSON.stringify(response, null, 2)
      );

      if (response.success) {
        const trucksData = response.data || [];
        console.log("Setting trucks data:", trucksData.length, "trucks");
        setTrucks(trucksData);
      } else {
        console.error("Failed to get truck locations:", response.message);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to load truck locations",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to load truck locations:", error);
      if (!silent) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load truck locations",
          position: "top",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateMapTrucks = () => {
    // Simple implementation - just refresh the WebView to show updated trucks
    if (webViewRef) {
      webViewRef.reload();
    }
  };

  const focusOnTruck = (truck) => {
    if (!webViewRef || !truck.currentLocation) return;

    const jsCode = `
      if (window.focusTruck) {
        window.focusTruck('${truck._id}');
      }
    `;
    webViewRef.injectJavaScript(jsCode);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "maintenance":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100";
      case "maintenance":
        return "bg-orange-100";
      default:
        return "bg-gray-100";
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="text-gray-600 mt-4" style={{ fontFamily: "Poppins" }}>
          Loading truck locations...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Map View */}
          <View
            className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm"
            style={{ height: 400 }}
          >
            {/* Platform-specific map rendering */}
            {Platform.OS === "web" ? (
              // Web: Use iframe with srcdoc
              <iframe
                srcDoc={generateMapHtml(trucks, MAP_CONFIG)}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Live Tracking Map"
              />
            ) : WebView ? (
              // Native: Use WebView
              <WebView
                ref={(ref) => setWebViewRef(ref)}
                originWhitelist={["*"]}
                style={{ flex: 1 }}
                source={{ html: generateMapHtml(trucks, MAP_CONFIG) }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={(event) => {
                  if (event.nativeEvent.data === "MAP_LOADED") {
                    console.log("Map loaded successfully");
                    updateMapTrucks();
                  }
                }}
              />
            ) : (
              // Fallback
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-500">Map not available</Text>
              </View>
            )}
          </View>

          {/* Header with refresh */}
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className="text-2xl text-gray-800"
              style={{ fontFamily: "Cinzel" }}
            >
              Active Trucks ({trucks.length})
            </Text>
            <TouchableOpacity
              onPress={() => loadTruckLocations()}
              disabled={refreshing}
              className="bg-[#D4AF37] p-3 rounded-full"
            >
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Debug info in development */}
          {__DEV__ && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <Text className="text-yellow-800 font-bold mb-1">Debug Info</Text>
              <Text className="text-xs text-yellow-700">
                Trucks loaded: {trucks.length}
              </Text>
              <Text className="text-xs text-yellow-700">
                Trucks with location:{" "}
                {
                  trucks.filter(
                    (t) =>
                      t.currentLocation?.latitude &&
                      t.currentLocation?.longitude
                  ).length
                }
              </Text>
              <Text className="text-xs text-yellow-700">
                WebView ready: {webViewRef ? "Yes" : "No"}
              </Text>
            </View>
          )}

          {/* Trucks List */}
          {trucks.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Ionicons name="car-outline" size={64} color="#D4AF37" />
              <Text
                className="text-gray-600 text-lg mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No active trucks found
              </Text>
            </View>
          ) : (
            trucks.map((truck) => (
              <TouchableOpacity
                key={truck._id}
                className="bg-white rounded-xl p-5 mb-4 shadow-sm"
                onPress={() => focusOnTruck(truck)}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text
                      className="text-lg text-gray-800 mb-1"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {truck.truckNumber}
                    </Text>
                    <Text
                      className="text-sm text-gray-600"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {truck.model || "Model N/A"}
                    </Text>
                    {truck.assignedDriver && (
                      <Text
                        className="text-sm text-gray-600 mt-1"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Driver: {truck.assignedDriver.name}
                      </Text>
                    )}
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${getStatusBgColor(
                      truck.status
                    )}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${getStatusColor(
                        truck.status
                      )}`}
                      style={{ fontFamily: "Poppins" }}
                    >
                      {truck.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {truck.currentLocation &&
                  truck.currentLocation.latitude &&
                  truck.currentLocation.longitude && (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="location" size={16} color="#D4AF37" />
                      <Text
                        className="text-xs text-gray-500 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {truck.currentLocation.latitude.toFixed(6)},{" "}
                        {truck.currentLocation.longitude.toFixed(6)}
                      </Text>
                    </View>
                  )}

                {truck.currentLocation?.timestamp && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="time" size={16} color="#D4AF37" />
                    <Text
                      className="text-xs text-gray-500 ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Last updated:{" "}
                      {new Date(
                        truck.currentLocation.timestamp
                      ).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
