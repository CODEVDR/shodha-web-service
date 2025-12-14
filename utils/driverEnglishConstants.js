// English language constants for Driver Module
export const DRIVER_ENGLISH = {
  status: {
    active: "Active",
    inactive: "Inactive",
    onBreak: "On Break",
    live: "LIVE",
    ending: "ENDING",
  },
  back: "Back",
  loading: "Loading...",
  error: "Error",
  success: "Success",
  confirm: "Confirm",
  cancel: "Cancel",
  save: "Save",
  edit: "Edit",
  delete: "Delete",
  submit: "Submit",
  required: "Required",
  optional: "Optional",
  driver: "Driver",
  important: "Important",
  infoMessage:
    "Remember to start your shift before beginning any trip. Keep your GPS enabled for accurate tracking.",

  // Toast Messages
  shiftActivated: "Shift Activated!",
  shiftActivatedSuccess: "Shift successfully activated",
  truckAssigned: "Truck",
  cannotActivateShift: "Cannot Activate Shift",
  shiftActivationFailed: "Failed to activate shift",
  shiftEndedSuccess: "Shift ended successfully",
  shiftEndFailed: "Failed to end shift",

  // Dashboard
  dashboard: {
    title: "Driver Dashboard",
    welcomeBack: "Welcome back,",
  },

  // Shift Info Card
  shiftInfo: {
    title: "Shift Information",
    status: "Shift Status",
    type: "Type",
    onDuty: "On Duty",
    offDuty: "Off Duty",
    currentTime: "Current Time:",
    yourActiveShift: "Your Active Shift",
    assignedTruck: "Truck Assigned",
    startedAt: "Started At",
    assignedTrips: "Assigned Trips",
    trips: "Trip(s)",
    noActiveShift: "No active shift",
    activateToStart: "Activate your shift to start working",
    noActiveSchedule: "No Active Shift Period",
    scheduleNote:
      "Contact manager if you don't have any shift period available",
  },

  // Quick Access
  quickAccess: {
    title: "Quick Access",
    activeShift: "Active Shift",
    activeShiftDesc: "View current shift details",
    tripList: "Trip List",
    tripListDesc: "Manage your trips",
    shiftHistory: "Shift History",
    shiftHistoryDesc: "View past shifts",
  },

  // Buttons
  buttons: {
    activateShift: "Activate Shift",
    endShift: "End Shift",
    viewRoute: "View Route & Track",
  },

  // Shift (detailed)
  shift: {
    title: "Shift Status",
    active: "Active Shift",
    activeShift: "Active Shift",
    history: "Shift History",
    currentTime: "Current Time:",
    yourActiveShift: "Your Active Shift",
    truckAssigned: "Truck Assigned",
    startedAt: "Started At",
    assignedTrips: "Assigned Trips",
    trips: "Trips",
    viewRoute: "View Route & Track",
    endShift: "End Shift",
    noActiveShift: "No active shift",
    activateShiftMessage: "Activate your shift to start working",
    activateShift: "Activate Shift",
    noActiveShiftPeriod: "No Active Shift Period",
    duration: "Duration",
    distance: "Distance",
    completed: "Completed",
    onDuty: "On Duty",
    offDuty: "Off Duty",
    onBreak: "On Break",
  },

  // Trip
  trip: {
    title: "Trip Details",
    tripList: "Today's Trips",
    myTrips: "My Trips",
    details: "Trip Details",
    information: "Trip Information",
    startTrip: "Start Trip",
    endTrip: "End Trip",
    completeTrip: "Complete Trip",
    complete: "Complete Trip",
    end: "Complete Trip",
    ending: "ENDING",
    pauseTrip: "Pause Trip",
    resumeTrip: "Resume Trip",
    startLocation: "Start Location",
    endLocation: "End Location",
    truckNumber: "Truck Number",
    startTime: "Start Time",
    endTime: "End Time",
    driver: "Driver",
    distance: "Distance",
    duration: "Duration",
    estimatedDistance: "Estimated Distance",
    estimatedDuration: "Estimated Duration",
    destination: "Destination",
    noTripsScheduled: "No trips scheduled for today",
    assignedGeofences: "Assigned Geofences",
    notes: "Notes",

    status: {
      pending: "Pending",
      inProgress: "In Progress",
      paused: "Paused",
      completed: "Completed",
      cancelled: "Cancelled",
      assigned: "Assigned",
    },

    messages: {
      started: "Trip Started!",
      startedDesc: "Drive safely and follow the route",
      paused: "Trip Paused!",
      pausedDesc: "Trip has been paused successfully",
      resumed: "Trip Resumed!",
      resumedDesc: "Trip has been resumed successfully",
      completed: "Trip Completed",
      completedDesc: "Trip has been completed successfully",
      loadingDetails: "Loading trip details...",
      notFound: "Trip not found",
    },
  },

  // Trips (alternative key)
  trips: {
    title: "My Trips",
    myTrips: "My Trips",
  },

  // History
  history: {
    title: "Shift History",
  },

  // Navigation
  navigation: {
    title: "Navigation",
    opening: "Opening map...",
  },

  // Support
  support: {
    title: "Support",
    calling: "Calling support...",
  },

  // Trip End
  tripEnd: {
    title: "End Trip",
    subtitle: "Please provide trip completion details",
    finalReading: "Final Odometer Reading (km)",
    finalReadingPlaceholder: "Enter final reading",
    notes: "Notes",
    notesOptional: "Notes (Optional)",
    notesPlaceholder: "Any additional notes...",
    summary: "Trip Summary",
    duration: "Duration",
    distance: "Distance",
    complete: "Complete Trip",
    requiredField: "Required Field",
    requiresFinalReading: "Please enter final odometer reading",
  },

  // Breakdown
  breakdown: {
    report: "Report Breakdown",
    details: "Breakdown Details",
    type: "Breakdown Type",
    typePlaceholder: "e.g., Engine failure, Tire puncture, Battery issue...",
    description: "Description",
    descriptionPlaceholder: "Describe the breakdown issue...",
    currentLocation: "Current Location",
    currentLocationOptional: "Current Location (Optional)",
    locationPlaceholder: "Enter your current location...",
    submit: "Report Breakdown",

    messages: {
      reported: "Breakdown Reported",
      reportedDesc: "Your breakdown has been reported successfully",
      cannotReport: "Cannot Report Breakdown",
      notAssigned: "You are not assigned to this trip",
      noTruck: "No truck assigned to this trip",
      invalidStatus: "Cannot report breakdown for trip",
      requiresType: "Please enter breakdown type",
      requiresDescription: "Please enter breakdown description",
      detailsNotLoaded: "Trip details not loaded",
    },
  },

  // Notifications
  notifications: {
    title: "Notifications",
    unread: "unread",
    noNotifications: "No notifications yet",
    noNotificationsDesc: "You'll see trip updates and alerts here",
    markAsRead: "Mark as Read",
    dismiss: "Dismiss",

    types: {
      tripAssigned: "Trip Assigned",
      tripStarted: "Trip Started",
      tripCompleted: "Trip Completed",
      breakdownReported: "Breakdown Reported",
      tripStatusChange: "Trip Status Change",
    },

    time: {
      minutesAgo: "m ago",
      hoursAgo: "h ago",
      daysAgo: "d ago",
    },
  },

  // Auth
  auth: {
    logout: "Logout",
    loggedOut: "Logged Out",
    logoutMessage: "Drive safely! 🚗",
    logoutError: "Failed to logout. Please try again.",
  },

  // Language Selector
  language: {
    title: "Select Language",
    select: "Language",
    english: "English",
    hindi: "Hindi",
    telugu: "Telugu",
    tamil: "Tamil",
  },

  // Messages
  messages: {
    failed: "Failed",
    tryAgain: "Please try again",
    somethingWentWrong: "Something went wrong",
    noInternet: "No internet connection",
    requiredField: "Required Field",
  },
};
