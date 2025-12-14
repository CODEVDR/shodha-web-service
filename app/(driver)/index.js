import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useState, useEffect, useRef } from "react";
import Toast from "react-native-toast-message";
import { AutoShiftService, NotificationService } from "../../services";
import { useLanguage } from "./_layout";

export default function DriverDashboard() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [istTime, setIstTime] = useState(null);
  const [myActiveShift, setMyActiveShift] = useState(null);
  const [shiftSchedules, setShiftSchedules] = useState([]);
  const [activeTripsCount, setActiveTripsCount] = useState(0);

  // Get language from context
  const { LANG } = useLanguage();

  const notificationListener = useRef();
  const responseListener = useRef();
  const timeUpdateInterval = useRef(null);

  // Responsive breakpoints
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  useEffect(() => {
    loadData();
    initializeNotifications();

    // Update current shift every minute
    timeUpdateInterval.current = setInterval(() => {
      updateCurrentShiftInRealTime();
    }, 60000); // Check every minute

    return () => {
      if (notificationListener.current) {
        NotificationService.removeAllListeners();
      }
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, []);

  // Calculate current shift based on IST time
  const getCurrentShiftFromTime = () => {
    const now = new Date();
    const istString = now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const istDate = new Date(istString);
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    const shifts = [
      {
        type: "morning",
        name: "Morning Shift",
        startHour: 2,
        startMinute: 0,
        endHour: 10,
        endMinute: 0,
        color: "#FFA500",
      },
      {
        type: "afternoon",
        name: "Afternoon Shift",
        startHour: 10,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
        color: "#4CAF50",
      },
      {
        type: "night",
        name: "Night Shift",
        startHour: 18,
        startMinute: 0,
        endHour: 2,
        endMinute: 0,
        color: "#2196F3",
      },
    ];

    for (const shift of shifts) {
      const startTimeInMinutes = shift.startHour * 60 + shift.startMinute;
      let endTimeInMinutes = shift.endHour * 60 + shift.endMinute;

      // Handle overnight shifts (like night shift 18:00 - 02:00)
      if (endTimeInMinutes <= startTimeInMinutes) {
        endTimeInMinutes += 24 * 60;
      }

      // Check if current time falls within this shift
      if (currentTimeInMinutes >= startTimeInMinutes) {
        if (currentTimeInMinutes < endTimeInMinutes) {
          return shift;
        }
      } else if (endTimeInMinutes > 24 * 60) {
        // Handle overnight case (after midnight)
        if (currentTimeInMinutes < endTimeInMinutes - 24 * 60) {
          return shift;
        }
      }
    }

    return null;
  };

  // Update current shift in real-time
  const updateCurrentShiftInRealTime = () => {
    const shift = getCurrentShiftFromTime();
    const now = new Date();
    const istString = now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    console.log("🕐 Real-time update - Current IST:", istString);
    console.log("🔄 Current shift:", shift ? shift.name : "No active shift");

    setCurrentShift(shift);
    setIstTime(istString);
  };

  const initializeNotifications = async () => {
    const hasPermission = await NotificationService.requestPermissions();
    if (hasPermission) {
      console.log("Notification permissions granted");
    }

    notificationListener.current = NotificationService.addNotificationListener(
      (notification) => {
        console.log("Notification received:", notification);
        if (notification.request.content.data.type === "TRIP_ASSIGNED") {
          loadData();
        }
      }
    );

    responseListener.current =
      NotificationService.addNotificationResponseListener((response) => {
        const screen = response.notification.request.content.data.screen;
        const tripId = response.notification.request.content.data.tripId;
        if (screen && tripId) {
          router.push(screen.replace("[id]", tripId));
        }
      });
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Get real-time current shift & IST now
      const realTimeShift = getCurrentShiftFromTime();
      const now = new Date();
      const istString = now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      setCurrentShift(realTimeShift);
      setIstTime(istString);

      console.log("🕐 Current IST Time:", istString);

      // Get current user ID
      const currentUserId = user?._id || user?.id;
      console.log("👤 Current User ID:", currentUserId);

      // Fetch my active shift from API
      const myShiftRes = await AutoShiftService.getMyShift();
      console.log(
        "📦 My Shift API Response:",
        JSON.stringify(myShiftRes, null, 2)
      );

      if (myShiftRes.success && myShiftRes.data) {
        const shiftData = myShiftRes.data;

        console.log("📦 Received shift data from API:", {
          id: shiftData._id,
          driver: shiftData.driver,
          status: shiftData.status,
          shiftType: shiftData.shiftType,
          shiftDate: shiftData.shiftDate,
          manualAssignment: shiftData.manualAssignment,
        });

        // ✅ CHECK 0: Verify this shift belongs to current user
        const shiftDriverId =
          typeof shiftData.driver === "string"
            ? shiftData.driver
            : shiftData.driver?._id || shiftData.driver;

        if (shiftDriverId !== currentUserId) {
          console.log(
            `❌ Shift belongs to different driver (${shiftDriverId}) - hiding`
          );
          setMyActiveShift(null);
          setActiveTripsCount(0);
          return;
        }

        // ✅ CHECK 1: Status must be "active"
        if (shiftData.status !== "active") {
          console.log(`❌ Shift status is "${shiftData.status}" - hiding`);
          setMyActiveShift(null);
          setActiveTripsCount(0);
          return;
        }

        // ✅ CHECK 2: Use startTimeIST and endTimeIST objects
        try {
          // Get current IST date and time properly
          const istFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          const istParts = istFormatter.formatToParts(now);
          const istObj = {};
          istParts.forEach((part) => {
            istObj[part.type] = part.value;
          });

          const currentYear = parseInt(istObj.year);
          const currentMonth = parseInt(istObj.month);
          const currentDay = parseInt(istObj.day);
          const currentHour = parseInt(istObj.hour);
          const currentMinute = parseInt(istObj.minute);

          const todayDateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;
          const currentTotalMinutes = currentHour * 60 + currentMinute;

          console.log("📅 Current IST Date:", todayDateStr);
          console.log(
            "🕐 Current IST Time:",
            `${currentHour}:${String(currentMinute).padStart(2, "0")}`
          );
          console.log("🕐 Current Total Minutes:", currentTotalMinutes);

          // Extract shift times from IST objects
          const startHour = shiftData.startTimeIST?.hour;
          const startMinute = shiftData.startTimeIST?.minute || 0;
          const startDate = shiftData.startTimeIST?.date || shiftData.shiftDate;

          const endHour = shiftData.endTimeIST?.hour;
          const endMinute = shiftData.endTimeIST?.minute || 0;
          const endDate = shiftData.endTimeIST?.date;

          if (startHour == null || endHour == null) {
            console.error("❌ Missing IST time data");
            setMyActiveShift(null);
            setActiveTripsCount(0);
            return;
          }

          const startTotalMinutes = startHour * 60 + startMinute;
          let endTotalMinutes = endHour * 60 + endMinute;

          console.log("⏰ Shift Time Analysis:", {
            shiftType: shiftData.shiftType,
            startDate,
            endDate: endDate || startDate,
            startTime: `${startHour}:${String(startMinute).padStart(2, "0")}`,
            endTime: `${endHour}:${String(endMinute).padStart(2, "0")}`,
            startTotalMinutes,
            endTotalMinutes,
          });

          let isWithinShiftWindow = false;

          // Determine if shift crosses midnight
          const shiftCrossesMidnight =
            (endDate && endDate !== startDate) ||
            endTotalMinutes <= startTotalMinutes;

          if (shiftCrossesMidnight) {
            console.log("🌙 Overnight shift detected");

            // Calculate next day
            const startDateObj = new Date(startDate + "T00:00:00");
            startDateObj.setDate(startDateObj.getDate() + 1);
            const nextDayStr = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, "0")}-${String(startDateObj.getDate()).padStart(2, "0")}`;

            if (todayDateStr === startDate) {
              // We're on the start date - check if time >= start
              isWithinShiftWindow = currentTotalMinutes >= startTotalMinutes;
              console.log(
                `📍 On start date (${startDate}), time check: ${currentTotalMinutes} >= ${startTotalMinutes} = ${isWithinShiftWindow}`
              );
            } else if (
              todayDateStr === nextDayStr ||
              todayDateStr === endDate
            ) {
              // We're on the next day - check if time < end
              isWithinShiftWindow = currentTotalMinutes < endTotalMinutes;
              console.log(
                `📍 On next date (${todayDateStr}), time check: ${currentTotalMinutes} < ${endTotalMinutes} = ${isWithinShiftWindow}`
              );
            } else {
              console.log(
                `📍 Date mismatch: today=${todayDateStr}, start=${startDate}, next=${nextDayStr}`
              );
            }
          } else {
            // Same-day shift
            isWithinShiftWindow =
              todayDateStr === startDate &&
              currentTotalMinutes >= startTotalMinutes &&
              currentTotalMinutes < endTotalMinutes;

            console.log(`📍 Same-day shift on ${startDate}:`);
            console.log(`  - Date match: ${todayDateStr === startDate}`);
            console.log(
              `  - Time range: ${currentTotalMinutes} >= ${startTotalMinutes} && ${currentTotalMinutes} < ${endTotalMinutes}`
            );
            console.log(`  - Result: ${isWithinShiftWindow}`);
          }

          console.log("⏱ Final Window Check:", {
            shiftType: shiftData.shiftType,
            isWithinWindow: isWithinShiftWindow,
          });

          if (!isWithinShiftWindow) {
            console.log(`❌ Current time not within shift window - hiding`);
            setMyActiveShift(null);
            setActiveTripsCount(0);
            return;
          }

          console.log(
            `✅ VALID: Shift is within time window (${shiftData.shiftType})`
          );
        } catch (dateError) {
          console.error("❌ Error processing shift times:", dateError);
          setMyActiveShift(null);
          setActiveTripsCount(0);
          return;
        }

        console.log("✅ All checks passed - processing shift...");

        // Filter active trips
        const activeTrips =
          shiftData.trips?.filter((trip) => {
            return (
              trip.status !== "completed" &&
              trip.status !== "cancelled" &&
              trip.status !== "failed"
            );
          }) || [];

        console.log(`✅ Found ${activeTrips.length} active trips`);

        const updatedShiftData = {
          ...shiftData,
          activeTrips: activeTrips,
          totalActiveTrips: activeTrips.length,
        };

        setMyActiveShift(updatedShiftData);
        setActiveTripsCount(activeTrips.length);

        console.log("✅ Active shift set successfully:", {
          shiftId: updatedShiftData._id,
          shiftType: updatedShiftData.shiftType,
          driver: shiftDriverId,
          manualAssignment: updatedShiftData.manualAssignment,
        });
      } else {
        console.log("ℹ️ No shift data returned from API");
        setMyActiveShift(null);
        setActiveTripsCount(0);
      }
    } catch (error) {
      console.error("❌ Error loading shift data:", error);
      setMyActiveShift(null);
      setActiveTripsCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleActivateShift = async () => {
    try {
      setLoading(true);
      console.log("Attempting to activate shift...");
      const response = await AutoShiftService.activateShift();
      console.log(
        "Activate shift response:",
        JSON.stringify(response, null, 2)
      );

      if (response.success) {
        await NotificationService.notifyShiftActivated(
          user?.name || LANG.driver,
          response.data?.truck?.registrationNumber || "N/A"
        );

        Toast.show({
          type: "success",
          text1: LANG.success,
          text2: `${LANG.shiftActivated} ${response.data?.truck?.registrationNumber ? `${LANG.truckAssigned} ${response.data.truck.registrationNumber}` : LANG.shiftActivatedSuccess}`,
        });
        loadData();
      } else {
        console.log("Shift activation failed:", response.message);
        Toast.show({
          type: "error",
          text1: LANG.cannotActivateShift,
          text2: response.message || LANG.shiftActivationFailed,
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error("Shift activation error:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        LANG.shiftActivationFailed;
      Toast.show({
        type: "error",
        text1: LANG.error,
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!myActiveShift) return;

    // Check if there are active trips
    if (activeTripsCount > 0) {
      Toast.show({
        type: "error",
        text1: LANG.error,
        text2: `${LANG.error}. ${LANG.messages?.requiredField || "You have"} ${activeTripsCount} ${LANG.shiftInfo.trips}. ${LANG.tripEnd?.requiresFinalReading || "Please complete all trips first"}.`,
        visibilityTime: 4000,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await AutoShiftService.releaseShift(myActiveShift._id);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: LANG.success,
          text2: LANG.shiftEndedSuccess,
        });
        setMyActiveShift(null);
        setActiveTripsCount(0);
        loadData();
      } else {
        Toast.show({
          type: "error",
          text1: LANG.error,
          text2: response.message || LANG.shiftEndFailed,
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: LANG.error,
        text2: error.message || LANG.shiftEndFailed,
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const menuItems = [
    {
      title: LANG.quickAccess.activeShift,
      icon: "time-outline",
      route: "/(driver)/shift/active",
      color: "#4CAF50",
      description: LANG.quickAccess.activeShiftDesc,
    },
    {
      title: LANG.quickAccess.tripList,
      icon: "list-outline",
      route: "/(driver)/shift/trips",
      color: "#2196F3",
      description: LANG.quickAccess.tripListDesc,
    },
    {
      title: LANG.quickAccess.shiftHistory,
      icon: "calendar-outline",
      route: "/(driver)/shift/history",
      color: "#FF9800",
      description: LANG.quickAccess.shiftHistoryDesc,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 48 : isTablet ? 32 : 20,
          paddingVertical: isDesktop ? 32 : 24,
          maxWidth: isDesktop ? 1440 : "100%",
          width: "100%",
          alignSelf: "center",
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View
          style={{
            marginBottom: isDesktop ? 32 : 24,
          }}
        >
          <Text
            style={{
              fontFamily: "Cinzel",
              fontSize: isDesktop ? 36 : isTablet ? 32 : 28,
              color: "#1F2937",
              marginBottom: 8,
            }}
          >
            {LANG.dashboard.title}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <View
              style={{
                width: isDesktop ? 48 : 40,
                height: isDesktop ? 48 : 40,
                borderRadius: isDesktop ? 24 : 20,
                backgroundColor: "#D4AF3720",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons
                name="person"
                size={isDesktop ? 24 : 20}
                color="#D4AF37"
              />
            </View>
            <View>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: isDesktop ? 16 : 14,
                  color: "#6B7280",
                }}
              >
                {LANG.dashboard.welcomeBack}
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: isDesktop ? 20 : 18,
                  color: "#D4AF37",
                  fontWeight: "600",
                }}
              >
                {user?.name || LANG.driver}
              </Text>
            </View>
          </View>
        </View>

        {/* Desktop: Two Column Layout, Mobile: Single Column */}
        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: isDesktop ? 24 : 0,
          }}
        >
          {/* Left Column / Top Section - Shift Status */}
          <View
            style={{
              flex: isDesktop ? 1.5 : 1,
              marginBottom: isMobile ? 24 : 0,
            }}
          >
            {/* Current Shift Status Card */}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 20,
                padding: isDesktop ? 32 : 24,
                marginBottom: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: 1,
                borderColor: "#F3F4F6",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#D4AF3720",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="time" size={28} color="#D4AF37" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Cinzel",
                      fontSize: isDesktop ? 24 : 20,
                      color: "#1F2937",
                      fontWeight: "600",
                    }}
                  >
                    {LANG.shiftInfo.status}
                  </Text>
                  {istTime && (
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 13,
                        color: "#6B7280",
                        marginTop: 4,
                      }}
                    >
                      {LANG.shiftInfo.currentTime} {istTime} IST
                    </Text>
                  )}
                </View>
              </View>

              {/* Current Shift Schedule */}
              {currentShift ? (
                <View
                  style={{
                    backgroundColor: "#10B98115",
                    borderLeftWidth: 4,
                    borderLeftColor: "#10B981",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: "#10B981",
                        marginRight: 10,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: isDesktop ? 18 : 16,
                        fontWeight: "700",
                        color: "#10B981",
                      }}
                    >
                      {currentShift.name} -{" "}
                      {LANG.status?.active?.toUpperCase() || "ACTIVE"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 14,
                      color: "#4B5563",
                      marginLeft: 22,
                    }}
                  >
                    {currentShift.startHour}:
                    {String(currentShift.startMinute).padStart(2, "0")} -{" "}
                    {currentShift.endHour}:
                    {String(currentShift.endMinute).padStart(2, "0")} IST
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: "#EF444415",
                    borderLeftWidth: 4,
                    borderLeftColor: "#EF4444",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: "#EF4444",
                        marginRight: 10,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: isDesktop ? 18 : 16,
                        fontWeight: "700",
                        color: "#EF4444",
                      }}
                    >
                      {LANG.shiftInfo.noActiveSchedule}
                    </Text>
                  </View>
                </View>
              )}

              {/* My Active Shift or Activate Button */}
              {myActiveShift ? (
                <View>
                  <View
                    style={{
                      backgroundColor: "#3B82F615",
                      borderRadius: 16,
                      padding: 20,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Cinzel",
                        fontSize: 18,
                        fontWeight: "600",
                        color: "#1F2937",
                        marginBottom: 16,
                      }}
                    >
                      {LANG.shiftInfo.yourActiveShift}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: "#3B82F620",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="car" size={20} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 13,
                            color: "#6B7280",
                          }}
                        >
                          {LANG.shiftInfo.assignedTruck}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 16,
                            color: "#1F2937",
                            fontWeight: "600",
                          }}
                        >
                          {myActiveShift.truck?.registrationNumber || "N/A"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: "#3B82F620",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="time" size={20} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 13,
                            color: "#6B7280",
                          }}
                        >
                          {LANG.shiftInfo.startedAt}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 16,
                            color: "#1F2937",
                            fontWeight: "600",
                          }}
                        >
                          {new Date(myActiveShift.startTime).toLocaleTimeString(
                            "en-US",
                            {
                              timeZone: "Asia/Kolkata",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </Text>
                      </View>
                    </View>

                    {/* Only show active trips count */}
                    {activeTripsCount > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: "#3B82F620",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          <Ionicons name="list" size={20} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 13,
                              color: "#6B7280",
                            }}
                          >
                            {LANG.shiftInfo.assignedTrips}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 16,
                              color: "#1F2937",
                              fontWeight: "600",
                            }}
                          >
                            {activeTripsCount} {LANG.status?.active || "Active"}{" "}
                            {LANG.shiftInfo.trips}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <TouchableOpacity
                    onPress={() => router.push("/(driver)/shift/active")}
                    style={{
                      backgroundColor: "#10B981",
                      borderRadius: 14,
                      paddingVertical: 16,
                      alignItems: "center",
                      marginBottom: 12,
                      flexDirection: "row",
                      justifyContent: "center",
                      shadowColor: "#10B981",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Ionicons name="map" size={20} color="#fff" />
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 16,
                        color: "white",
                        fontWeight: "600",
                        marginLeft: 8,
                      }}
                    >
                      {LANG.buttons.viewRoute}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleEndShift}
                    style={{
                      backgroundColor:
                        activeTripsCount > 0 ? "#D1D5DB" : "#EF4444",
                      borderRadius: 14,
                      paddingVertical: 16,
                      alignItems: "center",
                    }}
                    disabled={loading || activeTripsCount > 0}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 16,
                            color: "white",
                            fontWeight: "600",
                          }}
                        >
                          {LANG.buttons.endShift}
                        </Text>
                        {activeTripsCount > 0 && (
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 11,
                              color: "white",
                              marginTop: 2,
                            }}
                          >
                            {LANG.trip?.messages?.completedDesc ||
                              "Complete all trips first"}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: 32,
                    }}
                  >
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Ionicons name="time-outline" size={40} color="#9CA3AF" />
                    </View>
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 16,
                        color: "#6B7280",
                        textAlign: "center",
                      }}
                    >
                      {LANG.shiftInfo.noActiveShift}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 13,
                        color: "#9CA3AF",
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      {LANG.shiftInfo.activateToStart}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleActivateShift}
                    style={{
                      backgroundColor: currentShift ? "#D4AF37" : "#D1D5DB",
                      borderRadius: 14,
                      paddingVertical: 16,
                      alignItems: "center",
                      shadowColor: currentShift ? "#D4AF37" : "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: currentShift ? 0.2 : 0.1,
                      shadowRadius: 8,
                      elevation: currentShift ? 4 : 2,
                    }}
                    disabled={loading || !currentShift}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 16,
                          color: "white",
                          fontWeight: "600",
                        }}
                      >
                        {currentShift
                          ? LANG.buttons.activateShift
                          : LANG.shiftInfo.noActiveSchedule}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Info Card - Mobile Only (moved to bottom on desktop) */}
            {isMobile && (
              <View
                style={{
                  backgroundColor: "#D4AF37",
                  borderRadius: 20,
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="information-circle" size={24} color="#fff" />
                  <Text
                    style={{
                      fontFamily: "Cinzel",
                      fontSize: 18,
                      color: "white",
                      marginLeft: 12,
                      fontWeight: "600",
                    }}
                  >
                    {LANG.important}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 14,
                    color: "white",
                    lineHeight: 22,
                  }}
                >
                  {LANG.infoMessage}
                </Text>
              </View>
            )}
          </View>

          {/* Right Column / Bottom Section - Quick Access */}
          <View
            style={{
              flex: isDesktop ? 1 : 1,
            }}
          >
            {/* Quick Access Menu */}
            <View>
              <Text
                style={{
                  fontFamily: "Cinzel",
                  fontSize: isDesktop ? 24 : 20,
                  color: "#1F2937",
                  marginBottom: 16,
                  fontWeight: "600",
                }}
              >
                {LANG.quickAccess.title}
              </Text>

              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 16,
                    padding: isDesktop ? 24 : 20,
                    marginBottom: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: "#F3F4F6",
                  }}
                  onPress={() => router.push(item.route)}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: isDesktop ? 64 : 56,
                        height: isDesktop ? 64 : 56,
                        borderRadius: 16,
                        backgroundColor: `${item.color}15`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={isDesktop ? 28 : 24}
                        color={item.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Cinzel",
                          fontSize: isDesktop ? 18 : 16,
                          color: "#1F2937",
                          marginBottom: 4,
                          fontWeight: "600",
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 13,
                          color: "#6B7280",
                        }}
                      >
                        {item.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={item.color}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info Card - Desktop/Tablet Only */}
            {!isMobile && (
              <View
                style={{
                  backgroundColor: "#D4AF37",
                  borderRadius: 20,
                  padding: isDesktop ? 28 : 24,
                  marginTop: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="information-circle" size={24} color="#fff" />
                  <Text
                    style={{
                      fontFamily: "Cinzel",
                      fontSize: 18,
                      color: "white",
                      marginLeft: 12,
                      fontWeight: "600",
                    }}
                  >
                    {LANG.important}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 14,
                    color: "white",
                    lineHeight: 22,
                  }}
                >
                  {LANG.infoMessage}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
