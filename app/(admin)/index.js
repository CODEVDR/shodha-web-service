import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { TruckService, NotificationService } from "../../services";
import apiClient from "../../services/api/apiClient";
import { STORAGE_KEYS } from "../../utils";

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [stats, setStats] = useState({
    activeTrucks: 0,
    activeDrivers: 0,
    inTransit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const sseCleanupRef = useRef(null);

  useEffect(() => {
    // Wait a bit to ensure token is saved before making API calls
    const timer = setTimeout(() => {
      loadDashboardStats();
      initializeNotifications();
      connectSSE();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (notificationListener.current) {
        NotificationService.removeAllListeners();
      }
      if (sseCleanupRef.current) {
        sseCleanupRef.current();
      }
    };
  }, []);

  // Handle SSE notifications
  const handleSSENotification = useCallback((notification) => {
    console.log("SSE notification received:", notification);

    // Add to notifications list (keep last 10)
    setRealtimeNotifications((prev) => {
      const newNotif = {
        id: Date.now(),
        ...notification,
        timestamp: new Date().toISOString(),
      };
      return [newNotif, ...prev].slice(0, 10);
    });

    // Reload stats when relevant events occur
    if (
      [
        "TRIP_STARTED",
        "TRIP_COMPLETED",
        "BREAKDOWN_REPORTED",
        "TRIP_EXPIRED",
      ].includes(notification.type)
    ) {
      loadDashboardStats();
    }

    // Show toast for important notifications
    const toastMessages = {
      TRIP_STARTED: {
        title: "Trip Started",
        text: notification.message || "A driver started a trip",
      },
      TRIP_COMPLETED: {
        title: "Trip Completed",
        text: notification.message || "A trip was completed",
      },
      BREAKDOWN_REPORTED: {
        title: "⚠️ Breakdown",
        text: notification.message || "A breakdown was reported",
      },
      TRIP_EXPIRED: {
        title: "Trip Expired",
        text: notification.message || "A trip has expired",
      },
    };

    if (toastMessages[notification.type]) {
      Toast.show({
        type: notification.type === "BREAKDOWN_REPORTED" ? "error" : "info",
        text1: toastMessages[notification.type].title,
        text2: toastMessages[notification.type].text,
        visibilityTime: 4000,
      });
    }
  }, []);

  const connectSSE = async () => {
    try {
      const cleanup = await NotificationService.connectSSE(
        handleSSENotification
      );
      sseCleanupRef.current = cleanup;
    } catch (error) {
      console.error("Failed to connect SSE:", error);
    }
  };

  const initializeNotifications = async () => {
    // Request permissions
    const hasPermission = await NotificationService.requestPermissions();
    if (hasPermission) {
      console.log("Admin notification permissions granted");
    }

    // Listen for notifications
    notificationListener.current = NotificationService.addNotificationListener(
      (notification) => {
        console.log("Admin notification received:", notification);
        const notifData = notification.request.content.data;

        // Reload stats when shift activated or trip started
        if (
          notifData.type === "SHIFT_ACTIVATED" ||
          notifData.type === "TRIP_STARTED"
        ) {
          loadDashboardStats();
        }
      }
    );

    // Listen for notification taps
    responseListener.current =
      NotificationService.addNotificationResponseListener((response) => {
        const screen = response.notification.request.content.data.screen;
        if (screen) {
          router.push(screen);
        }
      });
  };

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Verify token exists before making calls
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        console.warn("No token found, redirecting to login");
        router.replace("/(auth)/login");
        return;
      }

      // Make requests individually to better handle errors
      let activeTrucks = 0;
      let activeDrivers = 0;
      let inTransit = 0;

      try {
        const trucksResponse = await TruckService.getAllTrucks();
        // Count all trucks regardless of status
        activeTrucks = trucksResponse.success
          ? (trucksResponse.data || []).length
          : 0;
        console.log("Total trucks:", activeTrucks);
      } catch (error) {
        console.error(
          "Failed to load trucks:",
          error.response?.data || error.message
        );
      }

      try {
        const driversResponse = await apiClient.get("/drivers");
        console.log(
          "Drivers response:",
          JSON.stringify(driversResponse, null, 2)
        );
        // apiClient already unwraps the response, so we access directly
        activeDrivers = driversResponse.success
          ? (driversResponse.data || []).length
          : 0;
        console.log("Total drivers:", activeDrivers);
      } catch (error) {
        console.error(
          "Failed to load drivers:",
          error.response?.data || error.message
        );
      }

      try {
        const tripsResponse = await apiClient.get("/trips");
        console.log("Trips response:", JSON.stringify(tripsResponse, null, 2));
        // apiClient already unwraps the response
        inTransit = tripsResponse.success
          ? (tripsResponse.data || []).filter(
              (trip) =>
                trip.status === "in-progress" || trip.status === "active"
            ).length
          : 0;
      } catch (error) {
        console.error(
          "Failed to load trips:",
          error.response?.data || error.message
        );
      }

      setStats({ activeTrucks, activeDrivers, inTransit });
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load dashboard data",
      });
    } finally {
      setLoading(false);
    }
  };

  const menuSections = [
    {
      title: "Tracking",
      items: [
        {
          title: "Live Tracking",
          icon: "location",
          route: "/(admin)/tracking/live",
          color: "#4CAF50",
          description: "Real-time fleet monitoring",
        },
      ],
    },
    {
      title: "Fleet Management",
      items: [
        {
          title: "Trucks",
          icon: "car",
          route: "/(admin)/fleet/trucks",
          color: "#2196F3",
          description: "Manage truck fleet",
        },
        {
          title: "Drivers",
          icon: "people",
          route: "/(admin)/fleet/drivers",
          color: "#9C27B0",
          description: "Driver management",
        },
        {
          title: "Shift Assignments",
          icon: "time",
          route: "/(admin)/fleet/shift-assignments",
          color: "#10B981",
          description: "Manage auto shifts",
        },
        {
          title: "View All Trips",
          icon: "list",
          route: "/(admin)/fleet/view-trips",
          color: "#6366F1",
          description: "Manage all trips",
        },
        {
          title: "Create Trip",
          icon: "navigate",
          route: "/(admin)/fleet/create-trip",
          color: "#D4AF37",
          description: "Plan new trip",
        },
      ],
    },
    {
      title: "Geofencing",
      items: [
        {
          title: "Manage Geofences",
          icon: "location-outline",
          route: "/(admin)/geofence/manage",
          color: "#F44336",
          description: "View & edit zones",
        },
        {
          title: "Create Geofence",
          icon: "add-circle-outline",
          route: "/(admin)/geofence/create",
          color: "#00BCD4",
          description: "Add new zone",
        },
      ],
    },
    {
      title: "Analytics",
      items: [
        {
          title: "Reports",
          icon: "bar-chart",
          route: "/(admin)/reports/index",
          color: "#607D8B",
          description: "View analytics",
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Welcome Section */}
          <View className="bg-[#D4AF37] rounded-2xl p-6 mb-6 shadow-lg">
            <Text
              className="text-2xl text-white mb-2"
              style={{ fontFamily: "Cinzel" }}
            >
              Admin Dashboard
            </Text>
            <Text
              className="text-lg text-white opacity-90"
              style={{ fontFamily: "Poppins" }}
            >
              Welcome, {user?.name || "Admin"}
            </Text>
            <View className="flex-row mt-4 pt-4 border-t border-white/20">
              <View className="flex-1">
                <Text
                  className="text-white text-xs opacity-75"
                  style={{ fontFamily: "Poppins" }}
                >
                  Total Trucks
                </Text>
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    className="mt-1"
                  />
                ) : (
                  <Text
                    className="text-white text-2xl font-bold mt-1"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {stats.activeTrucks}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-white text-xs opacity-75"
                  style={{ fontFamily: "Poppins" }}
                >
                  Total Drivers
                </Text>
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    className="mt-1"
                  />
                ) : (
                  <Text
                    className="text-white text-2xl font-bold mt-1"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {stats.activeDrivers}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-white text-xs opacity-75"
                  style={{ fontFamily: "Poppins" }}
                >
                  In Transit
                </Text>
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    className="mt-1"
                  />
                ) : (
                  <Text
                    className="text-white text-2xl font-bold mt-1"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {stats.inTransit}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Real-time Notifications Panel */}
          {realtimeNotifications.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className="text-lg text-gray-800"
                  style={{ fontFamily: "Cinzel" }}
                >
                  Recent Activity
                </Text>
                <TouchableOpacity onPress={() => setRealtimeNotifications([])}>
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 12,
                      color: "#6B7280",
                    }}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
              {realtimeNotifications.slice(0, 5).map((notif) => {
                const getNotifStyle = (type) => {
                  switch (type) {
                    case "TRIP_STARTED":
                      return { icon: "play-circle", color: "#3B82F6" };
                    case "TRIP_COMPLETED":
                      return { icon: "checkmark-circle", color: "#10B981" };
                    case "BREAKDOWN_REPORTED":
                      return { icon: "warning", color: "#EF4444" };
                    case "TRIP_EXPIRED":
                      return { icon: "time-outline", color: "#F59E0B" };
                    default:
                      return { icon: "information-circle", color: "#6B7280" };
                  }
                };
                const style = getNotifStyle(notif.type);
                return (
                  <View
                    key={notif.id}
                    className="flex-row items-start py-2 border-b border-gray-100"
                  >
                    <Ionicons name={style.icon} size={20} color={style.color} />
                    <View className="flex-1 ml-3">
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 13,
                          color: "#374151",
                        }}
                        numberOfLines={2}
                      >
                        {notif.message || notif.type.replace(/_/g, " ")}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 11,
                          color: "#9CA3AF",
                        }}
                      >
                        {new Date(notif.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} className="mb-6">
              <Text
                className="text-xl text-gray-800 mb-4"
                style={{ fontFamily: "Cinzel" }}
              >
                {section.title}
              </Text>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  className="bg-white rounded-xl p-5 mb-3 flex-row items-center shadow-sm"
                  onPress={() => router.push(item.route)}
                >
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Ionicons name={item.icon} size={28} color={item.color} />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text
                      className="text-lg text-gray-800"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="text-sm text-gray-500 mt-1"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#D4AF37" />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
