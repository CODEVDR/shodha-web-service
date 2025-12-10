import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
// Conditionally import WebView only for native platforms
let WebView = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}
import { TrackingService, ShiftService } from "../../../services";
import { MAP_CONFIG } from "../../../config/mapConfig";
import Toast from "react-native-toast-message";

export default function EnhancedLiveTracking() {
  const [trucks, setTrucks] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverRoute, setDriverRoute] = useState([]);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const webViewRef = useRef(null);
  const routeWebViewRef = useRef(null);

  useEffect(() => {
    loadTrackingData();

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      loadTrackingData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const loadTrackingData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      // Load trucks and active shifts in parallel
      const [trucksResponse, shiftsResponse] = await Promise.all([
        TrackingService.getAllTruckLocations(),
        ShiftService.getAllShifts({ status: "active" }),
      ]);

      if (trucksResponse.success) {
        setTrucks(trucksResponse.data || []);
      }

      if (shiftsResponse.success) {
        setActiveShifts(shiftsResponse.data || []);
      }
    } catch (error) {
      console.error("Failed to load tracking data:", error);
      if (!silent) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load tracking data",
          position: "top",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const viewDriverRoute = async (shift) => {
    try {
      setSelectedDriver(shift);
      setShowRouteModal(true);
      setDriverRoute([]);

      // Load driver's route
      const response = await TrackingService.getShiftRoute(shift._id);

      if (response.success && response.data) {
        setDriverRoute(response.data);
      } else {
        Toast.show({
          type: "info",
          text1: "No Route Data",
          text2: "No tracking data available for this shift",
        });
      }
    } catch (error) {
      console.error("Failed to load driver route:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load driver route",
      });
    }
  };

  const generateMainMapHtml = () => {
    const trucksData = JSON.stringify(
      (trucks || []).map((t) => ({
        id: t._id,
        latitude: t.currentLocation?.latitude || null,
        longitude: t.currentLocation?.longitude || null,
        status: t.status,
        truckNumber: t.truckNumber,
        driver: t.assignedDriver?.name || "Unassigned",
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
      width:30px; 
      height:30px; 
      display:flex; 
      align-items:center; 
      justify-content:center; 
      color:#fff; 
      font-weight:bold; 
      font-size:18px; 
      border: 2px solid #fff; 
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); 
    }
    .truck-marker.active { background-color:#4CAF50; }
    .truck-marker.maintenance { background-color:#f97316; }
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
    const map = L.map('map').setView([${MAP_CONFIG.defaultCenter.latitude}, ${MAP_CONFIG.defaultCenter.longitude}], ${MAP_CONFIG.defaultZoom});
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    let bounds = [];\n    let hasValidLocation = false;\n\n    trucks.forEach(t => {\n      if (t.latitude && t.longitude) {\n        hasValidLocation = true;\n        \n        const statusClass = t.status || '';\n        const truckIcon = L.divIcon({\n          className: 'truck-marker ' + statusClass,\n          html: '🚚',\n          iconSize: [30, 30],\n          iconAnchor: [15, 15]\n        });\n        \n        const marker = L.marker([t.latitude, t.longitude], { icon: truckIcon })\n          .bindPopup(\n            '<div style=\"text-align: center;\">' +\n              '<strong>' + t.truckNumber + '</strong><br>' +\n              'Driver: ' + t.driver + '<br>' +\n              'Status: ' + t.status +\n            '</div>'\n          )\n          .addTo(map);\n        \n        bounds.push([t.latitude, t.longitude]);\n      }\n    });\n\n    if (hasValidLocation && bounds.length > 0) {\n      map.fitBounds(bounds, { padding: [20, 20] });\n    }\n    \n    // Signal that map is loaded\n    if (window.ReactNativeWebView) {\n      window.ReactNativeWebView.postMessage('MAP_LOADED');\n    }"
  </script>
</body>
</html>`;
  };

  const generateRouteMapHtml = () => {
    if (!driverRoute || driverRoute.length === 0) {
      return `<!doctype html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0; padding:20px; font-family: sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
  <div style="text-align:center; color:#666;">
    <p style="font-size:18px;">Loading route data...</p>
  </div>
</body>
</html>`;
    }

    const routeData = JSON.stringify(driverRoute);
    const startPoint = driverRoute[0];
    const endPoint = driverRoute[driverRoute.length - 1];

    return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>
    body, html { margin:0; padding:0; height:100%; }
    #map { position:absolute; top:0; bottom:0; width:100%; }
    .marker-start { 
      background-color:#4CAF50; 
      border-radius:50%; 
      width:20px; 
      height:20px; 
      border: 3px solid #fff; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.3); 
    }
    .marker-end { 
      background-color:#f44336; 
      border-radius:50%; 
      width:20px; 
      height:20px; 
      border: 3px solid #fff; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.3); 
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
  <div class="company-overlay">\u00a9 KanProkagno Innovation Private Limited</div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const route = ${routeData};
    // Initialize OpenStreetMap
    const map = L.map('map').setView([${startPoint.latitude}, ${startPoint.longitude}], 12);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add route line
    const coordinates = route.map(point => [point.latitude, point.longitude]);
    const routeLine = L.polyline(coordinates, {
      color: '#D4AF37',
      weight: 4,
      opacity: 1
    }).addTo(map);

    // Add start marker
    const startIcon = L.divIcon({
      className: 'marker-start',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    L.marker([${startPoint.latitude}, ${startPoint.longitude}], { icon: startIcon })
      .bindPopup('<strong>Start</strong>')
      .addTo(map);

    // Add end marker
    const endIcon = L.divIcon({
      className: 'marker-end',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    L.marker([${endPoint.latitude}, ${endPoint.longitude}], { icon: endIcon })
      .bindPopup('<strong>Current Location</strong>')
      .addTo(map);

    // Fit bounds to show full route
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [20, 20] });
    }
  </script>
</body>
</html>`;
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
          Loading tracking data...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Main Map View */}
          <View
            className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm"
            style={{ height: 400 }}
          >
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={generateMainMapHtml()}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Enhanced Live Tracking Map"
              />
            ) : WebView ? (
              <WebView
                ref={webViewRef}
                originWhitelist={["*"]}
                style={{ flex: 1 }}
                source={{ html: generateMainMapHtml() }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-500">Map not available</Text>
              </View>
            )}
          </View>

          {/* Header with refresh */}
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text
                className="text-2xl text-gray-800"
                style={{ fontFamily: "Cinzel" }}
              >
                Live Tracking
              </Text>
              <Text
                className="text-sm text-gray-600"
                style={{ fontFamily: "Poppins" }}
              >
                {trucks.length} trucks • {activeShifts.length} active shifts
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => loadTrackingData()}
              disabled={refreshing}
              className="bg-[#D4AF37] p-3 rounded-full"
            >
              <Ionicons
                name={refreshing ? "hourglass" : "refresh"}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Active Shifts List */}
          <Text
            className="text-xl text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Active Drivers
          </Text>

          {activeShifts.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Ionicons name="people-outline" size={64} color="#D4AF37" />
              <Text
                className="text-gray-600 text-lg mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No active shifts found
              </Text>
            </View>
          ) : (
            activeShifts.map((shift) => (
              <View
                key={shift._id}
                className="bg-white rounded-xl p-5 mb-4 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text
                      className="text-lg text-gray-800 mb-1"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {shift.driver?.name || "Unknown Driver"}
                    </Text>
                    <Text
                      className="text-sm text-gray-600"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Truck: {shift.truck?.truckNumber || "N/A"}
                    </Text>
                    <Text
                      className="text-xs text-gray-500 mt-1"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Started:{" "}
                      {shift.startTime
                        ? new Date(shift.startTime).toLocaleTimeString()
                        : "N/A"}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${getStatusBgColor(
                      shift.status
                    )}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${getStatusColor(
                        shift.status
                      )}`}
                      style={{ fontFamily: "Poppins" }}
                    >
                      {shift.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => viewDriverRoute(shift)}
                  className="bg-[#D4AF37] py-3 px-4 rounded-lg flex-row items-center justify-center mt-3"
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text
                    className="text-white ml-2 font-semibold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    View Route
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Route Modal */}
      <Modal
        visible={showRouteModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowRouteModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <View className="flex-1">
              <Text
                className="text-xl text-gray-800"
                style={{ fontFamily: "Cinzel" }}
              >
                Driver Route
              </Text>
              {selectedDriver && (
                <Text
                  className="text-sm text-gray-600"
                  style={{ fontFamily: "Poppins" }}
                >
                  {selectedDriver.driver?.name} •{" "}
                  {selectedDriver.truck?.truckNumber}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowRouteModal(false)}
              className="p-2"
            >
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={generateRouteMapHtml()}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Route Map"
              />
            ) : WebView ? (
              <WebView
                ref={routeWebViewRef}
                originWhitelist={["*"]}
                style={{ flex: 1 }}
                source={{ html: generateRouteMapHtml() }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-500">Route map not available</Text>
              </View>
            )}
          </View>

          {driverRoute.length > 0 && (
            <View className="p-4 bg-gray-50 border-t border-gray-200">
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text
                    className="text-2xl text-gray-800 font-bold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {driverRoute.length}
                  </Text>
                  <Text
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Tracking Points
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    className="text-2xl text-gray-800 font-bold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {(driverRoute.length * 0.05).toFixed(1)} km
                  </Text>
                  <Text
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Est. Distance
                  </Text>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
