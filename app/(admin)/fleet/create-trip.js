import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import LocationAutocomplete from "../../components/LocationAutocomplete";
import {
  TripService,
  GeofenceService,
  NotificationService,
} from "../../../services";
import {
  getAllShifts,
  getCurrentShift,
  getISTTime,
} from "../../../utils/shiftConstants";

const SHIFT_OPTIONS = getAllShifts();

export default function CreateTrip() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedShiftType, setSelectedShiftType] = useState("");
  const [currentShift, setCurrentShift] = useState(null);
  const [istTime, setIstTime] = useState(null);

  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [selectedGeofences, setSelectedGeofences] = useState([]);
  const [notes, setNotes] = useState("");

  const [geofences, setGeofences] = useState([]);
  const [estimatedDistance, setEstimatedDistance] = useState(null);
  const [estimatedDuration, setEstimatedDuration] = useState(null);

  useEffect(() => {
    const refreshShiftSnapshot = () => {
      setIstTime(getISTTime());
      setCurrentShift(getCurrentShift());
    };

    refreshShiftSnapshot();
    const intervalId = setInterval(refreshShiftSnapshot, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (startLocation && endLocation) {
      calculateDistance();
    } else {
      setEstimatedDistance(null);
      setEstimatedDuration(null);
    }
  }, [startLocation, endLocation]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const geofenceResponse = await GeofenceService.getAllGeofences();

      if (geofenceResponse.success) {
        setGeofences(geofenceResponse.data || []);
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to load data",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const calculateDistance = () => {
    if (!startLocation || !endLocation) return;

    const R = 6371;
    const dLat =
      ((endLocation.latitude - startLocation.latitude) * Math.PI) / 180;
    const dLon =
      ((endLocation.longitude - startLocation.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((startLocation.latitude * Math.PI) / 180) *
        Math.cos((endLocation.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    setEstimatedDistance(distance.toFixed(2));
    setEstimatedDuration(Math.ceil((distance / 60) * 60));
  };

  const toggleGeofence = (geofenceId) => {
    setSelectedGeofences((prev) =>
      prev.includes(geofenceId)
        ? prev.filter((id) => id !== geofenceId)
        : [...prev, geofenceId]
    );
  };

  const validateForm = () => {
    if (!selectedShiftType) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please select a shift",
      });
      return false;
    }

    if (!startLocation) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please select a start location",
      });
      return false;
    }

    if (!endLocation) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please select an end location",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (loading || !validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        shiftType: selectedShiftType,
        startLocation: {
          type: "Point",
          coordinates: [startLocation.longitude, startLocation.latitude],
          address: startLocation.name,
        },
        endLocation: {
          type: "Point",
          coordinates: [endLocation.longitude, endLocation.latitude],
          address: endLocation.name,
        },
        geofences: selectedGeofences,
        notes: notes.trim(),
        waypoints: [],
      };

      const response = await TripService.createTrip(payload);

      if (!response.success) {
        throw new Error(response.message || "Unable to create trip");
      }

      if (response.data?.driver) {
        await NotificationService.notifyTripAssignment({
          _id: response.data._id,
          startLocation: payload.startLocation,
          endLocation: payload.endLocation,
          distance: estimatedDistance,
        });
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: response.data?.driver
          ? "Trip created and driver notified"
          : "Trip planned successfully",
      });

      router.back();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to create trip",
      });
    } finally {
      setLoading(false);
    }
  };

  const shiftSummary = useMemo(() => {
    if (!selectedShiftType) {
      return null;
    }

    return (
      SHIFT_OPTIONS.find((item) => item.type === selectedShiftType) || null
    );
  }, [selectedShiftType]);

  if (loadingData) {
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
      <ScrollView className="flex-1">
        <View className="p-6">
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
              Create Trip Plan
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-700"
                style={{ fontFamily: "Poppins", fontWeight: "600" }}
              >
                Current IST Time
              </Text>
              <Text
                className="text-indigo-600"
                style={{ fontFamily: "Poppins" }}
              >
                {istTime
                  ? istTime.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </Text>
            </View>
            {currentShift && (
              <View className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <Text
                  className="text-indigo-700 font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  Active Shift: {currentShift.name}
                </Text>
                <Text
                  className="text-indigo-500 mt-1"
                  style={{ fontFamily: "Poppins", fontSize: 12 }}
                >
                  {currentShift.startTime} - {currentShift.endTime} IST
                </Text>
              </View>
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              className="text-gray-700 mb-2"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Select Shift *
            </Text>
            <View className="border border-gray-200 rounded-lg overflow-hidden">
              <Picker
                selectedValue={selectedShiftType}
                onValueChange={(value) => setSelectedShiftType(value)}
                style={{ fontFamily: "Poppins" }}
              >
                <Picker.Item label="-- Select Shift --" value="" />
                {SHIFT_OPTIONS.map((shift) => (
                  <Picker.Item
                    key={shift.type}
                    label={`${shift.name} (${shift.startTime} - ${shift.endTime} IST)${
                      currentShift && currentShift.type === shift.type
                        ? " ✓ Active"
                        : ""
                    }`}
                    value={shift.type}
                  />
                ))}
              </Picker>
            </View>
            {shiftSummary && (
              <View className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="time-outline" size={18} color="#2563EB" />
                  <Text
                    className="ml-2 text-blue-700 font-semibold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {shiftSummary.name}
                  </Text>
                </View>
                <Text
                  className="text-blue-600"
                  style={{ fontFamily: "Poppins", fontSize: 12 }}
                >
                  Window: {shiftSummary.startTime} - {shiftSummary.endTime} IST
                </Text>
              </View>
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              className="text-gray-700 mb-3"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Start Location *
            </Text>
            <LocationAutocomplete
              placeholder="Search start location"
              country="IN"
              provider="default"
              onLocationSelect={setStartLocation}
            />
            {startLocation && (
              <View className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <View className="flex-row items-center">
                  <Ionicons name="location" size={20} color="#10B981" />
                  <Text
                    className="ml-2 font-semibold text-green-800"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {startLocation.name}
                  </Text>
                </View>
                <Text
                  className="text-green-700 mt-1"
                  style={{ fontFamily: "Poppins", fontSize: 12 }}
                >
                  {startLocation.city}, {startLocation.state}
                </Text>
              </View>
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              className="text-gray-700 mb-3"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              End Location *
            </Text>
            <LocationAutocomplete
              placeholder="Search destination"
              country="IN"
              provider="default"
              onLocationSelect={setEndLocation}
            />
            {endLocation && (
              <View className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <View className="flex-row items-center">
                  <Ionicons name="flag" size={20} color="#EF4444" />
                  <Text
                    className="ml-2 font-semibold text-red-700"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {endLocation.name}
                  </Text>
                </View>
                <Text
                  className="text-red-600 mt-1"
                  style={{ fontFamily: "Poppins", fontSize: 12 }}
                >
                  {endLocation.city}, {endLocation.state}
                </Text>
              </View>
            )}
          </View>

          {estimatedDistance && (
            <View className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-200">
              <View className="flex-row justify-between">
                <View>
                  <Text
                    className="text-blue-500 text-xs"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Estimated Distance
                  </Text>
                  <Text
                    className="text-blue-700 text-2xl font-bold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {estimatedDistance} km
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="text-blue-500 text-xs"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Estimated Duration
                  </Text>
                  <Text
                    className="text-blue-700 text-2xl font-bold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {Math.floor(estimatedDuration / 60)}h{" "}
                    {estimatedDuration % 60}m
                  </Text>
                </View>
              </View>
            </View>
          )}

          {!!geofences.length && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text
                className="text-gray-700 mb-3"
                style={{ fontFamily: "Poppins", fontWeight: "600" }}
              >
                Attach Geofences
              </Text>
              {geofences.map((geofence) => {
                const isSelected = selectedGeofences.includes(geofence._id);
                return (
                  <TouchableOpacity
                    key={geofence._id}
                    onPress={() => toggleGeofence(geofence._id)}
                    className={`flex-row items-center justify-between p-3 mb-2 rounded-xl border ${
                      isSelected
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <Text style={{ fontFamily: "Poppins" }}>
                      {geofence.name}
                    </Text>
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={20}
                      color={isSelected ? "#10B981" : "#9CA3AF"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text
              className="text-gray-700 mb-3"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Notes
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Special instructions"
              multiline
              numberOfLines={4}
              className="bg-gray-100 rounded-xl p-4 text-gray-800"
              style={{ fontFamily: "Poppins" }}
            />
          </View>

          <TouchableOpacity
            disabled={loading}
            onPress={handleSubmit}
            className={`rounded-xl py-5 items-center ${
              loading ? "bg-gray-400" : "bg-[#D4AF37]"
            }`}
          >
            <Text
              className="text-white text-lg font-semibold"
              style={{ fontFamily: "Poppins" }}
            >
              {loading ? "Creating Trip..." : "Create Trip"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
