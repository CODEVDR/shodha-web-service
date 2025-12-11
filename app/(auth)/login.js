import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { AuthService } from "../../services";
import {
  loginStart,
  loginSuccess,
  loginFailure,
} from "../../store/slices/authSlice";
import { ROLES } from "../../utils";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();

  // Responsive breakpoints
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter username and password",
        position: "top",
      });
      return;
    }

    try {
      setIsLoading(true);
      dispatch(loginStart());

      console.log("Attempting login with username:", username.trim());
      console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);

      const response = await AuthService.login(username.trim(), password);
      console.log("Login response:", response);

      dispatch(loginSuccess(response));

      Toast.show({
        type: "success",
        text1: "Login Successful",
        text2: `Welcome back, ${response.user.name}!`,
        position: "top",
      });

      // Redirect based on role
      setTimeout(() => {
        if (response.role === ROLES.ADMIN) {
          router.replace("/(admin)");
        } else if (response.role === ROLES.DRIVER) {
          router.replace("/(driver)");
        }
      }, 500);
    } catch (error) {
      console.error("Login error details:", {
        message: error.message,
        response: error.response,
        request: error.request,
        error: error,
      });

      dispatch(loginFailure(error.message));

      let errorMessage = "Network error. Please check if backend is running.";
      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          error.message ||
          "Invalid credentials";
      } else if (error.request) {
        errorMessage =
          "Cannot connect to server. Make sure backend is running on http://10.165.23.14:5000";
      } else {
        errorMessage = error.message || "Login failed";
      }

      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: errorMessage,
        position: "top",
        visibilityTime: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setUsername("admin");
    setPassword("admin123");
  };

  const fillDriverCredentials = () => {
    setUsername("driver1");
    setPassword("driver123");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: isDesktop ? "center" : "flex-start",
            alignItems: isDesktop ? "center" : "stretch",
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Desktop: Two-column layout, Mobile: Single column */}
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              width: "100%",
              maxWidth: isDesktop ? 1200 : "100%",
              alignItems: isDesktop ? "center" : "stretch",
            }}
          >
            {/* Left Section - Logo & Branding (Desktop side panel, Mobile top) */}
            <View
              style={{
                width: isDesktop ? "50%" : "100%",
                backgroundColor: isDesktop ? "#F9FAFB" : "white",
                padding: isDesktop ? 60 : isMobile ? 24 : 40,
                alignItems: "center",
                justifyContent: "center",
                minHeight: isDesktop ? 600 : isMobile ? 300 : 400,
              }}
            >
              <Image
                source={require("../../assets/logo.png")}
                style={{
                  width: isDesktop ? 160 : isTablet ? 140 : 120,
                  height: isDesktop ? 160 : isTablet ? 140 : 120,
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontFamily: "Cinzel",
                  fontSize: isDesktop ? 48 : isTablet ? 40 : 32,
                  color: "#D4AF37",
                  marginTop: 24,
                  textAlign: "center",
                }}
              >
                Shodha Truck
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
                  color: "#6B7280",
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Fleet Tracking System
              </Text>

              {/* Desktop only - additional branding text */}
              {isDesktop && (
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 14,
                    color: "#9CA3AF",
                    marginTop: 40,
                    textAlign: "center",
                    maxWidth: 300,
                    lineHeight: 20,
                  }}
                >
                  Manage your fleet efficiently with real-time tracking and
                  comprehensive analytics
                </Text>
              )}
            </View>

            {/* Right Section - Login Form */}
            <View
              style={{
                width: isDesktop ? "50%" : "100%",
                padding: isDesktop ? 60 : isMobile ? 24 : 40,
                justifyContent: "center",
              }}
            >
              <View style={{ maxWidth: isDesktop ? 440 : "100%" }}>
                <Text
                  style={{
                    fontFamily: "Cinzel",
                    fontSize: isDesktop ? 32 : isTablet ? 28 : 24,
                    color: "#1F2937",
                    marginBottom: 8,
                  }}
                >
                  Welcome Back
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: isDesktop ? 16 : 14,
                    color: "#6B7280",
                    marginBottom: 32,
                  }}
                >
                  Sign in to continue to your account
                </Text>

                {/* Username Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 14,
                      color: "#374151",
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Username
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: isDesktop ? 14 : 12,
                      backgroundColor: "#F9FAFB",
                    }}
                  >
                    <Ionicons name="person-outline" size={20} color="#6B7280" />
                    <TextInput
                      style={{
                        flex: 1,
                        marginLeft: 12,
                        fontSize: isDesktop ? 16 : 15,
                        color: "#1F2937",
                        fontFamily: "Poppins",
                      }}
                      placeholder="Enter your username"
                      placeholderTextColor="#9CA3AF"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 14,
                      color: "#374151",
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Password
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: isDesktop ? 14 : 12,
                      backgroundColor: "#F9FAFB",
                    }}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#6B7280"
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        marginLeft: 12,
                        fontSize: isDesktop ? 16 : 15,
                        color: "#1F2937",
                        fontFamily: "Poppins",
                      }}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#D4AF37",
                    borderRadius: 12,
                    paddingVertical: isDesktop ? 16 : 14,
                    alignItems: "center",
                    opacity: isLoading ? 0.5 : 1,
                    shadowColor: "#D4AF37",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: isDesktop ? 18 : 16,
                      color: "white",
                      fontWeight: "600",
                    }}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Text>
                </TouchableOpacity>

                {/* Demo Credentials */}
                <View
                  style={{
                    marginTop: 40,
                    paddingTop: 32,
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 13,
                      color: "#6B7280",
                      textAlign: "center",
                      marginBottom: 16,
                      fontWeight: "500",
                    }}
                  >
                    Demo Credentials
                  </Text>
                  <View
                    style={{
                      flexDirection: isDesktop || isTablet ? "row" : "column",
                      justifyContent: "space-around",
                      gap: 12,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flex: isDesktop || isTablet ? 1 : undefined,
                        backgroundColor: "white",
                        borderWidth: 2,
                        borderColor: "#D4AF37",
                        borderRadius: 12,
                        padding: 16,
                        alignItems: "center",
                      }}
                      onPress={fillAdminCredentials}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 15,
                          color: "#D4AF37",
                          fontWeight: "600",
                        }}
                      >
                        Admin
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 12,
                          color: "#6B7280",
                          marginTop: 4,
                        }}
                      >
                        admin / admin123
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: isDesktop || isTablet ? 1 : undefined,
                        backgroundColor: "white",
                        borderWidth: 2,
                        borderColor: "#D4AF37",
                        borderRadius: 12,
                        padding: 16,
                        alignItems: "center",
                      }}
                      onPress={fillDriverCredentials}
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 15,
                          color: "#D4AF37",
                          fontWeight: "600",
                        }}
                      >
                        Driver
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 12,
                          color: "#6B7280",
                          marginTop: 4,
                        }}
                      >
                        driver1 / driver123
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
