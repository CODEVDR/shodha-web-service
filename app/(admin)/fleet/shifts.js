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
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { ShiftService } from "../../../services";

export default function ManageShifts() {
  const router = useRouter();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await ShiftService.getAllShifts();
      if (response.success) {
        setShifts(response.data || []);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to load shifts",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to load shifts:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load shifts. Please try again.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
  };

  const handleCreateShift = () => {
    router.push("/(admin)/fleet/create-shift");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getTimeRange = (shift) => {
    const start = formatTime(shift.startTime);
    const end = shift.endTime ? formatTime(shift.endTime) : "Ongoing";
    return `${start} - ${end}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "in-progress":
        return { bg: "bg-green-100", text: "text-green-600" };
      case "scheduled":
        return { bg: "bg-blue-100", text: "text-blue-600" };
      case "completed":
        return { bg: "bg-gray-100", text: "text-gray-600" };
      case "cancelled":
        return { bg: "bg-red-100", text: "text-red-600" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="text-gray-600 mt-4" style={{ fontFamily: "Poppins" }}>
          Loading shifts...
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
          {/* Create Button */}
          <TouchableOpacity
            className="bg-[#D4AF37] rounded-xl py-4 flex-row items-center justify-center mb-6"
            onPress={handleCreateShift}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text
              className="text-white text-lg font-semibold ml-2"
              style={{ fontFamily: "Poppins" }}
            >
              Create New Shift
            </Text>
          </TouchableOpacity>

          {/* Shifts List */}
          <Text
            className="text-2xl text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Shifts ({shifts.length})
          </Text>

          {shifts.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Ionicons name="calendar-outline" size={64} color="#D4AF37" />
              <Text
                className="text-gray-600 text-lg mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No shifts found
              </Text>
            </View>
          ) : (
            shifts.map((shift) => {
              const statusColors = getStatusColor(shift.status);
              return (
                <View
                  key={shift._id}
                  className="bg-white rounded-xl p-5 mb-4 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1">
                      <Text
                        className="text-lg text-gray-800 mb-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {shift.driver?.name || "Unknown Driver"}
                      </Text>
                      <View className="flex-row items-center mb-1">
                        <Ionicons name="car-outline" size={14} color="#666" />
                        <Text
                          className="text-sm text-gray-600 ml-2"
                          style={{ fontFamily: "Poppins" }}
                        >
                          {shift.truck?.registrationNumber || "No truck"}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text
                          className="text-sm text-gray-600 ml-2"
                          style={{ fontFamily: "Poppins" }}
                        >
                          {getTimeRange(shift)}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#666"
                        />
                        <Text
                          className="text-sm text-gray-600 ml-2"
                          style={{ fontFamily: "Poppins" }}
                        >
                          {formatDate(shift.startTime)}
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`px-3 py-1 rounded-full ${statusColors.bg}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${statusColors.text}`}
                        style={{ fontFamily: "Poppins" }}
                      >
                        {shift.status?.charAt(0).toUpperCase() +
                          shift.status?.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row mt-2 pt-4 border-t border-gray-100">
                    <TouchableOpacity
                      className="flex-1 flex-row items-center justify-center py-2"
                      onPress={() =>
                        router.push(`/(admin)/fleet/edit-shift/${shift._id}`)
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
                        name="trash-outline"
                        size={18}
                        color="#F44336"
                      />
                      <Text
                        className="text-red-600 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Cancel
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
