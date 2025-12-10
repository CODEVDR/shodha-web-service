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
import { useState, useEffect } from "react";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TruckService } from "../../../services";

export default function ManageTrucks() {
  const router = useRouter();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrucks();
  }, []);

  const loadTrucks = async () => {
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

      const response = await TruckService.getAllTrucks();
      if (response.success) {
        setTrucks(response.data || []);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to load trucks",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to load trucks:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load trucks. Please try again.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrucks();
    setRefreshing(false);
  };

  const handleAddTruck = () => {
    router.push("/(admin)/fleet/add-truck");
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "active":
        return { bg: "bg-green-100", text: "text-green-600" };
      case "maintenance":
        return { bg: "bg-orange-100", text: "text-orange-600" };
      case "in-use":
        return { bg: "bg-blue-100", text: "text-blue-600" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="text-gray-600 mt-4" style={{ fontFamily: "Poppins" }}>
          Loading trucks...
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
            onPress={handleAddTruck}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text
              className="text-white text-lg font-semibold ml-2"
              style={{ fontFamily: "Poppins" }}
            >
              Add New Truck
            </Text>
          </TouchableOpacity>

          {/* Trucks List */}
          <Text
            className="text-2xl text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Fleet ({trucks.length})
          </Text>

          {trucks.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Ionicons name="car-outline" size={64} color="#D4AF37" />
              <Text
                className="text-gray-600 text-lg mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No trucks found
              </Text>
            </View>
          ) : (
            trucks.map((truck) => {
              const statusColors = getStatusColor(truck.status);
              return (
                <View
                  key={truck._id}
                  className="bg-white rounded-xl p-5 mb-4 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <Text
                        className="text-lg text-gray-800 mb-1"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {truck.registrationNumber}
                      </Text>
                      <Text
                        className="text-base text-gray-600"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {truck.model}
                      </Text>
                      {truck.capacity && (
                        <Text
                          className="text-sm text-gray-500 mt-1"
                          style={{ fontFamily: "Poppins" }}
                        >
                          Capacity: {truck.capacity} kg
                        </Text>
                      )}
                    </View>
                    <View
                      className={`px-3 py-1 rounded-full ${statusColors.bg}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${statusColors.text}`}
                        style={{ fontFamily: "Poppins" }}
                      >
                        {truck.status?.charAt(0).toUpperCase() +
                          truck.status?.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row mt-4 pt-4 border-t border-gray-100">
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center py-2"
                      onPress={() =>
                        router.push(`/(admin)/fleet/edit-truck/${truck._id}`)
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
                    <TouchableOpacity className="flex-1 flex-row items-center justify-center py-2">
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color="#4CAF50"
                      />
                      <Text
                        className="text-green-600 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Track
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
