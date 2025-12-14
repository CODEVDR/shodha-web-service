import { Stack } from "expo-router";
import {
  TouchableOpacity,
  Text,
  View,
  Animated,
  Platform,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { logout } from "../../store/slices/authSlice";
import { AuthService } from "../../services";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useRef,
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DRIVER_ENGLISH,
  DRIVER_HINDI,
  DRIVER_TELUGU,
  DRIVER_TAMIL,
} from "../../utils/driverLanguageConstants";

// Language constants mapping
const LANGUAGES = {
  english: DRIVER_ENGLISH,
  hindi: DRIVER_HINDI,
  telugu: DRIVER_TELUGU,
  tamil: DRIVER_TAMIL,
};

// Create Language Context
const LanguageContext = createContext();

// Hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

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

  const { LANG } = useLanguage();

  const activeLabel =
    (LANG && (LANG.status?.active || LANG.status?.onDuty)) ||
    (LANG && (LANG.shift?.active || LANG.shift?.onDuty)) ||
    LANG?.driver ||
    "Active";

  const inactiveLabel =
    (LANG && (LANG.status?.inactive || LANG.status?.offDuty)) ||
    (LANG && (LANG.shift?.noActiveShift || LANG.shift?.offDuty)) ||
    LANG?.driver ||
    "Off Duty";

  const breakLabel =
    (LANG && (LANG.status?.onBreak || LANG.status?.break)) ||
    (LANG && LANG.shift?.onBreak) ||
    "On Break";

  const statusConfig = {
    active: { color: "#10B981", label: activeLabel },
    inactive: { color: "#6B7280", label: inactiveLabel },
    break: { color: "#F59E0B", label: breakLabel },
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
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Load saved language preference
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem("driverLanguage");
      if (savedLang && LANGUAGES[savedLang]) {
        setSelectedLanguage(savedLang);
      }
    } catch (error) {
      console.error("Failed to load language:", error);
    }
  };

  const changeLanguage = async (lang) => {
    try {
      setSelectedLanguage(lang);
      await AsyncStorage.setItem("driverLanguage", lang);
      setShowLanguageModal(false);
      Toast.show({
        type: "success",
        text1: LANGUAGES[lang].language.title,
        text2: `${LANGUAGES[lang].language.select}: ${LANGUAGES[lang].language[lang]}`,
        position: "top",
      });
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  };

  const LANG = LANGUAGES[selectedLanguage];

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      dispatch(logout());
      Toast.show({
        type: "success",
        text1: LANG.auth.loggedOut,
        text2: LANG.auth.logoutMessage,
        position: "top",
        visibilityTime: 2000,
      });
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
      Toast.show({
        type: "error",
        text1: LANG.error,
        text2: LANG.auth.logoutError,
        position: "top",
      });
    }
  };

  return (
    <LanguageContext.Provider
      value={{ LANG, selectedLanguage, changeLanguage, setShowLanguageModal }}
    >
      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              padding: 24,
              width: "85%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                marginBottom: 20,
                fontFamily: "Cinzel",
                color: "#1F2937",
              }}
            >
              {LANG.language.title}
            </Text>

            {Object.keys(LANGUAGES).map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => changeLanguage(lang)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  backgroundColor:
                    selectedLanguage === lang ? "#3B82F6" : "#F3F4F6",
                }}
              >
                {selectedLanguage === lang && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#fff"
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: "Poppins",
                    color: selectedLanguage === lang ? "#fff" : "#1F2937",
                    fontWeight: selectedLanguage === lang ? "600" : "400",
                  }}
                >
                  {LANGUAGES[lang].language[lang]}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setShowLanguageModal(false)}
              style={{
                marginTop: 12,
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                backgroundColor: "#E5E7EB",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Poppins",
                  color: "#1F2937",
                  fontWeight: "600",
                }}
              >
                {LANG.cancel}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
                icon="language-outline"
                onPress={() => setShowLanguageModal(true)}
              />
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
            title: LANG.dashboard?.title || "Dashboard",
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
            title:
              LANG.shift?.activeShift || LANG.shift?.active || "Active Shift",
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
                    🟢 {LANG.status?.live || "LIVE"}
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
            title: LANG.trips?.myTrips || LANG.trips?.title || "My Trips",
            headerLeft: () => (
              <ModernBackButton onPress={() => router.back()} />
            ),
          }}
        />
        <Stack.Screen
          name="shift/history"
          options={{
            title:
              LANG.shift?.history || LANG.history?.title || "Shift History",
            headerLeft: () => (
              <ModernBackButton onPress={() => router.back()} />
            ),
          }}
        />
        <Stack.Screen
          name="trip/[id]"
          options={{
            title: LANG.trip?.details || LANG.trip?.title || "Trip Details",
            headerLeft: () => (
              <ModernBackButton onPress={() => router.back()} />
            ),
            headerRight: () => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <HeaderButton
                  icon="map-outline"
                  onPress={() => {
                    Toast.show({
                      type: "info",
                      text1: LANG.navigation?.title || "Navigation",
                      text2: LANG.navigation?.opening || "Opening map...",
                    });
                  }}
                />
                <HeaderButton
                  icon="call-outline"
                  onPress={() => {
                    Toast.show({
                      type: "info",
                      text1: LANG.support?.title || "Support",
                      text2: LANG.support?.calling || "Calling support...",
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
            title: LANG.trip?.complete || LANG.trip?.end || "Complete Trip",
            headerLeft: () => (
              <ModernBackButton onPress={() => router.back()} />
            ),
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
                  {LANG.trip?.ending || LANG.status?.ending || "ENDING"}
                </Text>
              </View>
            ),
          }}
        />
      </Stack>
    </LanguageContext.Provider>
  );
}
