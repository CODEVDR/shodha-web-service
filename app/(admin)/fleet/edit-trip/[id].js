import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import { TripService, GeofenceService } from "../../../../services";

export default function EditTrip() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [trip, setTrip] = useState(null);

  // Form state
  const [status, setStatus] = useState("");
  const [selectedGeofences, setSelectedGeofences] = useState([]);
  const [notes, setNotes] = useState("");

  // Data lists
  const [geofences, setGeofences] = useState([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [tripRes, geofencesRes] = await Promise.all([
        TripService.getTripById(id),
        GeofenceService.getAllGeofences(),
      ]);

      if (tripRes.success) {
        const tripData = tripRes.data;
        setTrip(tripData);
        setStatus(tripData.status);
        setSelectedGeofences(tripData.geofences?.map((g) => g._id || g) || []);
        setNotes(tripData.notes || "");
      } else {
        throw new Error(tripRes.message || "Failed to load trip");
      }

      if (geofencesRes.success) {
        setGeofences(geofencesRes.data || []);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load trip data",
      });
      router.back();
    } finally {
      setLoadingData(false);
    }
  };

  const toggleGeofence = (geofenceId) => {
    setSelectedGeofences((prev) => {
      if (prev.includes(geofenceId)) {
        return prev.filter((id) => id !== geofenceId);
      } else {
        return [...prev, geofenceId];
      }
    });
  };

  const handleUpdate = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const updateData = {
        status,
        geofences: selectedGeofences,
        notes: notes.trim(),
      };

      const response = await TripService.updateTrip(id, updateData);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Trip updated successfully",
        });
        router.back();
      } else {
        throw new Error(response.message || "Failed to update trip");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update trip",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this trip? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await TripService.deleteTrip(id);
              if (response.success) {
                Toast.show({
                  type: "success",
                  text1: "Success",
                  text2: "Trip deleted successfully",
                });
                router.back();
              } else {
                throw new Error(response.message || "Failed to delete trip");
              }
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message || "Failed to delete trip",
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#F59E0B";
      case "in-progress":
        return "#3B82F6";
      case "completed":
        return "#10B981";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            Loading trip details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text
            className="text-gray-700 mt-4 text-center"
            style={{ fontFamily: "Poppins" }}
          >
            Trip not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 bg-[#D4AF37] px-6 py-3 rounded-xl"
          >
            <Text
              className="text-white font-semibold"
              style={{ fontFamily: "Poppins" }}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mr-4 p-2"
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text
                className="text-3xl text-gray-800"
                style={{ fontFamily: "Cinzel" }}
              >
                Trip Details
              </Text>
            </View>
          </View>

          {/* Trip Info Card */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Trip Information
              </Text>
              <View
                style={{
                  backgroundColor: getStatusColor(trip.status) + "20",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontWeight: "600",
                    fontSize: 12,
                    color: getStatusColor(trip.status),
                  }}
                >
                  {trip.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View className="space-y-3">
              <View className="flex-row items-center">
                <Ionicons name="person-outline" size={18} color="#6B7280" />
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 14,
                    color: "#374151",
                    marginLeft: 8,
                  }}
                >
                  Driver: {trip.driver?.name || "N/A"}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="car-outline" size={18} color="#6B7280" />
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 14,
                    color: "#374151",
                    marginLeft: 8,
                  }}
                >
                  Truck: {trip.truck?.registrationNumber || "N/A"}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 14,
                    color: "#374151",
                    marginLeft: 8,
                  }}
                >
                  Created: {formatDate(trip.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Route Details */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              style={{
                fontFamily: "Poppins",
                fontWeight: "600",
                fontSize: 16,
                marginBottom: 12,
              }}
            >
              Route Details
            </Text>

            {/* Start Location */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#10B981",
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 12,
                    color: "#10B981",
                    fontWeight: "600",
                    marginLeft: 6,
                  }}
                >
                  START
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 14,
                  color: "#374151",
                  marginLeft: 16,
                }}
              >
                {trip.startLocation?.address || "N/A"}
              </Text>
            </View>

            {/* End Location */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#EF4444",
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 12,
                    color: "#EF4444",
                    fontWeight: "600",
                    marginLeft: 6,
                  }}
                >
                  END
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 14,
                  color: "#374151",
                  marginLeft: 16,
                }}
              >
                {trip.endLocation?.address || "N/A"}
              </Text>
            </View>

            {/* Distance & Duration */}
            <View className="flex-row items-center justify-around pt-4 border-t border-gray-200">
              <View className="items-center">
                <Ionicons name="navigate-outline" size={24} color="#3B82F6" />
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#1F2937",
                    marginTop: 4,
                  }}
                >
                  {trip.estimatedDistance || "N/A"} km
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 11,
                    color: "#6B7280",
                  }}
                >
                  Distance
                </Text>
              </View>
              <View className="items-center">
                <Ionicons name="time-outline" size={24} color="#3B82F6" />
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#1F2937",
                    marginTop: 4,
                  }}
                >
                  {trip.estimatedDuration || "N/A"} min
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 11,
                    color: "#6B7280",
                  }}
                >
                  Duration
                </Text>
              </View>
            </View>
          </View>

          {/* Edit Status */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              className="text-gray-700 mb-2"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Update Status
            </Text>
            <View className="border border-gray-300 rounded-lg overflow-hidden">
              <Picker
                selectedValue={status}
                onValueChange={(value) => setStatus(value)}
                style={{ fontFamily: "Poppins" }}
              >
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item label="In Progress" value="in-progress" />
                <Picker.Item label="Completed" value="completed" />
                <Picker.Item label="Cancelled" value="cancelled" />
              </Picker>
            </View>
          </View>

          {/* Geofence Selection */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              className="text-gray-700 mb-3"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Assign Geofences (Optional)
            </Text>
            {geofences.length === 0 ? (
              <Text
                className="text-gray-500 text-sm"
                style={{ fontFamily: "Poppins" }}
              >
                No geofences available.
              </Text>
            ) : (
              geofences.map((geofence) => (
                <TouchableOpacity
                  key={geofence._id}
                  onPress={() => toggleGeofence(geofence._id)}
                  className={`flex-row items-center p-3 mb-2 rounded-lg border ${
                    selectedGeofences.includes(geofence._id)
                      ? "bg-amber-50 border-amber-400"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Ionicons
                    name={
                      selectedGeofences.includes(geofence._id)
                        ? "checkbox"
                        : "square-outline"
                    }
                    size={24}
                    color={
                      selectedGeofences.includes(geofence._id)
                        ? "#D4AF37"
                        : "#9CA3AF"
                    }
                  />
                  <View className="ml-3 flex-1">
                    <Text style={{ fontFamily: "Poppins", fontWeight: "600" }}>
                      {geofence.name}
                    </Text>
                    <Text
                      className="text-gray-500 text-xs"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {geofence.type} • {geofence.timeLimit || 30} min radius
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Notes */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              className="text-gray-700 mb-2"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Notes
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-800"
              style={{ fontFamily: "Poppins", minHeight: 80 }}
              placeholder="Enter any additional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View className="space-y-3 mb-6">
            <TouchableOpacity
              className={`rounded-2xl p-4 shadow-sm ${
                loading ? "bg-gray-400" : "bg-amber-500"
              }`}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  className="text-white text-center text-lg font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  Update Trip
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-red-500 rounded-2xl p-4 shadow-sm"
              onPress={handleDelete}
              disabled={loading}
            >
              <Text
                className="text-white text-center text-lg font-semibold"
                style={{ fontFamily: "Poppins" }}
              >
                Delete Trip
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
