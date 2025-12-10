import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import { AutoShiftService } from "../../../services";
import apiClient from "../../../services/api/apiClient";

const TRIP_STATUS_STYLES = {
  pending: {
    label: "Pending",
    bg: "#FEF3C7",
    color: "#92400E",
  },
  "in-progress": {
    label: "In Progress",
    bg: "#DBEAFE",
    color: "#1D4ED8",
  },
  completed: {
    label: "Completed",
    bg: "#DCFCE7",
    color: "#166534",
  },
  cancelled: {
    label: "Cancelled",
    bg: "#FEE2E2",
    color: "#B91C1C",
  },
  default: {
    label: "Unknown",
    bg: "#E5E7EB",
    color: "#374151",
  },
};

const getLocationLabel = (location) => {
  if (!location) return "N/A";
  return (
    location.address ||
    location.name ||
    location.label ||
    [location.latitude, location.longitude]
      .filter((value) => typeof value === "number")
      .join(", ") ||
    "N/A"
  );
};

const getDriverNames = (assignment) => {
  // Support both old single driver and new multiple drivers format
  if (assignment.drivers && assignment.drivers.length > 0) {
    return assignment.drivers.map((d) => d.name || "Unknown").join(", ");
  }
  if (assignment.driver) {
    return assignment.driver.name || "N/A";
  }
  return "N/A";
};

const formatTimeValue = (value) => {
  if (!value) return "Not started";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not started";
    }
    return date.toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      day: "2-digit",
      month: "short",
    });
  } catch (error) {
    return "Not started";
  }
};

