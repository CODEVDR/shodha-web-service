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
import { useState, useEffect } from "react";
import Toast from "react-native-toast-message";
import {
  BreakdownService,
  TripService,
  NotificationService,
} from "../../../services";
import { useSelector } from "react-redux";
import { useLanguage } from "../_layout";

export default function ReportBreakdown() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();
  const { user } = useSelector((state) => state.auth);
  const { LANG } = useLanguage();
  const [description, setDescription] = useState("");
  const [breakdownType, setBreakdownType] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    if (tripId) {
      loadTripDetails();
    }
  }, [tripId]);

  const loadTripDetails = async () => {
    try {
      const response = await TripService.getTripById(tripId);
      if (response.success) {
        setTrip(response.data);

        // Validate breakdown report eligibility
        const canReportBreakdown = validateBreakdownEligibility(response.data);
        if (!canReportBreakdown.allowed) {
          Toast.show({
            type: "error",
            text1: LANG.breakdown.messages.cannotReport,
            text2: canReportBreakdown.reason,
          });
          router.back();
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load trip details:", error);
      Toast.show({
        type: "error",
        text1: LANG.error,
        text2: LANG.breakdown.messages.detailsNotLoaded,
      });
      router.back();
    }
  };

  const validateBreakdownEligibility = (tripData) => {
    // Check if driver is assigned
    const isDriverAssigned =
      tripData.drivers &&
      tripData.drivers.some(
        (driver) =>
          (typeof driver === "string" ? driver : driver._id) === user._id
      );

    if (!isDriverAssigned) {
      return {
        allowed: false,
        reason: LANG.breakdown.messages.notAssigned,
      };
    }

    // Check if truck is assigned
    const hasTruck =
      tripData.truck &&
      (typeof tripData.truck === "string" ||
        (typeof tripData.truck === "object" && tripData.truck._id));

    if (!hasTruck) {
      return {
        allowed: false,
        reason: LANG.breakdown.messages.noTruck,
      };
    }

    // Check trip status
    const validStatuses = ["assigned", "in-progress", "paused"];
    if (!validStatuses.includes(tripData.status)) {
      return {
        allowed: false,
        reason: LANG.breakdown.messages.invalidStatus,
      };
    }

    return { allowed: true };
  };

  const handleReportBreakdown = async () => {
    if (!description.trim()) {
      Toast.show({
        type: "error",
        text1: "Required Field",
        text2: "Please enter breakdown description",
        position: "top",
      });
      return;
    }

    if (!breakdownType.trim()) {
      Toast.show({
        type: "error",
        text1: "Required Field",
        text2: "Please enter breakdown type",
        position: "top",
      });
      return;
    }

    if (!trip) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Trip details not loaded",
        position: "top",
      });
      return;
    }

    try {
      setLoading(true);
      const breakdownData = {
        truckId: trip.truck,
        tripId: tripId,
        shiftId: trip.shift,
        breakdownType: breakdownType.trim(),
        description: description.trim(),
        location: location.trim()
          ? {
              address: location.trim(),
            }
          : null,
      };

      const response = await BreakdownService.reportBreakdown(breakdownData);

      if (response.success) {
        // Send push notification to admin
        try {
          const driverId = user?._id || user?.id;
          await NotificationService.notifyBreakdownReported(response.data, {
            name: user?.name || "Driver",
            _id: driverId,
          });
        } catch (notificationError) {
          console.error("Failed to send notification:", notificationError);
        }

        Toast.show({
          type: "success",
          text1: "Breakdown Reported",
          text2: "Your breakdown has been reported successfully",
          position: "top",
        });

        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        throw new Error(response.message || "Failed to report breakdown");
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to report breakdown",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
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
              Report Breakdown
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            <Text
              className="text-xl text-gray-800 mb-6"
              style={{ fontFamily: "Cinzel" }}
            >
              Breakdown Details
            </Text>

            {/* Breakdown Type */}
            <View className="mb-6">
              <Text
                className="text-gray-700 text-base font-semibold mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Breakdown Type *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="e.g., Engine failure, Tire puncture, Battery issue..."
                value={breakdownType}
                onChangeText={setBreakdownType}
                style={{ fontFamily: "Poppins" }}
              />
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text
                className="text-gray-700 text-base font-semibold mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Description *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="Describe the breakdown issue..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ fontFamily: "Poppins", minHeight: 100 }}
              />
            </View>

            {/* Location */}
            <View className="mb-6">
              <Text
                className="text-gray-700 text-base font-semibold mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Current Location (Optional)
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="Enter your current location..."
                value={location}
                onChangeText={setLocation}
                style={{ fontFamily: "Poppins" }}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className="bg-red-500 rounded-xl py-5 items-center"
              onPress={handleReportBreakdown}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={24} color="#fff" />
                  <Text
                    className="text-white text-lg font-semibold ml-2"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Report Breakdown
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
