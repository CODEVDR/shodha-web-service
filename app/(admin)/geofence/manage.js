import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { GeofenceService } from "../../../services";

export default function ManageGeofences() {
  const router = useRouter();
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGeofences();
  }, []);

  const loadGeofences = async () => {
    try {
      setLoading(true);
      const response = await GeofenceService.getAllGeofences();
      if (response.success) {
        setGeofences(response.data || []);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to load geofences",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to load geofences:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load geofences. Please try again.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGeofences();
    setRefreshing(false);
  };

  const handleDelete = (geofence) => {
    Alert.alert(
      "Delete Geofence",
      `Are you sure you want to delete "${geofence.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await GeofenceService.deleteGeofence(
                geofence._id
              );
              if (response.success) {
                Toast.show({
                  type: "success",
                  text1: "Success",
                  text2: "Geofence deleted successfully",
                  position: "top",
                });
                loadGeofences();
              } else {
                Toast.show({
                  type: "error",
                  text1: "Error",
                  text2: response.message || "Failed to delete geofence",
                  position: "top",
                });
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to delete geofence",
                position: "top",
              });
            }
          },
        },
      ]
    );
  };

  const formatRadius = (geofence) => {
    if (geofence.type === "circle" && geofence.radius) {
      return `${geofence.radius}m radius`;
    }
    return "Polygon area";
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="text-gray-600 mt-4" style={{ fontFamily: "Poppins" }}>
          Loading geofences...
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
            onPress={() => router.push("/(admin)/geofence/create")}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text
              className="text-white text-lg font-semibold ml-2"
              style={{ fontFamily: "Poppins" }}
            >
              Create Geofence
            </Text>
          </TouchableOpacity>

          {/* Geofences List */}
          <Text
            className="text-2xl text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Geofences ({geofences.length})
          </Text>

          {geofences.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Ionicons name="location-outline" size={64} color="#D4AF37" />
              <Text
                className="text-gray-600 text-lg mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No geofences found
              </Text>
            </View>
          ) : (
            geofences.map((geofence) => (
              <View
                key={geofence._id}
                className="bg-white rounded-xl p-5 mb-4 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text
                      className="text-lg text-gray-800 mb-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {geofence.name}
                    </Text>
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="shapes-outline" size={14} color="#666" />
                      <Text
                        className="text-sm text-gray-600 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        Type:{" "}
                        {geofence.type?.charAt(0).toUpperCase() +
                          geofence.type?.slice(1)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="resize-outline" size={14} color="#666" />
                      <Text
                        className="text-sm text-gray-600 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {formatRadius(geofence)}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${geofence.isActive ? "bg-green-100" : "bg-gray-100"}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${geofence.isActive ? "text-green-600" : "text-gray-600"}`}
                      style={{ fontFamily: "Poppins" }}
                    >
                      {geofence.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
                <View className="flex-row mt-4 pt-4 border-t border-gray-100">
                  <TouchableOpacity className="flex-1 flex-row items-center justify-center py-2">
                    <Ionicons name="create-outline" size={18} color="#2196F3" />
                    <Text
                      className="text-blue-600 ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <View className="w-px bg-gray-200" />
                  <TouchableOpacity className="flex-1 flex-row items-center justify-center py-2">
                    <Ionicons name="eye-outline" size={18} color="#4CAF50" />
                    <Text
                      className="text-green-600 ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      View
                    </Text>
                  </TouchableOpacity>
                  <View className="w-px bg-gray-200" />
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center py-2"
                    onPress={() => handleDelete(geofence)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#F44336" />
                    <Text
                      className="text-red-600 ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
