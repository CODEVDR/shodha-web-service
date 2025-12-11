import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
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
  const lastStatsUpdateRef = useRef(0);

  // Responsive breakpoints
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  // Calculate grid columns for menu items
  const getGridColumns = () => {
    if (isDesktop) return 3;
    if (isTablet) return 2;
    return 1;
  };

  useEffect(() => {
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

  const handleSSENotification = useCallback((notification) => {
    console.log("SSE notification received:", notification);

    setRealtimeNotifications((prev) => {
      const newNotif = {
        id: Date.now(),
        ...notification,
        timestamp: new Date().toISOString(),
      };
      return [newNotif, ...prev].slice(0, 10);
    });

    if (
      [
        "TRIP_STARTED",
        "TRIP_COMPLETED",
        "BREAKDOWN_REPORTED",
        "TRIP_EXPIRED",
      ].includes(notification.type)
    ) {
      const now = Date.now();
      if (now - lastStatsUpdateRef.current > 5000) {
        lastStatsUpdateRef.current = now;
        loadDashboardStats(false);
      }
    }

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
    const hasPermission = await NotificationService.requestPermissions();
    if (hasPermission) {
      console.log("Admin notification permissions granted");
    }

    notificationListener.current = NotificationService.addNotificationListener(
      (notification) => {
        console.log("Admin notification received:", notification);
        const notifData = notification.request.content.data;

        if (
          notifData.type === "SHIFT_ACTIVATED" ||
          notifData.type === "TRIP_STARTED"
        ) {
          const now = Date.now();
          if (now - lastStatsUpdateRef.current > 5000) {
            lastStatsUpdateRef.current = now;
            loadDashboardStats(false);
          }
        }
      }
    );

    responseListener.current =
      NotificationService.addNotificationResponseListener((response) => {
        const screen = response.notification.request.content.data.screen;
        if (screen) {
          router.push(screen);
        }
      });
  };

  const loadDashboardStats = async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        console.warn("No token found, redirecting to login");
        router.replace("/(auth)/login");
        return;
      }

      let activeTrucks = 0;
      let activeDrivers = 0;
      let inTransit = 0;

      try {
        const trucksResponse = await TruckService.getAllTrucks();
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
      if (showLoadingState) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load dashboard data",
        });
      }
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
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
          route: "/(admin)/reports/report",
          color: "#607D8B",
          description: "View analytics",
        },
      ],
    },
  ];

  // Render stat card
  const renderStatCard = (label, value, icon, color) => (
    <View
      style={{
        flex: 1,
        minWidth: isDesktop ? 200 : isMobile ? "100%" : "48%",
        backgroundColor: "white",
        borderRadius: 16,
        padding: isDesktop ? 24 : 20,
        marginBottom: isMobile ? 12 : 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: isDesktop ? 56 : 48,
            height: isDesktop ? 56 : 48,
            borderRadius: 12,
            backgroundColor: `${color}15`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <Ionicons name={icon} size={isDesktop ? 28 : 24} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Poppins",
              fontSize: isDesktop ? 14 : 12,
              color: "#6B7280",
              marginBottom: 4,
            }}
          >
            {label}
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Text
              style={{
                fontFamily: "Cinzel",
                fontSize: isDesktop ? 32 : 28,
                color: "#1F2937",
                fontWeight: "bold",
              }}
            >
              {value}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  // Render menu item card
  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.route}
      style={{
        width: isDesktop
          ? `${100 / getGridColumns() - 2}%`
          : isTablet
            ? "48%"
            : "100%",
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
          width: isDesktop ? 64 : 56,
          height: isDesktop ? 64 : 56,
          borderRadius: 16,
          backgroundColor: `${item.color}15`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons
          name={item.icon}
          size={isDesktop ? 32 : 28}
          color={item.color}
        />
      </View>
      <Text
        style={{
          fontFamily: "Cinzel",
          fontSize: isDesktop ? 18 : 16,
          color: "#1F2937",
          marginBottom: 8,
          fontWeight: "600",
        }}
      >
        {item.title}
      </Text>
      <Text
        style={{
          fontFamily: "Poppins",
          fontSize: isDesktop ? 14 : 13,
          color: "#6B7280",
          lineHeight: 20,
        }}
      >
        {item.description}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <Text
          style={{
            fontFamily: "Poppins",
            fontSize: 13,
            color: item.color,
            fontWeight: "600",
            marginRight: 4,
          }}
        >
          Open
        </Text>
        <Ionicons name="arrow-forward" size={16} color={item.color} />
      </View>
    </TouchableOpacity>
  );

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
            Admin Dashboard
          </Text>
          <Text
            style={{
              fontFamily: "Poppins",
              fontSize: isDesktop ? 16 : 14,
              color: "#6B7280",
            }}
          >
            Welcome back, {user?.name || "Admin"}
          </Text>
        </View>

        {/* Stats Cards */}
        <View
          style={{
            flexDirection: isDesktop ? "row" : isMobile ? "column" : "row",
            flexWrap: isTablet ? "wrap" : "nowrap",
            gap: isDesktop ? 20 : isTablet ? 12 : 0,
            marginBottom: isDesktop ? 32 : 24,
          }}
        >
          {renderStatCard("Total Trucks", stats.activeTrucks, "car", "#2196F3")}
          {renderStatCard(
            "Total Drivers",
            stats.activeDrivers,
            "people",
            "#9C27B0"
          )}
          {renderStatCard("In Transit", stats.inTransit, "navigate", "#10B981")}
        </View>

        {/* Real-time Notifications Panel */}
        {realtimeNotifications.length > 0 && (
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: isDesktop ? 24 : 20,
              marginBottom: isDesktop ? 32 : 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 2,
              borderWidth: 1,
              borderColor: "#F3F4F6",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="notifications"
                  size={24}
                  color="#D4AF37"
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontFamily: "Cinzel",
                    fontSize: isDesktop ? 20 : 18,
                    color: "#1F2937",
                    fontWeight: "600",
                  }}
                >
                  Recent Activity
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRealtimeNotifications([])}>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 13,
                    color: "#6B7280",
                    fontWeight: "500",
                  }}
                >
                  Clear All
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
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: `${style.color}15`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={style.icon} size={20} color={style.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: isDesktop ? 14 : 13,
                        color: "#374151",
                        lineHeight: 20,
                      }}
                      numberOfLines={2}
                    >
                      {typeof notif.message === "string"
                        ? notif.message
                        : notif.type.replace(/_/g, " ")}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontSize: 12,
                        color: "#9CA3AF",
                        marginTop: 4,
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
          <View
            key={sectionIndex}
            style={{ marginBottom: isDesktop ? 32 : 24 }}
          >
            <Text
              style={{
                fontFamily: "Cinzel",
                fontSize: isDesktop ? 24 : 20,
                color: "#1F2937",
                marginBottom: 16,
                fontWeight: "600",
              }}
            >
              {section.title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: isDesktop ? 20 : isTablet ? 12 : 0,
                justifyContent: "space-between",
              }}
            >
              {section.items.map((item) => renderMenuItem(item))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
