import { Stack } from "expo-router";
import { TouchableOpacity, Text, View, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { logout } from "../../store/slices/authSlice";
import { AuthService } from "../../services";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState, useEffect } from "react";

// Animated Status Indicator Component
const StatusIndicator = ({ status = "active" }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "active") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [status]);

  const statusConfig = {
    active: { color: "#10B981", label: "On Duty" },
    inactive: { color: "#6B7280", label: "Off Duty" },
    break: { color: "#F59E0B", label: "On Break" },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
      }}
    >
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: config.color,
          marginRight: 6,
          transform: [{ scale: status === "active" ? pulseAnim : 1 }],
          shadowColor: config.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
        }}
      />
      <Text
        style={{
          color: "#fff",
          fontSize: 11,
          fontWeight: "600",
          fontFamily: "Poppins",
        }}
      >
        {config.label}
      </Text>
    </View>
  );
};

// Modern Header Button Component
const HeaderButton = ({ icon, onPress, label, variant = "default" }) => {
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

  const variantStyles = {
    default: {
      bg: "rgba(255, 255, 255, 0.2)",
      border: "rgba(255, 255, 255, 0.3)",
      iconColor: "#fff",
    },
    danger: {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.3)",
      iconColor: "#FEE2E2",
    },
  };

  const style = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      style={{ marginRight: 12 }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: style.bg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: style.border,
          }}
        >
          <Ionicons name={icon} size={22} color={style.iconColor} />
        </View>
        {label && (
          <Text
            style={{
              color: "#fff",
              fontSize: 9,
              fontWeight: "600",
              textAlign: "center",
              marginTop: 2,
              fontFamily: "Poppins",
            }}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Modern Back Button Component
const ModernBackButton = ({ onPress }) => {
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
      style={{ marginLeft: 8 }}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
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
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function DriverLayout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [driverStatus, setDriverStatus] = useState("active");

  // You can get driver status from Redux store if available
  // const driverStatus = useSelector((state) => state.driver?.status);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      dispatch(logout());
      Toast.show({
        type: "success",
        text1: "Logged Out",
        text2: "Drive safely! 🚗",
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
            colors={["#3B82F6", "#2563EB", "#1D4ED8"]}
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <HeaderButton
              icon="log-out-outline"
              onPress={handleLogout}
              variant="danger"
            />
          </View>
        ),
        animation: "slide_from_right",
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "My Dashboard",
          headerLeft: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 4,
              }}
            >
              <StatusIndicator status={driverStatus} />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="shift/active"
        options={{
          title: "Active Shift",
          headerLeft: () => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <ModernBackButton onPress={() => router.back()} />
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: "rgba(16, 185, 129, 0.3)",
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
                  🟢 LIVE
                </Text>
              </View>
              <HeaderButton
                icon="log-out-outline"
                onPress={handleLogout}
                variant="danger"
              />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="shift/trips"
        options={{
          title: "My Trips",
          headerLeft: () => <ModernBackButton onPress={() => router.back()} />,
        }}
      />
      <Stack.Screen
        name="shift/history"
        options={{
          title: "Shift History",
          headerLeft: () => <ModernBackButton onPress={() => router.back()} />,
        }}
      />
      <Stack.Screen
        name="trip/[id]"
        options={{
          title: "Trip Details",
          headerLeft: () => <ModernBackButton onPress={() => router.back()} />,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <HeaderButton
                icon="map-outline"
                onPress={() => {
                  Toast.show({
                    type: "info",
                    text1: "Navigation",
                    text2: "Opening map...",
                  });
                }}
              />
              <HeaderButton
                icon="call-outline"
                onPress={() => {
                  Toast.show({
                    type: "info",
                    text1: "Support",
                    text2: "Calling support...",
                  });
                }}
              />
              <HeaderButton
                icon="log-out-outline"
                onPress={handleLogout}
                variant="danger"
              />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="trip/end"
        options={{
          title: "Complete Trip",
          headerLeft: () => <ModernBackButton onPress={() => router.back()} />,
          headerRight: () => (
            <View
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                marginRight: 12,
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.3)",
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
                ⚠️ ENDING
              </Text>
            </View>
          ),
        }}
      />
    </Stack>
  );
}
