import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import apiClient from "../../../../services/api/apiClient";

export default function EditShift() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [formData, setFormData] = useState({
    driver: "",
    truck: "",
    startTime: new Date(),
    status: "scheduled",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setFetching(true);

      // Load shift data, drivers, and trucks in parallel
      const [shiftResponse, driversResponse, trucksResponse] =
        await Promise.all([
          apiClient.get(`/shifts/${id}`),
          apiClient.get("/drivers"),
          apiClient.get("/trucks"),
        ]);

      if (driversResponse.success) {
        setDrivers(driversResponse.data || []);
      }

      if (trucksResponse.success) {
        setTrucks(trucksResponse.data || []);
      }

      if (shiftResponse.success && shiftResponse.data) {
        const shift = shiftResponse.data;
        setFormData({
          driver: shift.driver?._id || shift.driver || "",
          truck: shift.truck?._id || shift.truck || "",
          startTime: shift.startTime ? new Date(shift.startTime) : new Date(),
          status: shift.status || "scheduled",
          notes: shift.notes || "",
        });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load shift details",
        position: "top",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleDateChange = (_event, selectedDate) => {
    setShowDatePicker(false);
    setShowTimePicker(false);

    if (selectedDate) {
      handleChange("startTime", selectedDate);
    }
  };

  const formatDateTime = (date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm");
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Validation
    if (!formData.driver) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please select a driver",
        position: "top",
      });
      return;
    }

    if (!formData.truck) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please select a truck",
        position: "top",
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        driver: formData.driver,
        truck: formData.truck,
        startTime: formData.startTime.toISOString(),
        status: formData.status,
        notes: formData.notes,
      };

      const response = await apiClient.put(`/shifts/${id}`, payload);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Shift Updated",
          text2: "Shift has been updated successfully",
          position: "top",
        });

        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to update shift",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to update shift:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update shift. Please try again.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text className="mt-4 text-gray-600" style={{ fontFamily: "Poppins" }}>
          Loading shift details...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 p-2 rounded-full bg-white"
            >
              <Ionicons name="arrow-back" size={24} color="#D4AF37" />
            </TouchableOpacity>
            <Text
              className="text-2xl text-gray-800 flex-1"
              style={{ fontFamily: "Cinzel" }}
            >
              Edit Shift
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            {/* Driver Selection */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Driver <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-gray-50 rounded-lg border border-gray-300">
                <Picker
                  selectedValue={formData.driver}
                  onValueChange={(value) => handleChange("driver", value)}
                  style={{ fontFamily: "Poppins" }}
                >
                  <Picker.Item label="Select Driver" value="" />
                  {drivers.map((driver) => (
                    <Picker.Item
                      key={driver._id}
                      label={`${driver.name} (${driver.username})`}
                      value={driver._id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Truck Selection */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Truck <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-gray-50 rounded-lg border border-gray-300">
                <Picker
                  selectedValue={formData.truck}
                  onValueChange={(value) => handleChange("truck", value)}
                  style={{ fontFamily: "Poppins" }}
                >
                  <Picker.Item label="Select Truck" value="" />
                  {trucks
                    .filter(
                      (t) =>
                        t.status === "available" || t._id === formData.truck
                    )
                    .map((truck) => (
                      <Picker.Item
                        key={truck._id}
                        label={`${truck.registrationNumber} - ${truck.model || "Unknown"}`}
                        value={truck._id}
                      />
                    ))}
                </Picker>
              </View>
            </View>

            {/* Start Date & Time */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Start Date & Time <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                className="bg-gray-50 rounded-lg p-3 border border-gray-300 flex-row justify-between items-center"
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  className="text-gray-700"
                  style={{ fontFamily: "Poppins" }}
                >
                  {formatDateTime(formData.startTime)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#888" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.startTime}
                  mode="datetime"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Status */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Status
              </Text>
              <View className="bg-gray-50 rounded-lg border border-gray-300">
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                  style={{ fontFamily: "Poppins" }}
                >
                  <Picker.Item label="Scheduled" value="scheduled" />
                  <Picker.Item label="Active" value="active" />
                  <Picker.Item label="Completed" value="completed" />
                  <Picker.Item label="Cancelled" value="cancelled" />
                </Picker>
              </View>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-[#D4AF37] rounded-lg p-4 items-center mb-4"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className="text-white text-lg font-semibold"
                  style={{ fontFamily: "Poppins" }}
                >
                  Update Shift
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              disabled={loading}
              className="bg-gray-300 rounded-lg p-4 items-center"
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
      <Toast />
    </SafeAreaView>
  );
}
