// Language constants for bilingual support (English/Hindi)
export const LANGUAGES = {
  ENGLISH: "en",
  HINDI: "hi",
};

export const TRANSLATIONS = {
  // Common
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  settings: { en: "Settings", hi: "सेटिंग्स" },
  logout: { en: "Logout", hi: "लॉग आउट" },
  submit: { en: "Submit", hi: "जमा करें" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  save: { en: "Save", hi: "सहेजें" },
  back: { en: "Back", hi: "वापस" },
  loading: { en: "Loading...", hi: "लोड हो रहा है..." },
  error: { en: "Error", hi: "त्रुटि" },
  success: { en: "Success", hi: "सफल" },
  confirm: { en: "Confirm", hi: "पुष्टि करें" },

  // Shifts
  myShift: { en: "My Shift", hi: "मेरी शिफ्ट" },
  currentShift: { en: "Current Shift", hi: "वर्तमान शिफ्ट" },
  nextShift: { en: "Next Shift", hi: "अगली शिफ्ट" },
  shiftActive: { en: "Shift Active", hi: "शिफ्ट सक्रिय" },
  noShift: { en: "No Active Shift", hi: "कोई सक्रिय शिफ्ट नहीं" },

  // Trips
  myTrips: { en: "My Trips", hi: "मेरी यात्राएं" },
  startTrip: { en: "Start Trip", hi: "यात्रा शुरू करें" },
  endTrip: { en: "End Trip", hi: "यात्रा समाप्त करें" },
  tripDetails: { en: "Trip Details", hi: "यात्रा विवरण" },
  pickup: { en: "Pickup", hi: "पिकअप" },
  drop: { en: "Drop", hi: "ड्रॉप" },
  route: { en: "Route", hi: "मार्ग" },
  distance: { en: "Distance", hi: "दूरी" },
  duration: { en: "Duration", hi: "अवधि" },

  // Breakdown
  reportBreakdown: { en: "Report Breakdown", hi: "खराबी की रिपोर्ट करें" },
  breakdownReported: { en: "Breakdown Reported", hi: "खराबी रिपोर्ट की गई" },
  breakdownType: { en: "Breakdown Type", hi: "खराबी का प्रकार" },
  engineIssue: { en: "Engine Issue", hi: "इंजन की समस्या" },
  tireIssue: { en: "Tire Issue", hi: "टायर की समस्या" },
  accident: { en: "Accident", hi: "दुर्घटना" },
  other: { en: "Other", hi: "अन्य" },
  describe: { en: "Describe", hi: "वर्णन करें" },

  // Navigation
  home: { en: "Home", hi: "होम" },
  trips: { en: "Trips", hi: "यात्राएं" },
  profile: { en: "Profile", hi: "प्रोफ़ाइल" },
  map: { en: "Map", hi: "नक्शा" },
  navigation: { en: "Navigation", hi: "नेविगेशन" },

  // Status
  pending: { en: "Pending", hi: "लंबित" },
  active: { en: "Active", hi: "सक्रिय" },
  completed: { en: "Completed", hi: "पूर्ण" },
  cancelled: { en: "Cancelled", hi: "रद्द" },
  inProgress: { en: "In Progress", hi: "प्रगति में" },

  // Admin
  createTrip: { en: "Create Trip", hi: "यात्रा बनाएं" },
  assignDriver: { en: "Assign Driver", hi: "ड्राइवर असाइन करें" },
  scheduleTrip: { en: "Schedule Trip", hi: "यात्रा शेड्यूल करें" },
  viewAll: { en: "View All", hi: "सभी देखें" },
  tracking: { en: "Tracking", hi: "ट्रैकिंग" },
  liveTracking: { en: "Live Tracking", hi: "लाइव ट्रैकिंग" },

  // Driver
  truck: { en: "Truck", hi: "ट्रक" },
  driver: { en: "Driver", hi: "चालक" },
  startLocation: { en: "Start Location", hi: "प्रारंभ स्थान" },
  endLocation: { en: "End Location", hi: "समाप्ति स्थान" },
  currentLocation: { en: "Current Location", hi: "वर्तमान स्थान" },

  // Messages
  breakdownReportSuccess: {
    en: "Breakdown reported successfully. Help is on the way.",
    hi: "खराबी की रिपोर्ट सफलतापूर्वक दर्ज की गई। मदद आ रही है।",
  },
  tripStartedSuccess: {
    en: "Trip started successfully",
    hi: "यात्रा सफलतापूर्वक शुरू हुई",
  },
  tripCompletedSuccess: {
    en: "Trip completed successfully",
    hi: "यात्रा सफलतापूर्वक पूर्ण हुई",
  },
};

// Get translation
export const t = (key, lang = LANGUAGES.ENGLISH) => {
  return (
    TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.[LANGUAGES.ENGLISH] || key
  );
};
