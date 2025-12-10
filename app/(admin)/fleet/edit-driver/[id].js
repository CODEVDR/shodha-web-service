import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import apiClient from "../../../../services/api/apiClient";

export default function EditDriver() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    name: "",
    phone: "",
    licenseNumber: "",
    isActive: true,
  });

  useEffect(() => {
    if (id) loadDriver();
  }, [id]);

  const loadDriver = async () => {
    try {
      setLoadingData(true);
      const response = await apiClient.get(`/drivers/${id}`);
      if (response.success) {
        const d = response.data || {};
        setFormData({
          username: d.username || "",
          email: d.email || "",
          name: d.name || "",
          phone: d.phone || "",
          licenseNumber: d.licenseNumber || "",
          isActive: d.isActive !== undefined ? d.isActive : true,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to load driver",
          position: "top",
        });
        router.back();
      }
    } catch (error) {
      console.error("Failed to load driver:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load driver. Please try again.",
        position: "top",
      });
      router.back();
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Name is required",
        position: "top",
      });
      return;
    }
    if (loading) return; // prevent double-submit

    // basic email check
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

    try {
      setLoading(true);
      const response = await apiClient.put(`/drivers/${id}`, {
        username: formData.username,
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        isActive: formData.isActive,
      });

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Driver Updated",
          text2: "Driver details updated successfully",
          position: "top",
        });
        setTimeout(() => router.back(), 800);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to update driver",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to update driver:", error);
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
          text2: "Failed to update driver. Please try again.",
          position: "top",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text
            className="text-gray-600 mt-4"
            style={{ fontFamily: "Poppins" }}
          >
            Loading driver...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
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
              Edit Driver
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-6 shadow-sm">
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Username
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                value={formData.username}
                onChangeText={(t) => setFormData({ ...formData, username: t })}
                autoCapitalize="none"
              />
            </View>

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
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
              />
            </View>

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
                value={formData.email}
                onChangeText={(t) =>
                  setFormData({ ...formData, email: t.toLowerCase() })
                }
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Phone
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800"
                style={{ fontFamily: "Poppins" }}
                value={formData.phone}
                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                keyboardType="phone-pad"
              />
            </View>

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
                value={formData.licenseNumber}
                onChangeText={(t) =>
                  setFormData({ ...formData, licenseNumber: t })
                }
              />
            </View>

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
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
