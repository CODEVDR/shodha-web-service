import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import apiClient from "../../../services/api/apiClient";

export default function ManageDrivers() {
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);

      // Check if we have auth token
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) {
        console.error("No auth token found");
        Toast.show({
          type: "error",
          text1: "Authentication Error",
          text2: "Please log in again",
          position: "top",
        });
        router.replace("/(auth)/login");
        return;
      }

      const response = await apiClient.get("/drivers");
      if (response.success) {
        setDrivers(response.data || []);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to load drivers",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to load drivers:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load drivers. Please try again.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDrivers();
    setRefreshing(false);
  };

  const handleAddDriver = () => {
    router.push("/(admin)/fleet/add-driver");
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Toast.show({
        type: "info",
        text1: "No Phone Number",
        text2: "Phone number not available for this driver",
        position: "top",
      });
    }
  };

  const getDriverStatus = (driver) => {
    if (driver.assignedTruck) return "On Duty";
    if (driver.isActive) return "Off Duty";
    return "Inactive";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "On Duty":
        return { bg: "bg-green-100", text: "text-green-600" };
      case "Off Duty":
        return { bg: "bg-gray-100", text: "text-gray-600" };
      case "Inactive":
      case "On Leave":
        return { bg: "bg-orange-100", text: "text-orange-600" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="text-gray-600 mt-4" style={{ fontFamily: "Poppins" }}>
          Loading drivers...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D4AF37"]}
          />
        }
      >
        <View className="p-6">
          {/* Add Button */}
          <TouchableOpacity
            className="bg-[#D4AF37] rounded-xl py-4 flex-row items-center justify-center mb-6"
            onPress={handleAddDriver}
          >
            <Ionicons name="person-add-outline" size={24} color="#fff" />
            <Text
              className="text-white text-lg font-semibold ml-2"
              style={{ fontFamily: "Poppins" }}
            >
              Add New Driver
            </Text>
          </TouchableOpacity>

          {/* Drivers List */}
          <Text
            className="text-2xl text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Drivers ({drivers.length})
          </Text>

          {drivers.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Ionicons name="people-outline" size={64} color="#D4AF37" />
              <Text
                className="text-gray-600 text-lg mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No drivers found
              </Text>
            </View>
          ) : (
            drivers.map((driver) => {
              const status = getDriverStatus(driver);
              const statusColors = getStatusColor(status);
              return (
                <View
                  key={driver._id}
                  className="bg-white rounded-xl p-5 mb-4 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <Text
                        className="text-lg text-gray-800 mb-1"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {driver.name}
                      </Text>
                      <Text
                        className="text-sm text-gray-600 mb-1"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {driver.phone || "No phone"}
                      </Text>
                      {driver.assignedTruck && (
                        <View className="flex-row items-center mt-1">
                          <Ionicons
                            name="car-outline"
                            size={14}
                            color="#D4AF37"
                          />
                          <Text
                            className="text-sm text-gray-500 ml-1"
                            style={{ fontFamily: "Poppins" }}
                          >
                            {driver.assignedTruck.registrationNumber ||
                              "Truck assigned"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View
                      className={`px-3 py-1 rounded-full ${statusColors.bg}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${statusColors.text}`}
                        style={{ fontFamily: "Poppins" }}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row mt-4 pt-4 border-t border-gray-100">
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center py-2"
                      onPress={() =>
                        router.push(`/(admin)/fleet/edit-driver/${driver._id}`)
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="#2196F3"
                      />
                      <Text
                        className="text-blue-600 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <View className="w-px bg-gray-200" />
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center py-2"
                      onPress={() => handleCall(driver.phone)}
                    >
                      <Ionicons name="call-outline" size={18} color="#4CAF50" />
                      <Text
                        className="text-green-600 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Call
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