const TripStatusBadge = ({ status }) => {
  const style = TRIP_STATUS_STYLES[status] || TRIP_STATUS_STYLES.default;
  return (
    <View
      style={{
        backgroundColor: style.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text
        style={{
          fontFamily: "Poppins",
          fontSize: 11,
          fontWeight: "600",
          color: style.color,
        }}
      >
        {style.label}
      </Text>
    </View>
  );
};

export default function ShiftAssignments() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [availableTrucks, setAvailableTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [shiftSchedules, setShiftSchedules] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);

  // Manual assignment form
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, trucksRes, driversRes, schedulesRes] =
        await Promise.all([
          AutoShiftService.getActiveAssignments(),
          AutoShiftService.getAvailableTrucks(),
          apiClient.get("/drivers"),
          AutoShiftService.getShiftSchedules(),
        ]);

      if (assignmentsRes.success) {
        setActiveAssignments(assignmentsRes.data || []);
      }

      if (trucksRes.success) {
        setAvailableTrucks(trucksRes.data || []);
      }

      if (driversRes.success) {
        setDrivers(driversRes.data || []);
      }

      if (schedulesRes.success) {
        setShiftSchedules(schedulesRes.data.schedules || []);
        setCurrentShift(schedulesRes.data.current);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load data",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedDriver || !selectedTruck) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please select both driver and truck",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await AutoShiftService.manualAssignTruck(
        selectedDriver,
        selectedTruck
      );

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Truck assigned successfully",
        });
        setShowManualForm(false);
        setSelectedDriver("");
        setSelectedTruck("");
        loadData();
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to assign truck",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to assign truck",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseShift = async (shiftId) => {
    try {
      setLoading(true);
      const response = await AutoShiftService.releaseShift(shiftId);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Shift released successfully",
        });
        loadData();
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to release shift",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to release shift",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text
            className="text-gray-600 mt-4"
            style={{ fontFamily: "Poppins" }}
          >
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => router.back()}
                className="mr-4 p-2"
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text
                className="text-3xl text-gray-800"
                style={{ fontFamily: "Cinzel" }}
              ></Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowManualForm(!showManualForm)}
              className="bg-[#D4AF37] px-4 py-2 rounded-lg"
            >
              <Ionicons
                name={showManualForm ? "close" : "add"}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Current Shift Info */}
          {currentShift && (
            <View className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#fff",
                    marginRight: 10,
                  }}
                />
                <View>
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 18,
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    {currentShift.name} - ACTIVE NOW
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 13,
                      color: "#fff",
                      marginTop: 4,
                      opacity: 0.9,
                    }}
                  >
                    {currentShift.startHour}:
                    {String(currentShift.startMinute).padStart(2, "0")} -{" "}
                    {currentShift.endHour}:
                    {String(currentShift.endMinute).padStart(2, "0")} IST
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Manual Assignment Form */}
          {showManualForm && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text
                className="text-lg text-gray-800 mb-4"
                style={{ fontFamily: "Poppins", fontWeight: "600" }}
              >
                Manual Assignment Override
              </Text>

              {/* Driver Picker */}
              <View className="mb-4">
                <Text
                  className="text-sm text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Select Driver
                </Text>
                <View className="border border-gray-300 rounded-lg overflow-hidden">
                  <Picker
                    selectedValue={selectedDriver}
                    onValueChange={(value) => setSelectedDriver(value)}
                    style={{ fontFamily: "Poppins" }}
                  >
                    <Picker.Item label="-- Select Driver --" value="" />
                    {drivers.map((driver) => (
                      <Picker.Item
                        key={driver._id}
                        label={`${driver.name} (${driver.email})`}
                        value={driver._id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Truck Picker */}
              <View className="mb-4">
                <Text
                  className="text-sm text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Select Truck
                </Text>
                <View className="border border-gray-300 rounded-lg overflow-hidden">
                  <Picker
                    selectedValue={selectedTruck}
                    onValueChange={(value) => setSelectedTruck(value)}
                    style={{ fontFamily: "Poppins" }}
                  >
                    <Picker.Item label="-- Select Truck --" value="" />
                    {availableTrucks.map((truck) => (
                      <Picker.Item
                        key={truck._id}
                        label={`${truck.registrationNumber} - ${truck.model}`}
                        value={truck._id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleManualAssign}
                className="bg-[#D4AF37] rounded-lg py-3 items-center"
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className="text-white font-semibold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Assign Manually
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Active Assignments List */}
          <View className="mb-4">
            <Text
              className="text-xl text-gray-800 mb-3"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Active Assignments ({activeAssignments.length})
            </Text>

            {activeAssignments.length === 0 ? (
              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-6 items-center">
                <Ionicons name="car-outline" size={48} color="#D1D5DB" />
                <Text
                  className="text-gray-500 mt-3"
                  style={{ fontFamily: "Poppins" }}
                >
                  No active assignments
                </Text>
              </View>
            ) : (
              activeAssignments.map((assignment) => (
                <View
                  key={assignment._id}
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      {assignment.autoGenerated ? (
                        <View className="bg-green-100 px-3 py-1 rounded-full">
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 11,
                              color: "#10B981",
                              fontWeight: "600",
                            }}
                          >
                            AUTO
                          </Text>
                        </View>
                      ) : (
                        <View className="bg-amber-100 px-3 py-1 rounded-full">
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 11,
                              color: "#D97706",
                              fontWeight: "600",
                            }}
                          >
                            MANUAL
                          </Text>
                        </View>
                      )}
                      <Text
                        className="text-sm text-gray-600 ml-2"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {assignment.shiftName || "Active"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleReleaseShift(assignment._id)}
                      className="bg-red-100 px-3 py-1 rounded-lg"
                    >
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 12,
                          color: "#DC2626",
                          fontWeight: "600",
                        }}
                      >
                        Release
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={
                        assignment.drivers?.length > 1 ||
                        (assignment.drivers?.length === 0 && assignment.driver)
                          ? "people"
                          : "person"
                      }
                      size={18}
                      color="#D4AF37"
                    />
                    <Text
                      className="text-gray-800 ml-2"
                      style={{ fontFamily: "Poppins", fontWeight: "600" }}
                    >
                      {getDriverNames(assignment)}
                    </Text>
                    {assignment.drivers?.length > 1 && (
                      <View className="bg-blue-100 px-2 py-1 rounded-full ml-2">
                        <Text
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 10,
                            color: "#1D4ED8",
                            fontWeight: "600",
                          }}
                        >
                          {assignment.drivers.length} drivers
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="car" size={18} color="#3B82F6" />
                    <Text
                      className="text-gray-800 ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {assignment.truck?.registrationNumber || "N/A"} -{" "}
                      {assignment.truck?.model || "N/A"}
                    </Text>
                  </View>

                  <View className="mt-3 pt-3 border-t border-gray-200">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 13,
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        Trip Activity
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 12,
                          color: "#6B7280",
                        }}
                      >
                        {assignment.tripCount || assignment.trips?.length || 0}{" "}
                        total
                      </Text>
                    </View>

                    {assignment.activeTrip ? (
                      <View className="bg-indigo-50 rounded-xl p-3 flex-row items-start mb-4">
                        <Ionicons name="navigate" size={22} color="#4338CA" />
                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text
                              style={{
                                fontFamily: "Poppins",
                                fontSize: 13,
                                fontWeight: "600",
                                color: "#1F2937",
                              }}
                            >
                              Driver is on a trip
                            </Text>
                            <TripStatusBadge
                              status={assignment.activeTrip.status}
                            />
                          </View>
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 12,
                              color: "#4338CA",
                              marginTop: 4,
                            }}
                          >
                            Destination:{" "}
                            {getLocationLabel(
                              assignment.activeTrip.endLocation
                            )}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 11,
                              color: "#4B5563",
                              marginTop: 2,
                            }}
                          >
                            Started{" "}
                            {formatTimeValue(assignment.activeTrip.startTime)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="bg-gray-100 rounded-xl p-3 flex-row items-center mb-4">
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color="#6B7280"
                        />
                        <Text
                          className="ml-3"
                          style={{
                            fontFamily: "Poppins",
                            fontSize: 12,
                            color: "#6B7280",
                          }}
                        >
                          No active trip yet
                        </Text>
                      </View>
                    )}

                    {assignment.trips && assignment.trips.length > 0 ? (
                      <View>
                        {assignment.trips.slice(0, 3).map((trip) => (
                          <View
                            key={trip._id}
                            className="flex-row items-start justify-between mb-3"
                          >
                            <View className="flex-1 pr-3">
                              <Text
                                style={{
                                  fontFamily: "Poppins",
                                  fontSize: 13,
                                  fontWeight: "600",
                                  color: "#111827",
                                }}
                              >
                                {getLocationLabel(trip.startLocation)} →{" "}
                                {getLocationLabel(trip.endLocation)}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: "Poppins",
                                  fontSize: 11,
                                  color: "#6B7280",
                                  marginTop: 2,
                                }}
                              >
                                {trip.estimatedDistance
                                  ? `${trip.estimatedDistance} km`
                                  : "Distance TBD"}{" "}
                                • {formatTimeValue(trip.startTime)}
                              </Text>
                            </View>
                            <TripStatusBadge status={trip.status} />
                          </View>
                        ))}
                        {assignment.tripCount > 3 && (
                          <Text
                            style={{
                              fontFamily: "Poppins",
                              fontSize: 11,
                              color: "#6B7280",
                            }}
                          >
                            +{assignment.tripCount - 3} more trip(s)
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontFamily: "Poppins",
                          fontSize: 12,
                          color: "#6B7280",
                        }}
                      >
                        No trips assigned yet
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Available Trucks */}
          <View>
            <Text
              className="text-xl text-gray-800 mb-3"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Available Trucks ({availableTrucks.length})
            </Text>

            {availableTrucks.map((truck) => (
              <View
                key={truck._id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 flex-row items-center"
              >
                <Ionicons name="car-outline" size={20} color="#10B981" />
                <Text
                  className="text-gray-800 ml-3 flex-1"
                  style={{ fontFamily: "Poppins" }}
                >
                  {truck.registrationNumber} - {truck.model}
                </Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 11,
                      color: "#10B981",
                      fontWeight: "600",
                    }}
                  >
                    AVAILABLE
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
