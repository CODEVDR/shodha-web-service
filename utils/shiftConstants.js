// Shift Types
export const SHIFT_TYPES = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  NIGHT: "night",
};

// Shift Timings (IST - Indian Standard Time)
export const SHIFT_TIMINGS = {
  [SHIFT_TYPES.MORNING]: {
    id: "shift1",
    type: SHIFT_TYPES.MORNING,
    name: "Morning Shift",
    nameHindi: "सुबह की शिफ्ट",
    startTime: "02:00",
    endTime: "10:00",
    startHour: 2,
    startMinute: 0,
    endHour: 10,
    endMinute: 0,
    duration: 8,
    color: "#FFA500", // Orange
    icon: "sunrise",
  },
  [SHIFT_TYPES.AFTERNOON]: {
    id: "shift2",
    type: SHIFT_TYPES.AFTERNOON,
    name: "Afternoon Shift",
    nameHindi: "दोपहर की शिफ्ट",
    startTime: "10:00",
    endTime: "18:00",
    startHour: 10,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    duration: 8,
    color: "#4CAF50", // Green
    icon: "sunny",
  },
  [SHIFT_TYPES.NIGHT]: {
    id: "shift3",
    type: SHIFT_TYPES.NIGHT,
    name: "Night Shift",
    nameHindi: "रात की शिफ्ट",
    startTime: "18:00",
    endTime: "02:00",
    startHour: 18,
    startMinute: 0,
    endHour: 2, // Next day
    endMinute: 0,
    duration: 8,
    color: "#2196F3", // Blue
    icon: "moon",
  },
};

// Shift Rotation Pattern (Pigeonhole Principle)
// Driver works 2 consecutive shifts, then rotates
// Pattern: Morning→Night, Night→Afternoon, Afternoon→Morning
export const SHIFT_ROTATION = {
  [SHIFT_TYPES.MORNING]: SHIFT_TYPES.NIGHT,
  [SHIFT_TYPES.NIGHT]: SHIFT_TYPES.AFTERNOON,
  [SHIFT_TYPES.AFTERNOON]: SHIFT_TYPES.MORNING,
};

// Get all shifts as array
export const getAllShifts = () => {
  return [
    SHIFT_TIMINGS[SHIFT_TYPES.MORNING],
    SHIFT_TIMINGS[SHIFT_TYPES.AFTERNOON],
    SHIFT_TIMINGS[SHIFT_TYPES.NIGHT],
  ];
};

// Get current active shift based on IST time
export const getCurrentShift = () => {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  const currentHour = istDate.getHours();
  const currentMinute = istDate.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const shifts = getAllShifts();

  for (const shift of shifts) {
    const startTimeInMinutes = shift.startHour * 60 + shift.startMinute;
    let endTimeInMinutes = shift.endHour * 60 + shift.endMinute;

    // Handle shifts that cross midnight (night shift)
    if (endTimeInMinutes <= startTimeInMinutes) {
      endTimeInMinutes += 24 * 60; // Add 24 hours
    }

    // Check if current time falls within shift
    if (currentTimeInMinutes >= startTimeInMinutes) {
      if (currentTimeInMinutes < endTimeInMinutes) {
        return shift;
      }
    } else if (endTimeInMinutes > 24 * 60) {
      // Check for overnight shift (previous day)
      if (currentTimeInMinutes < endTimeInMinutes - 24 * 60) {
        return shift;
      }
    }
  }

  return null;
};

// Get IST time
export const getISTTime = () => {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istString);
};

// Get shift by type
export const getShiftByType = (type) => {
  return SHIFT_TIMINGS[type] || null;
};

// Get next shift in rotation for a driver
export const getNextShiftForDriver = (currentShiftType) => {
  return SHIFT_ROTATION[currentShiftType] || SHIFT_TYPES.MORNING;
};

// Calculate which shifts a driver should work based on rotation
export const getDriverShiftPair = (currentShiftType) => {
  const nextShift = getNextShiftForDriver(currentShiftType);
  return {
    first: SHIFT_TIMINGS[currentShiftType],
    second: SHIFT_TIMINGS[nextShift],
  };
};
