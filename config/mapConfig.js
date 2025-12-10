export const MAP_CONFIG = {
  defaultCenter: {
    latitude: 20.5937,
    longitude: 78.9629, // India center
  },
  defaultZoom: 5,
  // GraphHopper/MapLibre tile server
  tileServer:
    "https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
  // Alternative free tile servers
  osmTileServer: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

  // Map style configuration for MapLibre
  mapStyle: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },

  // India bounds for restricting map view
  indiaBounds: {
    northeast: { latitude: 35.5, longitude: 97.4 },
    southwest: { latitude: 6.7, longitude: 68.1 },
  },
};

export default MAP_CONFIG;
