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
  const [mapView3D, setMapView3D] = useState(true);
  const webViewRef = useRef(null);
  const mapLoadedRef = useRef(false);
  const trucksRef = useRef([]);

  // HTML generator for MapLibre GL JS with 3D terrain
  const generateMapHtml = useCallback((MAP_CONFIG) => {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <title>Live Truck Tracking</title>
  <link href="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.js"></script>
  <style>
    body, html { margin:0; padding:0; height:100%; overflow:hidden; }
    #map { position:absolute; top:0; bottom:0; width:100%; }
    
    .truck-marker {
      width: 32px;
      height: 32px;
      background-color: #D4AF37;
      border: 3px solid #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .truck-marker:hover {
      transform: scale(1.1);
    }
    
    .truck-marker.active {
      background-color: #4CAF50;
      animation: pulse 2s infinite;
    }
    
    .truck-marker.maintenance {
      background-color: #FF9800;
    }
    
    @keyframes pulse {
      0%, 100% { box-shadow: 0 3px 8px rgba(0,0,0,0.3); }
      50% { box-shadow: 0 3px 16px rgba(212,175,55,0.6); }
    }
    
    .maplibregl-popup-content {
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .popup-title {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
    }
    
    .popup-info {
      font-size: 12px;
      color: #666;
      margin: 4px 0;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-active {
      background: #E8F5E9;
      color: #2E7D32;
    }
    
    .status-maintenance {
      background: #FFF3E0;
      color: #E65100;
    }
    
    .company-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255,255,255,0.95);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      color: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    
    .view-toggle {
      position: absolute;
      top: 60px;
      right: 10px;
      background: rgba(255,255,255,0.95);
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      font-size: 12px;
      font-weight: 600;
      user-select: none;
      transition: all 0.2s;
    }
    
    .view-toggle:active {
      transform: scale(0.95);
    }
    
    .view-toggle.active {
      background: rgba(212, 175, 55, 0.95);
      color: white;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="company-overlay">© KanProkagno Innovation Private Limited</div>
  <div class="view-toggle" id="viewToggle" title="Toggle 3D View">🗺️ 3D View</div>
  
  <script>
    // Initialize MapLibre GL JS map with 3D terrain
    const map = new maplibregl.Map({
      container: 'map',
      center: [${MAP_CONFIG.defaultCenter?.longitude || 77.209}, ${MAP_CONFIG.defaultCenter?.latitude || 28.6139}],
      zoom: ${MAP_CONFIG.defaultZoom || 5},
      pitch: 60,
      bearing: 0,
      maxPitch: 85,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
            maxzoom: 19
          },
          terrainSource: {
            type: 'raster-dem',
            url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
            tileSize: 256
          },
          hillshadeSource: {
            type: 'raster-dem',
            url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          },
          {
            id: 'hills',
            type: 'hillshade',
            source: 'hillshadeSource',
            layout: { visibility: 'visible' },
            paint: {
              'hillshade-shadow-color': '#473B24',
              'hillshade-exaggeration': 0.8
            }
          }
        ],
        terrain: {
          source: 'terrainSource',
          exaggeration: ${MAP_CONFIG.mapStyle?.terrain?.exaggeration || 1.5}
        }
      }
    });

    // Add navigation controls
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true
      }),
      'top-left'
    );

    // Add terrain control
    map.addControl(
      new maplibregl.TerrainControl({
        source: 'terrainSource',
        exaggeration: ${MAP_CONFIG.mapStyle?.terrain?.exaggeration || 1.5}
      }),
      'top-left'
    );

    // Add scale control
    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }),
      'bottom-left'
    );

    // Variables
    let markers = {};
    let popups = {};
    let is3DView = true;
    let selectedTruckId = null;

    // Toggle 3D view
    const viewToggle = document.getElementById('viewToggle');
    viewToggle.addEventListener('click', () => {
      is3DView = !is3DView;
      viewToggle.classList.toggle('active', is3DView);
      viewToggle.textContent = is3DView ? '🗺️ 3D View' : '🗺️ 2D View';
      
      map.easeTo({
        pitch: is3DView ? 60 : 0,
        duration: 1000
      });
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'VIEW_CHANGED',
          is3D: is3DView
        }));
      }
    });

    // Map loaded event
    map.on('load', () => {
      console.log('Map loaded successfully');
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('MAP_LOADED');
      }
    });

    // Function to create popup content
    function createPopupContent(truck) {
      const statusClass = truck.status === 'active' ? 'status-active' : 'status-maintenance';
      
      return \`
        <div>
          <div class="popup-title">🚚 \${truck.truckNumber}</div>
          <div class="popup-info">
            <span class="status-badge \${statusClass}">\${truck.status}</span>
          </div>
          \${truck.model ? \`<div class="popup-info">Model: \${truck.model}</div>\` : ''}
          \${truck.driver ? \`<div class="popup-info">Driver: \${truck.driver}</div>\` : ''}
          \${truck.timestamp ? \`<div class="popup-info" style="color: #999; font-size: 10px; margin-top: 4px;">Updated: \${new Date(truck.timestamp).toLocaleTimeString()}</div>\` : ''}
        </div>
      \`;
    }

    // Function to update trucks without reloading
    window.updateTrucks = function(trucksData) {
      try {
        const trucks = JSON.parse(trucksData);
        console.log('Updating', trucks.length, 'trucks on map');
        
        // Remove markers for trucks that no longer exist
        Object.keys(markers).forEach(truckId => {
          if (!trucks.find(t => t.id === truckId)) {
            if (markers[truckId]) {
              markers[truckId].remove();
              delete markers[truckId];
            }
            if (popups[truckId]) {
              popups[truckId].remove();
              delete popups[truckId];
            }
          }
        });
        
        // Collect valid coordinates for bounds
        const validCoords = [];
        
        // Update or create markers for current trucks
        trucks.forEach(truck => {
          if (truck.latitude && truck.longitude) {
            const lngLat = [truck.longitude, truck.latitude];
            validCoords.push(lngLat);
            
            if (markers[truck.id]) {
              // Update existing marker
              markers[truck.id].setLngLat(lngLat);
              
              // Update marker style based on status
              const el = markers[truck.id].getElement();
              el.className = 'truck-marker' + (truck.status === 'active' ? ' active' : truck.status === 'maintenance' ? ' maintenance' : '');
              
              // Update popup content
              if (popups[truck.id]) {
                popups[truck.id].setHTML(createPopupContent(truck));
              }
            } else {
              // Create new marker
              const el = document.createElement('div');
              el.className = 'truck-marker' + (truck.status === 'active' ? ' active' : truck.status === 'maintenance' ? ' maintenance' : '');
              el.innerHTML = '🚚';
              el.id = 'marker-' + truck.id;
              
              // Create popup
              const popup = new maplibregl.Popup({
                offset: 25,
                closeButton: true,
                closeOnClick: false
              }).setHTML(createPopupContent(truck));
              
              // Create marker
              const marker = new maplibregl.Marker({
                element: el,
                anchor: 'center'
              })
                .setLngLat(lngLat)
                .setPopup(popup)
                .addTo(map);
              
              // Add click handler
              el.addEventListener('click', () => {
                selectedTruckId = truck.id;
                
                // Close other popups
                Object.keys(popups).forEach(id => {
                  if (id !== truck.id) {
                    popups[id].remove();
                  }
                });
                
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'TRUCK_SELECTED',
                    truckId: truck.id
                  }));
                }
              });
              
              markers[truck.id] = marker;
              popups[truck.id] = popup;
            }
          }
        });
        
        // Fit bounds to show all trucks if we have valid coordinates
        if (validCoords.length > 0 && !selectedTruckId) {
          const bounds = validCoords.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new maplibregl.LngLatBounds(validCoords[0], validCoords[0]));
          
          map.fitBounds(bounds, {
            padding: 80,
            maxZoom: 12,
            duration: 1000
          });
        }
        
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TRUCKS_UPDATED',
            count: trucks.length
          }));
        }
      } catch (error) {
        console.error('Error updating trucks:', error);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ERROR',
            message: error.message
          }));
        }
      }
    };

    // Function to focus on specific truck
    window.focusTruck = function(truckId) {
      if (markers[truckId]) {
        selectedTruckId = truckId;
        const lngLat = markers[truckId].getLngLat();
        
        // Close other popups
        Object.keys(popups).forEach(id => {
          if (id !== truckId) {
            popups[id].remove();
          }
        });
        
        // Open this truck's popup
        if (popups[truckId]) {
          markers[truckId].togglePopup();
        }
        
        // Fly to truck location
        map.flyTo({
          center: lngLat,
          zoom: 15,
          pitch: is3DView ? 60 : 0,
          duration: 1500,
          essential: true
        });
      }
    };

    // Function to clear selection
    window.clearTruckSelection = function() {
      selectedTruckId = null;
      
      // Close all popups
      Object.keys(popups).forEach(id => {
        popups[id].remove();
      });
    };

    // Function to toggle terrain
    window.toggleTerrain = function(enabled) {
      if (enabled) {
        map.setTerrain({
          source: 'terrainSource',
          exaggeration: ${MAP_CONFIG.mapStyle?.terrain?.exaggeration || 1.5}
        });
      } else {
        map.setTerrain(null);
      }
    };

    // Function to set pitch
    window.setMapPitch = function(pitch) {
      map.easeTo({
        pitch: pitch,
        duration: 500
      });
      is3DView = pitch > 30;
      viewToggle.classList.toggle('active', is3DView);
      viewToggle.textContent = is3DView ? '🗺️ 3D View' : '🗺️ 2D View';
    };
  </script>
</body>
</html>`;
  }, []);

  useEffect(() => {
    loadTruckLocations();

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      loadTruckLocations(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const updateMapTrucks = useCallback(() => {
    if (!webViewRef.current || !mapLoadedRef.current) {
      console.log("Map not ready for update");
      return;
    }

    const trucksData = trucksRef.current
      .filter(
        (t) => t.currentLocation?.latitude && t.currentLocation?.longitude
      )
      .map((t) => ({
        id: t._id,
        latitude: t.currentLocation.latitude,
        longitude: t.currentLocation.longitude,
        status: t.status,
        truckNumber: t.truckNumber || t.registrationNumber || "Unknown",
        model: t.model || null,
        driver: t.assignedDriver?.name || null,
        timestamp: t.currentLocation.timestamp || null,
      }));

    console.log("Updating map with", trucksData.length, "trucks");

    const jsCode = `
      if (window.updateTrucks) {
        window.updateTrucks('${JSON.stringify(trucksData).replace(/'/g, "\\'")}');
      }
      true; // Prevents WebView warning
    `;

    try {
      webViewRef.current.injectJavaScript(jsCode);
    } catch (error) {
      console.error("Error injecting JavaScript:", error);
    }
  }, []);

  const loadTruckLocations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      console.log("Loading truck locations...");
      const response = await TrackingService.getAllTruckLocations();

      if (response.success) {
        const trucksData = response.data || [];
        console.log("Loaded", trucksData.length, "trucks");

        // Update both state and ref
        trucksRef.current = trucksData;
        setTrucks(trucksData);

        // Update map
        if (mapLoadedRef.current) {
          updateMapTrucks();
        }
      } else {
        console.error("Failed to get truck locations:", response.message);
        if (!silent) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: response.message || "Failed to load truck locations",
            position: "top",
          });
        }
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
    if (!webViewRef.current || !truck.currentLocation) {
      console.log("Cannot focus - no location for truck:", truck._id);
      return;
    }

    setSelectedTruck(truck._id);

    const jsCode = `
      if (window.focusTruck) {
        window.focusTruck('${truck._id}');
      }
      true;
    `;

    webViewRef.current.injectJavaScript(jsCode);
  }, []);

  const toggleMapView = useCallback(() => {
    if (!webViewRef.current) return;

    const newPitch = mapView3D ? 0 : 60;
    const jsCode = `
      if (window.setMapPitch) {
        window.setMapPitch(${newPitch});
      }
      true;
    `;

    webViewRef.current.injectJavaScript(jsCode);
    setMapView3D(!mapView3D);
  }, [mapView3D]);

  const handleMapMessage = useCallback(
    (event) => {
      const data = event.nativeEvent.data;

      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(data);

        switch (parsed.type) {
          case "TRUCKS_UPDATED":
            console.log("Trucks updated on map:", parsed.count);
            break;
          case "TRUCK_SELECTED":
            setSelectedTruck(parsed.truckId);
            break;
          case "VIEW_CHANGED":
            setMapView3D(parsed.is3D);
            break;
          case "ERROR":
            console.error("Map error:", parsed.message);
            break;
          default:
            console.log("Unknown message type:", parsed.type);
        }
      } catch (e) {
        // Handle string messages
        if (data === "MAP_LOADED") {
          console.log("Map loaded successfully");
          mapLoadedRef.current = true;

          // Initial truck load
          if (trucksRef.current.length > 0) {
            setTimeout(() => updateMapTrucks(), 500);
          }
        }
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
          {/* Map View with controls */}
          <View
            className="bg-white rounded-2xl overflow-hidden mb-6 shadow-sm"
            style={{ height: 450 }}
          >
            {/* Platform-specific map rendering */}
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={generateMapHtml(MAP_CONFIG)}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Live Tracking Map"
              />
            ) : WebView ? (
              <WebView
                ref={webViewRef}
                originWhitelist={["*"]}
                style={{ flex: 1 }}
                source={{ html: generateMapHtml(MAP_CONFIG) }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onMessage={handleMapMessage}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error("WebView error:", nativeEvent);
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="map-outline" size={48} color="#D4AF37" />
                <Text className="text-gray-500 mt-2">Map not available</Text>
              </View>
            )}
          </View>

          {/* Map Controls */}
          <View className="flex-row justify-between items-center mb-4 gap-2">
            <TouchableOpacity
              onPress={toggleMapView}
              className="bg-white px-4 py-3 rounded-xl flex-row items-center shadow-sm"
            >
              <Ionicons
                name={mapView3D ? "cube-outline" : "map-outline"}
                size={20}
                color="#D4AF37"
              />
              <Text
                className="text-gray-700 ml-2 font-medium"
                style={{ fontFamily: "Poppins" }}
              >
                {mapView3D ? "3D View" : "2D View"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedTruck(null);
                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(`
                    if (window.clearTruckSelection) {
                      window.clearTruckSelection();
                    }
                    true;
                  `);
                }
              }}
              className="bg-white px-4 py-3 rounded-xl flex-row items-center shadow-sm"
            >
              <Ionicons name="contract-outline" size={20} color="#D4AF37" />
              <Text
                className="text-gray-700 ml-2 font-medium"
                style={{ fontFamily: "Poppins" }}
              >
                Reset View
              </Text>
            </TouchableOpacity>
          </View>

          {/* Header with refresh */}
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text
                className="text-2xl text-gray-800"
                style={{ fontFamily: "Cinzel" }}
              >
                Live Trucks
              </Text>
              <Text
                className="text-sm text-gray-500 mt-1"
                style={{ fontFamily: "Poppins" }}
              >
                {trucks.filter((t) => t.currentLocation?.latitude).length} /{" "}
                {trucks.length} tracked
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => loadTruckLocations()}
              disabled={refreshing}
              className="bg-[#D4AF37] p-3 rounded-full shadow-sm"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Debug info in development */}
          {__DEV__ && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <Text className="text-yellow-800 font-bold mb-1">Debug Info</Text>
              <Text className="text-xs text-yellow-700">
                Total trucks: {trucks.length}
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
              <Text className="text-xs text-yellow-700">
                Selected truck: {selectedTruck || "None"}
              </Text>
              <Text className="text-xs text-yellow-700">
                Map view: {mapView3D ? "3D" : "2D"}
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
              <Text
                className="text-gray-400 text-sm mt-2 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                Trucks will appear here when they start tracking
              </Text>
            </View>
          ) : (
            trucks.map((truck) => (
              <TouchableOpacity
                key={truck._id}
                className={`bg-white rounded-xl p-5 mb-4 shadow-sm ${
                  selectedTruck === truck._id ? "border-2 border-[#D4AF37]" : ""
                }`}
                onPress={() => focusOnTruck(truck)}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Ionicons
                        name="cube"
                        size={18}
                        color={
                          truck.status === "active" ? "#4CAF50" : "#FF9800"
                        }
                      />
                      <Text
                        className="text-lg text-gray-800 ml-2 font-semibold"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {truck.truckNumber || truck.registrationNumber}
                      </Text>
                    </View>
                    {truck.model && (
                      <Text
                        className="text-sm text-gray-600"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {truck.model}
                      </Text>
                    )}
                    {truck.assignedDriver && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons
                          name="person-circle-outline"
                          size={14}
                          color="#666"
                        />
                        <Text
                          className="text-sm text-gray-600 ml-1"
                          style={{ fontFamily: "Poppins" }}
                        >
                          {truck.assignedDriver.name}
                        </Text>
                      </View>
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
                truck.currentLocation.longitude ? (
                  <>
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="location" size={16} color="#D4AF37" />
                      <Text
                        className="text-xs text-gray-500 ml-2 flex-1"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {truck.currentLocation.latitude.toFixed(6)},{" "}
                        {truck.currentLocation.longitude.toFixed(6)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => focusOnTruck(truck)}
                        className="bg-[#D4AF37] px-3 py-1 rounded-full ml-2"
                      >
                        <Text
                          className="text-white text-xs font-semibold"
                          style={{ fontFamily: "Poppins" }}
                        >
                          View
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {truck.currentLocation.timestamp && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="time-outline" size={16} color="#999" />
                        <Text
                          className="text-xs text-gray-400 ml-2"
                          style={{ fontFamily: "Poppins" }}
                        >
                          Updated:{" "}
                          {new Date(
                            truck.currentLocation.timestamp
                          ).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View className="flex-row items-center mt-2 bg-gray-50 p-2 rounded-lg">
                    <Ionicons name="location-outline" size={16} color="#999" />
                    <Text
                      className="text-xs text-gray-400 ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Location not available
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
