import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import Toast from "react-native-toast-message";
import apiClient from "../../../services/api/apiClient";

export default function AddDriver() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    name: "",
    phone: "",
    licenseNumber: "",
  });

  const handleSubmit = async () => {
    if (loading) return; // prevent double-submit
    // Validation
    // Basic client-side validation
    if (
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.name.trim()
    ) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please fill in all required fields",
        position: "top",
      });
      return;
    }

    if (formData.username.trim().length < 3) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Username must be at least 3 characters",
        position: "top",
      });
      return;
    }

    // Email basic check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter a valid email",
        position: "top",
      });
      return;
    }

    if (formData.password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Password must be at least 6 characters",
        position: "top",
      });
      return;
    }
    try {
      setLoading(true);
      const response = await apiClient.post("/auth/register", {
        ...formData,
        role: "driver",
      });

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Driver Added",
          text2: "New driver has been registered successfully",
          position: "top",
        });

        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to add driver",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to add driver:", error);
      // If backend returned structured validation errors (express-validator)
      if (error && Array.isArray(error.errors)) {
        const messages = error.errors.map((e) => e.msg).join(". ");
        Toast.show({
          type: "error",
          text1: "Validation Error",
          text2: messages,
          position: "top",
        });
      } else if (error && error.message) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message,
          position: "top",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to add driver. Please try again.",
          position: "top",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 p-2 rounded-full bg-white"
            >
              <Ionicons name="arrow-back" size={24} color="#D4AF37" />
            </TouchableOpacity>
            <Text
              className="text-2xl text-gray-800 flex-1"
              style={{ fontFamily: "Cinzel" }}
            >
              Add New Driver
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            {/* Username */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Username *
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter username"
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text.toLowerCase() })
                }
                autoCapitalize="none"
              />
            </View>

            {/* Full Name */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Full Name *
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter full name"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Email *
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter email"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text.toLowerCase() })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Password *
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter password"
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Phone Number
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter phone number"
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                keyboardType="phone-pad"
              />
            </View>

            {/* License Number */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                License Number
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter license number"
                value={formData.licenseNumber}
                onChangeText={(text) =>
                  setFormData({ ...formData, licenseNumber: text })
                }
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-[#D4AF37] rounded-lg p-4 items-center"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className="text-white text-lg font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  Add Driver
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
