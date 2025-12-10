export const ROLES = {
  ADMIN: "admin",
  DRIVER: "driver",
};

export const PERMISSIONS = {
  VIEW_LIVE_TRACKING: "view_live_tracking",
  MANAGE_GEOFENCE: "manage_geofence",
  MANAGE_FLEET: "manage_fleet",
  START_TRIP: "start_trip",
  END_TRIP: "end_trip",
  VIEW_OWN_TRIPS: "view_own_trips",
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_LIVE_TRACKING,
    PERMISSIONS.MANAGE_GEOFENCE,
    PERMISSIONS.MANAGE_FLEET,
  ],
  [ROLES.DRIVER]: [
    PERMISSIONS.START_TRIP,
    PERMISSIONS.END_TRIP,
    PERMISSIONS.VIEW_OWN_TRIPS,
  ],
};
