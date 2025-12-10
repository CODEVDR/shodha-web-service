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
  Animated,
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
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-8">
            {/* Logo Section */}
            <View className="items-center mt-12 mb-8">
              <Image
                source={require("../../assets/logo.png")}
                className="w-32 h-32"
                resizeMode="contain"
              />
              <Text
                className="text-4xl text-[#D4AF37] mt-6 text-center"
                style={{ fontFamily: "Cinzel" }}
              >
                Shodha Truck
              </Text>
              <Text
                className="text-base text-gray-600 mt-2 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                Fleet Tracking System
              </Text>
            </View>

            {/* Login Form */}
            <View className="mt-8">
              <Text
                className="text-2xl text-gray-800 mb-6"
                style={{ fontFamily: "Cinzel" }}
              >
                Welcome Back
              </Text>

              {/* Username Input */}
              <View className="mb-4">
                <Text
                  className="text-sm text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Username
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                  <Ionicons name="person-outline" size={20} color="#666" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-800"
                    style={{ fontFamily: "Poppins" }}
                    placeholder="Enter your username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text
                  className="text-sm text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Password
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                  <Ionicons name="lock-closed-outline" size={20} color="#666" />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-800"
                    style={{ fontFamily: "Poppins" }}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                className={`bg-[#D4AF37] rounded-lg py-4 items-center ${
                  isLoading ? "opacity-50" : ""
                }`}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text
                  className="text-white text-lg font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Text>
              </TouchableOpacity>

              {/* Demo Credentials */}
              <View className="mt-8 pt-6 border-t border-gray-200">
                <Text
                  className="text-sm text-gray-600 text-center mb-4"
                  style={{ fontFamily: "Poppins" }}
                >
                  Demo Credentials
                </Text>
                <View className="flex-row justify-around">
                  <TouchableOpacity
                    className="bg-gray-100 border border-[#D4AF37] rounded-lg px-6 py-3"
                    onPress={fillAdminCredentials}
                  >
                    <Text
                      className="text-[#D4AF37] font-semibold"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Admin
                    </Text>
                    <Text
                      className="text-xs text-gray-600 mt-1"
                      style={{ fontFamily: "Poppins" }}
                    >
                      admin / admin123
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-gray-100 border border-[#D4AF37] rounded-lg px-6 py-3"
                    onPress={fillDriverCredentials}
                  >
                    <Text
                      className="text-[#D4AF37] font-semibold"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Driver
                    </Text>
                    <Text
                      className="text-xs text-gray-600 mt-1"
                      style={{ fontFamily: "Poppins" }}
                    >
                      driver / driver123
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
