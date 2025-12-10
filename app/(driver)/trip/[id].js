import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { TripService, NotificationService } from "../../../services";
import { format } from "date-fns";
import { useSelector } from "react-redux";

export default function TripDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    loadTripDetails();
  }, [id]);

  const loadTripDetails = async () => {
    try {
      setLoading(true);
      const response = await TripService.getTripById(id);

      if (response.success) {
        setTrip(response.data);
      } else {
        throw new Error(response.message || "Failed to load trip details");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load trip details",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    try {
      setActionLoading(true);
      const response = await TripService.startTrip(id);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Trip Started!",
          text2: "Drive safely and follow the route",
        });

        // Send notification to admin
        await NotificationService.notifyTripStarted(
          response.data,
          user?.name || "Driver"
        );

        loadTripDetails();
      } else {
        throw new Error(response.message || "Failed to start trip");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to start trip",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndTrip = async () => {
    try {
      setActionLoading(true);
      router.push(`/(driver)/trip/end?id=${id}`);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to navigate to end trip",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseTrip = async () => {
    try {
      setActionLoading(true);
      const response = await TripService.pauseTrip(id);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Trip Paused!",
          text2: "Trip has been paused successfully",
        });

        loadTripDetails();
      } else {
        throw new Error(response.message || "Failed to pause trip");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to pause trip",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeTrip = async () => {
    try {
      setActionLoading(true);
      const response = await TripService.resumeTrip(id);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Trip Resumed!",
          text2: "Trip has been resumed successfully",
        });

        loadTripDetails();
      } else {
        throw new Error(response.message || "Failed to resume trip");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to resume trip",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportBreakdown = () => {
    router.push(`/(driver)/breakdown/report?tripId=${id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-600";
      case "in-progress":
        return "bg-blue-100 text-blue-600";
      case "paused":
        return "bg-orange-100 text-orange-600";
      case "completed":
        return "bg-green-100 text-green-600";
      case "cancelled":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
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
            Loading trip details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600" style={{ fontFamily: "Poppins" }}>
            Trip not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header with Back Button */}
          <View className="flex-row items-center mb-6">
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

          {/* Trip Header */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className="text-2xl text-gray-800"
                style={{ fontFamily: "Cinzel" }}
              >
                Trip #{trip._id?.substring(0, 8)}
              </Text>
              <View
                className={`px-4 py-2 rounded-full ${getStatusColor(trip.status).split(" ")[0]}`}
              >
                <Text
                  className={`font-semibold ${getStatusColor(trip.status).split(" ")[1]}`}
                  style={{ fontFamily: "Poppins" }}
                >
                  {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Route Info */}
            <View className="mt-4">
              <View className="mb-4">
                <View className="flex-row items-start mb-2">
                  <View className="w-3 h-3 rounded-full bg-green-500 mt-1" />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-gray-500 text-xs"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Start Location
                    </Text>
                    <Text
                      className="text-gray-800 text-base font-semibold"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {trip.startLocation?.address || "N/A"}
                    </Text>
                    {trip.startLocation?.coordinates && (
                      <Text
                        className="text-gray-400 text-xs mt-1"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {trip.startLocation.coordinates[1].toFixed(4)},{" "}
                        {trip.startLocation.coordinates[0].toFixed(4)}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="ml-1 w-0.5 h-6 bg-gray-300" />
                <View className="flex-row items-start mt-2">
                  <View className="w-3 h-3 rounded-full bg-red-500 mt-1" />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-gray-500 text-xs"
                      style={{ fontFamily: "Poppins" }}
                    >
                      End Location
                    </Text>
                    <Text
                      className="text-gray-800 text-base font-semibold"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {trip.endLocation?.address || "N/A"}
                    </Text>
                    {trip.endLocation?.coordinates && (
                      <Text
                        className="text-gray-400 text-xs mt-1"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {trip.endLocation.coordinates[1].toFixed(4)},{" "}
                        {trip.endLocation.coordinates[0].toFixed(4)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Distance & Duration */}
          <View className="flex-row mb-6">
            <View className="flex-1 bg-blue-50 rounded-2xl p-4 mr-2 border border-blue-200">
              <Ionicons name="location-outline" size={24} color="#3B82F6" />
              <Text
                className="text-gray-600 text-xs mt-2"
                style={{ fontFamily: "Poppins" }}
              >
                Distance
              </Text>
              <Text
                className="text-blue-600 text-xl font-bold"
                style={{ fontFamily: "Poppins" }}
              >
                {trip.estimatedDistance || trip.actualDistance || "N/A"} km
              </Text>
            </View>
            <View className="flex-1 bg-amber-50 rounded-2xl p-4 ml-2 border border-amber-200">
              <Ionicons name="time-outline" size={24} color="#D4AF37" />
              <Text
                className="text-gray-600 text-xs mt-2"
                style={{ fontFamily: "Poppins" }}
              >
                Duration
              </Text>
              <Text
                className="text-amber-600 text-xl font-bold"
                style={{ fontFamily: "Poppins" }}
              >
                {trip.estimatedDuration
                  ? `${Math.floor(trip.estimatedDuration / 60)}h ${trip.estimatedDuration % 60}m`
                  : "N/A"}
              </Text>
            </View>
          </View>

          {/* Trip Details */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <Text
              className="text-xl text-gray-800 mb-4"
              style={{ fontFamily: "Cinzel" }}
            >
              Trip Information
            </Text>
            <View className="space-y-3">
              <View className="flex-row items-center py-3 border-b border-gray-100">
                <Ionicons name="car-outline" size={20} color="#D4AF37" />
                <Text
                  className="text-gray-600 ml-3 flex-1"
                  style={{ fontFamily: "Poppins" }}
                >
                  Truck Number
                </Text>
                <Text
                  className="text-gray-800 font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  {trip.truck?.registrationNumber || "N/A"}
                </Text>
              </View>
              {trip.startTime && (
                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons
                    name="play-circle-outline"
                    size={20}
                    color="#D4AF37"
                  />
                  <Text
                    className="text-gray-600 ml-3 flex-1"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Start Time
                  </Text>
                  <Text
                    className="text-gray-800 font-semibold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {format(new Date(trip.startTime), "MMM dd, hh:mm a")}
                  </Text>
                </View>
              )}
              {trip.endTime && (
                <View className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons
                    name="stop-circle-outline"
                    size={20}
                    color="#D4AF37"
                  />
                  <Text
                    className="text-gray-600 ml-3 flex-1"
                    style={{ fontFamily: "Poppins" }}
                  >
                    End Time
                  </Text>
                  <Text
                    className="text-gray-800 font-semibold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {format(new Date(trip.endTime), "MMM dd, hh:mm a")}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center py-3">
                <Ionicons name="person-outline" size={20} color="#D4AF37" />
                <Text
                  className="text-gray-600 ml-3 flex-1"
                  style={{ fontFamily: "Poppins" }}
                >
                  Driver
                </Text>
                <Text
                  className="text-gray-800 font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  {trip.driver?.name || "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Geofences */}
          {trip.geofences && trip.geofences.length > 0 && (
            <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
              <Text
                className="text-xl text-gray-800 mb-4"
                style={{ fontFamily: "Cinzel" }}
              >
                Assigned Geofences
              </Text>
              {trip.geofences.map((geofence, index) => (
                <View
                  key={geofence._id || index}
                  className="flex-row items-center p-3 mb-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <Ionicons name="shield-checkmark" size={20} color="#D4AF37" />
                  <Text
                    className="text-gray-800 ml-3 flex-1"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {geofence.name || `Geofence ${index + 1}`}
                  </Text>
                  <Text
                    className="text-gray-500 text-xs"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {geofence.type || "N/A"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Notes */}
          {trip.notes && (
            <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
              <Text
                className="text-xl text-gray-800 mb-2"
                style={{ fontFamily: "Cinzel" }}
              >
                Notes
              </Text>
              <Text className="text-gray-600" style={{ fontFamily: "Poppins" }}>
                {trip.notes}
              </Text>
            </View>
          )}

          {/* Actions */}
          {trip.status === "pending" && (
            <TouchableOpacity
              className="bg-green-500 rounded-xl py-5 items-center mb-4"
              onPress={handleStartTrip}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="play-circle" size={24} color="#fff" />
                  <Text
                    className="text-white text-lg font-semibold ml-2"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Start Trip
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {trip.status === "in-progress" && (
            <View className="mb-4">
              <TouchableOpacity
                className="bg-orange-500 rounded-xl py-5 items-center mb-4"
                onPress={handlePauseTrip}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="pause-circle" size={24} color="#fff" />
                    <Text
                      className="text-white text-lg font-semibold ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Pause Trip
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-500 rounded-xl py-5 items-center mb-4"
                onPress={handleEndTrip}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="stop-circle" size={24} color="#fff" />
                    <Text
                      className="text-white text-lg font-semibold ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      End Trip
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-500 rounded-xl py-5 items-center"
                onPress={handleReportBreakdown}
                disabled={actionLoading}
              >
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={24} color="#fff" />
                  <Text
                    className="text-white text-lg font-semibold ml-2"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Report Breakdown
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
          {trip.status === "paused" && (
            <View className="mb-4">
              <TouchableOpacity
                className="bg-green-500 rounded-xl py-5 items-center mb-4"
                onPress={handleResumeTrip}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="play-circle" size={24} color="#fff" />
                    <Text
                      className="text-white text-lg font-semibold ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Resume Trip
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-500 rounded-xl py-5 items-center mb-4"
                onPress={handleEndTrip}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="stop-circle" size={24} color="#fff" />
                    <Text
                      className="text-white text-lg font-semibold ml-2"
                      style={{ fontFamily: "Poppins" }}
                    >
                      End Trip
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-500 rounded-xl py-5 items-center"
                onPress={handleReportBreakdown}
                disabled={actionLoading}
              >
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={24} color="#fff" />
                  <Text
                    className="text-white text-lg font-semibold ml-2"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Report Breakdown
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
