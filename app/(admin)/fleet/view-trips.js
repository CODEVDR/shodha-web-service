import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { TripService } from "../../../services";
import apiClient from "../../../services/api/apiClient";
import { API_CONFIG } from "../../../config/apiConfig";

export default function ViewTrips() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadTrips();
    loadDriversAndShifts();
  }, []);

  // Refresh data when screen comes into focus (e.g., after editing a trip)
  useFocusEffect(
    useCallback(() => {
      loadTrips(true); // Force refresh when screen is focused
    }, [])
  );

  const loadDriversAndShifts = async () => {
    try {
      const [driversRes, shiftsRes] = await Promise.all([
        apiClient.get(API_CONFIG.endpoints.drivers.getAll),
        apiClient.get(API_CONFIG.endpoints.shifts.getAll),
      ]);

      if (driversRes.success) {
        setDrivers(driversRes.data || []);
      }
      if (shiftsRes.success) {
        // Filter to only active shifts
        const activeShifts = (shiftsRes.data || []).filter(
          (s) => s.status === "active"
        );
        setShifts(activeShifts);
      }
    } catch (error) {
      console.error("Failed to load drivers/shifts:", error);
    }
  };

  const loadTrips = async (forceRefresh = false) => {
    try {
      if (!refreshing) setLoading(true);

      // Force fresh data by bypassing cache
      const response = await TripService.getAllTrips();

      if (response.success) {
        setTrips(response.data || []);
      } else {
        throw new Error(response.message || "Failed to load trips");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load trips",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips(true); // Force refresh
  };

  const getFilteredTrips = () => {
    if (filterStatus === "all") return trips;
    return trips.filter((trip) => trip.status === filterStatus);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "in-progress":
        return "navigate-circle";
      case "completed":
        return "checkmark-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getExpirationInfo = (trip) => {
    if (!trip.expiresAt) return null;
    const expiresAt = new Date(trip.expiresAt);
    const now = new Date();
    const diffMs = expiresAt - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs <= 0) {
      return { text: "Expired", color: "#EF4444", expired: true };
    } else if (diffHours < 6) {
      return {
        text: `${diffHours}h ${diffMins}m left`,
        color: "#F59E0B",
        expired: false,
      };
    } else {
      return { text: `${diffHours}h left`, color: "#10B981", expired: false };
    }
  };

  const openAssignModal = (trip) => {
    setSelectedTrip(trip);
    setSelectedDriver(trip.driver?._id || "");
    setSelectedShift(trip.shift?._id || "");
    setShowAssignModal(true);
  };

  const handleAssignTrip = async () => {
    if (!selectedDriver) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please select a driver",
      });
      return;
    }

    try {
      setAssigning(true);
      const response = await TripService.assignTrip(selectedTrip._id, {
        driverId: selectedDriver,
        shiftId: selectedShift || undefined,
      });

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Trip assigned successfully",
        });
        setShowAssignModal(false);
        loadTrips(true); // Force refresh after assignment
      } else {
        throw new Error(response.message || "Failed to assign trip");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to assign trip",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelTrip = (trip) => {
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await TripService.cancelTrip(
              trip._id,
              "Cancelled by admin"
            );
            if (response.success) {
              Toast.show({
                type: "success",
                text1: "Success",
                text2: "Trip cancelled",
              });
              loadTrips(true); // Force refresh after cancellation
            } else {
              throw new Error(response.message);
            }
          } catch (error) {
            Toast.show({
              type: "error",
              text1: "Error",
              text2: error.message || "Failed to cancel trip",
            });
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text
            className="text-gray-600 mt-4"
            style={{ fontFamily: "Poppins" }}
          >
            Loading trips...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredTrips = getFilteredTrips();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
                All Trips
              </Text>
            </View>
          </View>

          {/* Filter Buttons */}
          <View className="mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                {[
                  "all",
                  "pending",
                  "in-progress",
                  "completed",
                  "cancelled",
                  "expired",
                ].map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-full ${
                      filterStatus === status
                        ? "bg-[#D4AF37]"
                        : "bg-white border border-gray-300"
                    }`}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins",
                        fontWeight: "600",
                        color: filterStatus === status ? "#FFF" : "#6B7280",
                      }}
                    >
                      {status === "all"
                        ? "All"
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Stats Summary */}
          <View className="flex-row mb-6 space-x-3">
            <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Pending
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#F59E0B",
                }}
              >
                {trips.filter((t) => t.status === "pending").length}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Active
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#3B82F6",
                }}
              >
                {trips.filter((t) => t.status === "in-progress").length}
              </Text>
            </View>
          </View>

          {/* Trips List */}
          {filteredTrips.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
              <Ionicons name="sad-outline" size={64} color="#D1D5DB" />
              <Text
                className="text-gray-500 mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No trips found
              </Text>
            </View>
          ) : (
            filteredTrips.map((trip) => {
              const expirationInfo = getExpirationInfo(trip);
              return (
                <TouchableOpacity
                  key={trip._id}
                  onPress={() =>
                    router.push(`/(admin)/fleet/edit-trip/${trip._id}`)
                  }
                  className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
                >
                  {/* Header with Status */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View
                        style={{
                          backgroundColor: getStatusColor(trip.status) + "20",
                          padding: 8,
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons
                          name={getStatusIcon(trip.status)}
                          size={20}
                          color={getStatusColor(trip.status)}
                        />
                      </View>
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontWeight: "600",
                          fontSize: 12,
                          color: getStatusColor(trip.status),
                          marginLeft: 8,
                        }}
                      >
                        {trip.status.toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      {/* Expiration Badge */}
                      {expirationInfo && trip.status === "pending" && (
                        <View
                          style={{
                            backgroundColor: expirationInfo.color + "20",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                            marginRight: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 10,
                              fontWeight: "600",
                              color: expirationInfo.color,
                            }}
                          >
                            {expirationInfo.text}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 11,
                          color: "#9CA3AF",
                        }}
                      >
                        {formatDate(trip.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Driver & Truck Info */}
                  <View className="mb-3">
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 13,
                          color:
                            (trip.drivers && trip.drivers.length > 0) ||
                            trip.driver
                              ? "#374151"
                              : "#EF4444",
                          marginLeft: 6,
                        }}
                      >
                        {trip.drivers && trip.drivers.length > 0
                          ? trip.drivers
                              .map((d) => d.name || "Unknown")
                              .join(", ")
                          : trip.driver?.name || "Unassigned"}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="car-outline" size={16} color="#6B7280" />
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 13,
                          color: "#374151",
                          marginLeft: 6,
                        }}
                      >
                        {trip.truck?.registrationNumber || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {/* Route Info */}
                  <View className="border-t border-gray-200 pt-3">
                    <View className="flex-row items-start mb-2">
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#10B981",
                          marginTop: 4,
                        }}
                      />
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 12,
                          color: "#374151",
                          marginLeft: 8,
                          flex: 1,
                        }}
                        numberOfLines={2}
                      >
                        {trip.startLocation?.address || "N/A"}
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#EF4444",
                          marginTop: 4,
                        }}
                      />
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 12,
                          color: "#374151",
                          marginLeft: 8,
                          flex: 1,
                        }}
                        numberOfLines={2}
                      >
                        {trip.endLocation?.address || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {/* Distance & Duration */}
                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="navigate-outline"
                        size={14}
                        color="#9CA3AF"
                      />
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 11,
                          color: "#6B7280",
                          marginLeft: 4,
                        }}
                      >
                        {trip.estimatedDistance || "N/A"} km
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 11,
                          color: "#6B7280",
                          marginLeft: 4,
                        }}
                      >
                        {trip.estimatedDuration || "N/A"} min
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/(admin)/fleet/edit-trip/${trip._id}`)
                      }
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#D4AF37"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons - Only for pending trips */}
                  {(trip.status === "pending" || !trip.driver) && (
                    <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          openAssignModal(trip);
                        }}
                        style={{
                          backgroundColor: "#D4AF37",
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="person-add-outline"
                          size={16}
                          color="#FFF"
                        />
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#FFF",
                            marginLeft: 6,
                          }}
                        >
                          {trip.driver ? "Reassign" : "Assign"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelTrip(trip);
                        }}
                        style={{
                          backgroundColor: "#FEE2E2",
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={16}
                          color="#EF4444"
                        />
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#EF4444",
                            marginLeft: 6,
                          }}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#1F2937",
                }}
              >
                Assign Trip
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Trip Info */}
            {selectedTrip && (
              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  Route
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 14,
                    color: "#374151",
                  }}
                  numberOfLines={1}
                >
                  {selectedTrip.startLocation?.address || "N/A"} →{" "}
                  {selectedTrip.endLocation?.address || "N/A"}
                </Text>
              </View>
            )}

            {/* Driver Selection */}
            <View className="mb-4">
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Select Driver *
              </Text>
              <View className="bg-gray-100 rounded-xl">
                <Picker
                  selectedValue={selectedDriver}
                  onValueChange={(value) => setSelectedDriver(value)}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="-- Select Driver --" value="" />
                  {drivers.map((driver) => (
                    <Picker.Item
                      key={driver._id}
                      label={`${driver.name}${driver.assignedTruck ? ` (${driver.assignedTruck.registrationNumber})` : ""}`}
                      value={driver._id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Shift Selection (Optional) */}
            <View className="mb-6">
              <Text
                style={{
                  fontFamily: "Poppins",
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Select Shift (Optional)
              </Text>
              <View className="bg-gray-100 rounded-xl">
                <Picker
                  selectedValue={selectedShift}
                  onValueChange={(value) => setSelectedShift(value)}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="-- No Shift --" value="" />
                  {shifts
                    .filter(
                      (s) =>
                        !selectedDriver ||
                        s.driver?._id === selectedDriver ||
                        s.driver === selectedDriver
                    )
                    .map((shift) => (
                      <Picker.Item
                        key={shift._id}
                        label={`${shift.type || "Shift"} - ${shift.driver?.name || "Unknown"}`}
                        value={shift._id}
                      />
                    ))}
                </Picker>
              </View>
            </View>

            {/* Assign Button */}
            <TouchableOpacity
              onPress={handleAssignTrip}
              disabled={assigning || !selectedDriver}
              style={{
                backgroundColor: selectedDriver ? "#D4AF37" : "#D1D5DB",
                paddingVertical: 16,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {assigning ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFF"
                  />
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#FFF",
                      marginLeft: 8,
                    }}
                  >
                    Assign Trip
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
