export const MAP_CONFIG = {
  defaultCenter: {
    latitude: 20.5937,
    longitude: 78.9629, // India center
  },
  defaultZoom: 5,
  defaultPitch: 60, // Tilt for 3D view (0-60 degrees)
  defaultBearing: 0, // Rotation angle

  // GraphHopper API configuration
  graphhopper: {
    apiKey: "YOUR_GRAPHHOPPER_API_KEY",
    baseUrl: "https://graphhopper.com/api/1",
  },

  // India bounds for restricting map view
  indiaBounds: {
    northeast: { latitude: 35.5, longitude: 97.4 },
    southwest: { latitude: 6.7, longitude: 68.1 },
  },

  // MapLibre 3D terrain style configuration
  mapStyle: {
    version: 8,
    sources: {
      // Base map tiles
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },

      // 3D Terrain elevation data (DEM)
      terrainSource: {
        type: "raster-dem",
        url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
        tileSize: 256,
      },

      // Alternative: MapTiler terrain (requires API key)
      // terrainSource: {
      //   type: "raster-dem",
      //   url: "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=YOUR_MAPTILER_KEY",
      //   tileSize: 256,
      // },
    },

    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },

      // Optional: Hillshade layer for better 3D visualization
      {
        id: "hillshade",
        type: "hillshade",
        source: "terrainSource",
        layout: { visibility: "visible" },
        paint: {
          "hillshade-shadow-color": "#473B24",
          "hillshade-illumination-direction": 315,
          "hillshade-exaggeration": 0.8,
        },
      },
    ],

    // Enable 3D terrain
    terrain: {
      source: "terrainSource",
      exaggeration: 1.5, // Vertical exaggeration for better visualization
    },
  },
};

export default MAP_CONFIG;
