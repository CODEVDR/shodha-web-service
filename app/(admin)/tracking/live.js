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
import { useState, useEffect, useRef, useCallback } from "react";
import { TrackingService } from "../../../services";
import { MAP_CONFIG } from "../../../config/mapConfig";
import Toast from "react-native-toast-message";

// Conditionally import WebView only for native platforms
let WebView = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

export default function LiveTracking() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const webViewRef = useRef(null);
  const mapLoadedRef = useRef(false);
  const trucksRef = useRef([]); // Add ref to track trucks without causing rerenders

  // HTML generator for MapLibre GL JS fallback - Simple version
  const generateMapHtml = useCallback((MAP_CONFIG) => {
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
      let map;
      let markers = {};
      
      // Initialize OpenStreetMap
      map = L.map('map').setView([${MAP_CONFIG.defaultCenter?.latitude || 28.6139}, ${MAP_CONFIG.defaultCenter?.longitude || 77.209}], ${MAP_CONFIG.defaultZoom || 10});
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      
      // Signal that map is loaded
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('MAP_LOADED');
      }

      // Function to update truck markers without reloading
      window.updateTrucks = function(trucksData) {
        try {
          const trucks = JSON.parse(trucksData);
          
          // Remove markers for trucks that no longer exist
          Object.keys(markers).forEach(truckId => {
            if (!trucks.find(t => t.id === truckId)) {
              map.removeLayer(markers[truckId]);
              delete markers[truckId];
            }
          });
          
          // Update or create markers for current trucks
          trucks.forEach(t => {
            if (t.latitude && t.longitude) {
              if (markers[t.id]) {
                // Update existing marker position
                markers[t.id].setLatLng([t.latitude, t.longitude]);
                markers[t.id].getPopup().setContent(
                  '<div style="text-align: center;">' +
                    '<strong>' + t.truckNumber + '</strong><br>' +
                    '<small>Status: ' + t.status + '</small>' +
                  '</div>'
                );
              } else {
                // Create new marker
                const truckIcon = L.divIcon({
                  className: 'truck-marker',
                  html: '🚚',
                  iconSize: [28, 28],
                  iconAnchor: [14, 14]
                });
                
                const marker = L.marker([t.latitude, t.longitude], { icon: truckIcon })
                  .bindPopup(
                    '<div style="text-align: center;">' +
                      '<strong>' + t.truckNumber + '</strong><br>' +
                      '<small>Status: ' + t.status + '</small>' +
                    '</div>'
                  )
                  .addTo(map);
                
                markers[t.id] = marker;
              }
            }
          });
          
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage('TRUCKS_UPDATED');
          }
        } catch (error) {
          console.error('Error updating trucks:', error);
        }
      };

      // Function to focus on specific truck
      window.focusTruck = function(truckId) {
        if (markers[truckId]) {
          map.setView(markers[truckId].getLatLng(), 15);
          markers[truckId].openPopup();
        }
      };
    </script>
  </body>
  </html>`;
  }, []);

  useEffect(() => {
    loadTruckLocations();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadTruckLocations(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const updateMapTrucks = useCallback(() => {
    if (!webViewRef.current || !mapLoadedRef.current) return;

    const trucksData = trucksRef.current.map((t) => ({
      id: t._id,
      latitude: t.currentLocation?.latitude || null,
      longitude: t.currentLocation?.longitude || null,
      status: t.status,
      truckNumber: t.truckNumber || t.registrationNumber || "Unknown",
    }));

    const jsCode = `
      if (window.updateTrucks) {
        window.updateTrucks('${JSON.stringify(trucksData).replace(/'/g, "\\'")}');
      }
    `;

    try {
      webViewRef.current.injectJavaScript(jsCode);
    } catch (error) {
      console.error("Error injecting JavaScript:", error);
    }
  }, []); // Empty dependency array - function doesn't depend on state

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

        // Update both state and ref
        trucksRef.current = trucksData;
        setTrucks(trucksData);

        // Update map directly here after loading trucks
        if (mapLoadedRef.current) {
          updateMapTrucks();
        }
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

  const focusOnTruck = useCallback((truck) => {
    if (!webViewRef.current || !truck.currentLocation) return;

    const jsCode = `
      if (window.focusTruck) {
        window.focusTruck('${truck._id}');
      }
    `;
    webViewRef.current.injectJavaScript(jsCode);
  }, []);

  const handleMapMessage = useCallback(
    (event) => {
      const data = event.nativeEvent.data;

      if (data === "MAP_LOADED") {
        console.log("Map loaded successfully");
        mapLoadedRef.current = true;
        // Initial truck load
        if (trucksRef.current.length > 0) {
          updateMapTrucks();
        }
      } else if (data === "TRUCKS_UPDATED") {
        console.log("Trucks updated on map");
      }
    },
    [updateMapTrucks]
  );

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
                srcDoc={generateMapHtml(MAP_CONFIG)}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Live Tracking Map"
              />
            ) : WebView ? (
              // Native: Use WebView with useRef
              <WebView
                ref={webViewRef}
                originWhitelist={["*"]}
                style={{ flex: 1 }}
                source={{ html: generateMapHtml(MAP_CONFIG) }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={handleMapMessage}
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
                WebView ready: {webViewRef.current ? "Yes" : "No"}
              </Text>
              <Text className="text-xs text-yellow-700">
                Map loaded: {mapLoadedRef.current ? "Yes" : "No"}
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
