import { Stack } from "expo-router";
import { TouchableOpacity, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { logout } from "../../store/slices/authSlice";
import { AuthService, NotificationService } from "../../services";
import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../utils/constants";

export default function AdminLayout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [unreadCount, setUnreadCount] = useState(0);

  // Debug function to inspect AsyncStorage
  const debugAsyncStorage = async () => {
    try {
      console.log("=== AsyncStorage Debug ===");
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("All AsyncStorage keys:", allKeys);

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`${key}:`, value);
      }
      console.log("=== End AsyncStorage Debug ===");
    } catch (error) {
      console.error("Error debugging AsyncStorage:", error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      // Debug AsyncStorage first
      await debugAsyncStorage();

      // Check if token exists before making API call
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      console.log("AdminLayout.loadUnreadCount - Token exists:", !!token);
      console.log(
        "AdminLayout.loadUnreadCount - Token value:",
        token ? token.substring(0, 20) + "..." : "null"
      );
      console.log("AdminLayout.loadUnreadCount - User data:", userData);

      if (!token) {
        console.log(
          "No authentication token found, skipping unread count load"
        );
        setUnreadCount(0);
        return;
      }

      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
      setUnreadCount(0);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      // Add a delay to allow app to settle before checking authentication
      const timeoutId = setTimeout(() => {
        loadUnreadCount();
      }, 1000);

      // Set up polling for unread count
      const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds

      return () => {
        clearTimeout(timeoutId);
        clearInterval(interval);
      };
    }, [])
  );

  const handleNotificationPress = () => {
    router.push("/(admin)/notifications");
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      dispatch(logout());
      Toast.show({
        type: "success",
        text1: "Logged Out",
        text2: "You have been logged out successfully",
        position: "top",
      });
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#D4AF37",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontFamily: "Cinzel",
          fontSize: 20,
        },
        headerRight: () => (
          <View className="flex-row items-center mr-4">
            {/* Notifications Button */}
            <TouchableOpacity
              onPress={handleNotificationPress}
              className="mr-4 relative"
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Admin Dashboard",
        }}
      />
      <Stack.Screen
        name="tracking/live"
        options={{
          title: "Live Tracking",
        }}
      />
      <Stack.Screen
        name="fleet/trucks"
        options={{
          title: "Manage Trucks",
        }}
      />
      <Stack.Screen
        name="fleet/drivers"
        options={{
          title: "Manage Drivers",
        }}
      />
      <Stack.Screen
        name="fleet/shifts"
        options={{
          title: "Manage Shifts",
        }}
      />
      <Stack.Screen
        name="geofence/manage"
        options={{
          title: "Geofences",
        }}
      />
      <Stack.Screen
        name="geofence/create"
        options={{
          title: "Create Geofence",
        }}
      />
      <Stack.Screen
        name="reports/index"
        options={{
          title: "Reports",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
        }}
      />
    </Stack>
  );
}
