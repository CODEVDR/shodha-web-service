import { Stack } from "expo-router";
import { TouchableOpacity, View, Text, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { logout } from "../../store/slices/authSlice";
import { AuthService, NotificationService } from "../../services";
import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../utils/constants";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// Modern Animated Notification Badge Component
const AnimatedNotificationBadge = ({ count }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      // Scale animation when count changes
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
      ]).start();

      // Continuous pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [count]);

  if (count === 0) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -8,
        right: -8,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <LinearGradient
        colors={["#EF4444", "#DC2626"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6,
          borderWidth: 2,
          borderColor: "#fff",
          shadowColor: "#EF4444",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 11,
            fontWeight: "700",
            fontFamily: "Poppins",
          }}
        >
          {count > 99 ? "99+" : count}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

// Modern Header Button Component
const HeaderButton = ({ icon, onPress, badge, isLogout = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      style={{ marginLeft: 16 }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          position: "relative",
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isLogout
              ? "rgba(239, 68, 68, 0.15)"
              : "rgba(255, 255, 255, 0.2)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: isLogout
              ? "rgba(239, 68, 68, 0.3)"
              : "rgba(255, 255, 255, 0.3)",
          }}
        >
          <Ionicons
            name={icon}
            size={22}
            color={isLogout ? "#FEE2E2" : "#fff"}
          />
        </View>
        {badge !== undefined && <AnimatedNotificationBadge count={badge} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Modern Header Right Component
const ModernHeaderRight = ({ unreadCount, onNotificationPress, onLogout }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
      }}
    >
      <HeaderButton
        icon="notifications-outline"
        onPress={onNotificationPress}
        badge={unreadCount}
      />
      <HeaderButton icon="log-out-outline" onPress={onLogout} isLogout={true} />
    </View>
  );
};

export default function AdminLayout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [unreadCount, setUnreadCount] = useState(0);

  const debugAsyncStorage = async () => {
    if (__DEV__) {
      try {
        console.log("=== AsyncStorage Debug ===");
        const allKeys = await AsyncStorage.getAllKeys();
        console.log("All AsyncStorage keys:", allKeys);

        for (const key of allKeys) {
          const value = await AsyncStorage.getItem(key);
          console.log(`${key}:`, value?.substring(0, 50));
        }
        console.log("=== End AsyncStorage Debug ===");
      } catch (error) {
        console.error("Error debugging AsyncStorage:", error);
      }
    }
  };

  const loadUnreadCount = async () => {
    try {
      if (__DEV__) {
        await debugAsyncStorage();
      }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (__DEV__) {
        console.log("AdminLayout - Token exists:", !!token);
        console.log("AdminLayout - User data:", userData ? "Present" : "None");
      }

      if (!token) {
        console.log("No auth token, skipping unread count");
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
      const timeoutId = setTimeout(() => {
        loadUnreadCount();
      }, 500);

      const interval = setInterval(loadUnreadCount, 30000);

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
        text2: "See you soon! 👋",
        position: "top",
        visibilityTime: 2000,
      });
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to logout. Please try again.",
        position: "top",
      });
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "transparent",
        },
        headerBackground: () => (
          <LinearGradient
            colors={["#D4AF37", "#C9A635", "#B89030"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flex: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
            }}
          />
        ),
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontFamily: "Cinzel",
          fontSize: 20,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        headerTitleAlign: "left",
        headerShadowVisible: true,
        headerRight: () => (
          <ModernHeaderRight
            unreadCount={unreadCount}
            onNotificationPress={handleNotificationPress}
            onLogout={handleLogout}
          />
        ),
        // Modern animation
        animation: "slide_from_right",
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerLeft: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 4,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#10B981",
                  marginRight: 12,
                  shadowColor: "#10B981",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="tracking/live"
        options={{
          title: "Live Tracking",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="fleet/trucks"
        options={{
          title: "Fleet Management",
          headerSubtitle: "Trucks",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="fleet/drivers"
        options={{
          title: "Fleet Management",
          headerSubtitle: "Drivers",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="fleet/shifts"
        options={{
          title: "Shift Management",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="geofence/manage"
        options={{
          title: "Geofence Zones",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="geofence/create"
        options={{
          title: "Create Geofence",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="reports/index"
        options={{
          title: "Analytics & Reports",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8 }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
