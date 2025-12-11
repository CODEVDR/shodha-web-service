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

  const notificationListener = useRef();
  const responseListener = useRef();

  // Responsive breakpoints
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  useEffect(() => {
    loadData();
    initializeNotifications();

    return () => {
      if (notificationListener.current) {
        NotificationService.removeAllListeners();
      }
    };
  }, []);

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
      const [schedulesRes, myShiftRes] = await Promise.all([
        AutoShiftService.getShiftSchedules(),
        AutoShiftService.getMyShift(),
      ]);

      if (schedulesRes.success) {
        setShiftSchedules(schedulesRes.data.schedules || []);
        setCurrentShift(schedulesRes.data.current);
        setIstTime(schedulesRes.data.istTime);
      }

      if (myShiftRes.success && myShiftRes.data) {
        setMyActiveShift(myShiftRes.data);
      } else {
        setMyActiveShift(null);
      }
    } catch (error) {
      console.log("Error loading shift data:", error);
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
          user?.name || "Driver",
          response.data?.truck?.registrationNumber || "N/A"
        );

        Toast.show({
          type: "success",
          text1: "Success",
          text2: `Shift activated! ${response.data?.truck?.registrationNumber ? `Truck ${response.data.truck.registrationNumber} assigned` : "Shift activated successfully"}`,
        });
        loadData();
      } else {
        console.log("Shift activation failed:", response.message);
        Toast.show({
          type: "error",
          text1: "Cannot Activate Shift",
          text2: response.message || "Failed to activate shift",
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error("Shift activation error:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to activate shift";
      Toast.show({
        type: "error",
        text1: "Error",
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!myActiveShift) return;

    try {
      setLoading(true);
      const response = await AutoShiftService.releaseShift(myActiveShift._id);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Shift ended successfully",
        });
        setMyActiveShift(null);
        loadData();
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to end shift",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to end shift",
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
      title: "Active Shift",
      icon: "time-outline",
      route: "/(driver)/shift/active",
      color: "#4CAF50",
      description: "View current shift details",
    },
    {
      title: "Trip List",
      icon: "list-outline",
      route: "/(driver)/shift/trips",
      color: "#2196F3",
      description: "Manage your trips",
    },
    {
      title: "Shift History",
      icon: "calendar-outline",
      route: "/(driver)/shift/history",
      color: "#FF9800",
      description: "View past shifts",
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
            Driver Dashboard
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
                Welcome back,
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: isDesktop ? 20 : 18,
                  color: "#D4AF37",
                  fontWeight: "600",
                }}
              >
                {user?.name || "Driver"}
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
                    Shift Status
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
                      Current Time: {istTime}
                    </Text>
                  )}
                </View>
              </View>

              {/* Current Shift Schedule */}
              {currentShift && (
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
                      {currentShift.name} - ACTIVE
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
                      Your Active Shift
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
                          Truck Assigned
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
                          Started At
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 16,
                            color: "#1F2937",
                            fontWeight: "600",
                          }}
                        >
                          {new Date(
                            myActiveShift.startTime
                          ).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>

                    {myActiveShift.trips && myActiveShift.trips.length > 0 && (
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
                            Assigned Trips
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 16,
                              color: "#1F2937",
                              fontWeight: "600",
                            }}
                          >
                            {myActiveShift.trips.length} trip(s)
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
                      View Route & Track
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleEndShift}
                    style={{
                      backgroundColor: "#EF4444",
                      borderRadius: 14,
                      paddingVertical: 16,
                      alignItems: "center",
                    }}
                    disabled={loading}
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
                        End Shift
                      </Text>
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
                      No active shift
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
                      Activate your shift to start working
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
                          ? "Activate Shift"
                          : "No Active Shift Period"}
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
                    Important
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
                  Remember to start your shift before beginning any trip. Keep
                  your GPS enabled for accurate tracking.
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
                Quick Access
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
                    Important
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
                  Remember to start your shift before beginning any trip. Keep
                  your GPS enabled for accurate tracking.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
