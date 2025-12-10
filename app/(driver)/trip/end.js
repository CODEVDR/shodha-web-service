import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import Toast from "react-native-toast-message";

export default function EndTrip() {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [finalReading, setFinalReading] = useState("");

  const handleEndTrip = () => {
    if (!finalReading.trim()) {
      Toast.show({
        type: "error",
        text1: "Required Field",
        text2: "Please enter final odometer reading",
        position: "top",
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: "Trip Ended",
      text2: "Trip has been completed successfully",
      position: "top",
    });

    setTimeout(() => {
      router.back();
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <Text
              className="text-2xl text-gray-800 mb-2"
              style={{ fontFamily: "Cinzel" }}
            >
              End Trip
            </Text>
            <Text
              className="text-gray-600 mb-6"
              style={{ fontFamily: "Poppins" }}
            >
              Please provide trip completion details
            </Text>

            {/* Final Reading */}
            <View className="mb-4">
              <Text
                className="text-sm text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Final Odometer Reading (km)
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                <Ionicons name="speedometer-outline" size={20} color="#666" />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-800"
                  style={{ fontFamily: "Poppins" }}
                  placeholder="Enter final reading"
                  value={finalReading}
                  onChangeText={setFinalReading}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Notes */}
            <View className="mb-4">
              <Text
                className="text-sm text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Notes (Optional)
              </Text>
              <View className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                <TextInput
                  className="text-base text-gray-800 min-h-[100px]"
                  style={{ fontFamily: "Poppins", textAlignVertical: "top" }}
                  placeholder="Any additional notes..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>

          {/* Trip Summary */}
          <View className="bg-[#D4AF37] rounded-2xl p-6 mb-6">
            <Text
              className="text-white text-xl mb-4"
              style={{ fontFamily: "Cinzel" }}
            >
              Trip Summary
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between py-2">
                <Text className="text-white" style={{ fontFamily: "Poppins" }}>
                  Duration
                </Text>
                <Text
                  className="text-white font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  6h 30m
                </Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-white" style={{ fontFamily: "Poppins" }}>
                  Distance
                </Text>
                <Text
                  className="text-white font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  450 km
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              className="bg-red-500 rounded-xl py-5 items-center"
              onPress={handleEndTrip}
            >
              <Text
                className="text-white text-lg font-semibold"
                style={{ fontFamily: "Poppins" }}
              >
                Complete Trip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-gray-300 rounded-xl py-5 items-center"
              onPress={() => router.back()}
            >
              <Text
                className="text-gray-700 text-lg font-semibold"
                style={{ fontFamily: "Poppins" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
