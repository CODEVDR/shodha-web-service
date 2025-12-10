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

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const stored = await NotificationService.getStoredNotifications();
      setNotifications(stored);
    } catch (error) {
      console.error("Failed to load notifications:", error);
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
      await NotificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleDismiss = async (notificationId) => {
    try {
      await NotificationService.dismissNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "TRIP_ASSIGNED":
        return "navigate";
      case "TRIP_STARTED":
        return "play-circle";
      case "TRIP_COMPLETED":
        return "checkmark-circle";
      case "BREAKDOWN_REPORTED":
        return "warning";
      case "TRIP_STATUS_CHANGE":
        return "refresh";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "TRIP_ASSIGNED":
        return "#2196F3";
      case "TRIP_STARTED":
        return "#4CAF50";
      case "TRIP_COMPLETED":
        return "#4CAF50";
      case "BREAKDOWN_REPORTED":
        return "#F44336";
      case "TRIP_STATUS_CHANGE":
        return "#FF9800";
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
          Notifications
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
            {notifications.filter((n) => !n.read).length} unread
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
              name="notifications-off-outline"
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
              No notifications yet
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
              You'll see trip updates and alerts here
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View
              key={notification.id}
              style={{
                backgroundColor: "#FFF",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getNotificationColor(
                  notification.data?.type || notification.type
                ),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
                opacity: notification.read ? 0.7 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    backgroundColor:
                      getNotificationColor(
                        notification.data?.type || notification.type
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
                      notification.data?.type || notification.type
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

                  <Text
                    style={{
                      fontSize: 12,
                      color: "#9CA3AF",
                      fontFamily: "Poppins",
                    }}
                  >
                    {formatTime(notification.timestamp)}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {!notification.read && (
                    <TouchableOpacity
                      onPress={() => handleMarkAsRead(notification.id)}
                      style={{
                        padding: 8,
                        marginLeft: 8,
                      }}
                    >
                      <Ionicons name="checkmark" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDismiss(notification.id)}
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
