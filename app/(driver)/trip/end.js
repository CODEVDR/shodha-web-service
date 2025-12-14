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
import { useLanguage } from "../_layout";

export default function EndTrip() {
  const router = useRouter();
  const { LANG } = useLanguage();
  const [notes, setNotes] = useState("");
  const [finalReading, setFinalReading] = useState("");

  const handleEndTrip = () => {
    if (!finalReading.trim()) {
      Toast.show({
        type: "error",
        text1: LANG.tripEnd.requiredField,
        text2: LANG.tripEnd.requiresFinalReading,
        position: "top",
      });
      return;
    }

    Toast.show({
      type: "success",
      text1: LANG.trip.messages.completed,
      text2: LANG.trip.messages.completedDesc,
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
              {LANG.tripEnd.title}
            </Text>
            <Text
              className="text-gray-600 mb-6"
              style={{ fontFamily: "Poppins" }}
            >
              {LANG.tripEnd.subtitle}
            </Text>

            {/* Final Reading */}
            <View className="mb-4">
              <Text
                className="text-sm text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                {LANG.tripEnd.finalReading}
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                <Ionicons name="speedometer-outline" size={20} color="#666" />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-800"
                  style={{ fontFamily: "Poppins" }}
                  placeholder={LANG.tripEnd.finalReadingPlaceholder}
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
                {LANG.tripEnd.notesOptional}
              </Text>
              <View className="border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                <TextInput
                  className="text-base text-gray-800 min-h-[100px]"
                  style={{ fontFamily: "Poppins", textAlignVertical: "top" }}
                  placeholder={LANG.tripEnd.notesPlaceholder}
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
              {LANG.tripEnd.summary}
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between py-2">
                <Text className="text-white" style={{ fontFamily: "Poppins" }}>
                  {LANG.tripEnd.duration}
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
                  {LANG.tripEnd.distance}
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
                {LANG.tripEnd.complete}
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
                {LANG.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
