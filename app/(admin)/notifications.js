import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NotificationService } from "../../services";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../utils/constants";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      // Check if token exists before making API call
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      console.log(
        "AdminNotifications.loadNotifications - Token exists:",
        !!token
      );
      console.log(
        "AdminNotifications.loadNotifications - User data:",
        userData
      );

      if (!token) {
        console.log(
          "No authentication token found, skipping notifications load"
        );
        setNotifications([]);
        return;
      }

      const result = await NotificationService.getNotificationsFromDB({
        page: 1,
        limit: 50,
        unreadOnly: false,
      });

      setNotifications(result.notifications || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsReadInDB(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleDismiss = async (notificationId) => {
    try {
      // Remove notification from local state (effectively "deleting" it from view)
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "TRIP_STATUS_CHANGE":
        return "refresh-circle";
      case "BREAKDOWN_REPORTED":
        return "warning";
      case "breakdown_alert":
        return "alert-circle";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type, severity) => {
    if (type === "BREAKDOWN_REPORTED" || type === "breakdown_alert") {
      switch (severity) {
        case "critical":
          return "#DC2626";
        case "high":
          return "#EA580C";
        case "medium":
          return "#D97706";
        default:
          return "#F59E0B";
      }
    }
    switch (type) {
      case "TRIP_STATUS_CHANGE":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#FFF",
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#1F2937",
            fontFamily: "Cinzel",
          }}
        >
          Admin Alerts
        </Text>
        {notifications.length > 0 && (
          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginTop: 4,
              fontFamily: "Poppins",
            }}
          >
            {notifications.filter((n) => !n.read).length} unread alerts
          </Text>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 60,
            }}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={64}
              color="#D1D5DB"
            />
            <Text
              style={{
                fontSize: 18,
                color: "#6B7280",
                marginTop: 16,
                textAlign: "center",
                fontFamily: "Poppins",
              }}
            >
              No alerts yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#9CA3AF",
                marginTop: 8,
                textAlign: "center",
                fontFamily: "Poppins",
              }}
            >
              Driver alerts and trip updates will appear here
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View
              key={notification._id}
              style={{
                backgroundColor: "#FFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getNotificationColor(
                  notification.data?.type || notification.type,
                  notification.data?.severity
                ),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
                opacity: notification.isRead ? 0.7 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    backgroundColor:
                      getNotificationColor(
                        notification.data?.type || notification.type,
                        notification.data?.severity
                      ) + "20",
                    padding: 8,
                    borderRadius: 20,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={getNotificationIcon(
                      notification.data?.type || notification.type
                    )}
                    size={20}
                    color={getNotificationColor(
                      notification.data?.type || notification.type,
                      notification.data?.severity
                    )}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#1F2937",
                      marginBottom: 4,
                      fontFamily: "Poppins",
                    }}
                  >
                    {notification.title}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      lineHeight: 20,
                      marginBottom: 8,
                      fontFamily: "Poppins",
                    }}
                  >
                    {notification.body}
                  </Text>

                  {/* Additional details for admin */}
                  {notification.data && (
                    <View
                      style={{
                        backgroundColor: "#F3F4F6",
                        padding: 8,
                        borderRadius: 6,
                        marginBottom: 8,
                      }}
                    >
                      {notification.data.driverName && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#374151",
                            fontFamily: "Poppins",
                          }}
                        >
                          Driver: {notification.data.driverName}
                        </Text>
                      )}
                      {notification.data.truckNumber && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#374151",
                            fontFamily: "Poppins",
                          }}
                        >
                          Truck: {notification.data.truckNumber}
                        </Text>
                      )}
                      {notification.data.severity && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: getNotificationColor(
                              notification.data.type,
                              notification.data.severity
                            ),
                            fontWeight: "600",
                            fontFamily: "Poppins",
                          }}
                        >
                          Severity: {notification.data.severity.toUpperCase()}
                        </Text>
                      )}
                    </View>
                  )}

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      fontFamily: "Poppins",
                    }}
                  >
                    {formatTime(notification.createdAt)}
                  </Text>

                  <Text
                    style={{
                      fontSize: 10,
                      color: "#D1D5DB",
                      fontFamily: "Poppins",
                      marginTop: 4,
                    }}
                  >
                    Swipe right or tap ✕ to dismiss
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {!notification.isRead && (
                    <TouchableOpacity
                      onPress={() => handleMarkAsRead(notification._id)}
                      style={{
                        padding: 8,
                        marginLeft: 8,
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDismiss(notification._id)}
                    style={{
                      padding: 8,
                      marginLeft: 8,
                    }}
                  >
                    <Ionicons name="close" size={20} color="#F87171" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
