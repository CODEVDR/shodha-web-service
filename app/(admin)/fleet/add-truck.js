import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import apiClient from "../../../services/api/apiClient";
import {
  INDIAN_STATES,
  PERMIT_TYPES,
  MAINTENANCE_SCHEDULES,
  FUEL_TYPES,
  STATUS_OPTIONS,
} from "./constants/truckFormOptions";

export default function AddTruck() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showFitnessDatePicker, setShowFitnessDatePicker] = useState(false);
  const [showInsuranceDatePicker, setShowInsuranceDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    registrationNumber: "",
    registrationState: "",

    // Manufacturer Details
    manufacturer: "",
    model: "",
    manufactureYear: new Date().getFullYear().toString(),

    // Vehicle Identification
    chassisNumber: "",
    engineNumber: "",

    // Documentation & Permit
    permitType: "State",
    permitDetails: "",
    fitnessValidity: new Date(),
    insuranceValidity: new Date(),

    // Maintenance Details
    maintenanceSchedule: "Quarterly",
    maintenancePeriod: "90",

    // Fuel Details
    fuelType: "Diesel",
    tankCapacity: "",
    averageFuelConsumption: "",

    // Additional Fields
    odometer: "",
    status: "available",
    currentDriver: null,
    documents: [],
  });

  const handleChange = (key, value) => {
    const updatedData = { ...formData, [key]: value };

    // Auto-generate truck name when state or registration number changes
    if (key === "registrationState" || key === "registrationNumber") {
      if (updatedData.registrationState && updatedData.registrationNumber) {
        const stateName =
          INDIAN_STATES.find((s) => s.value === updatedData.registrationState)
            ?.label || updatedData.registrationState;
        updatedData.name = `${stateName} - ${updatedData.registrationNumber.toUpperCase()}`;
      }
    }

    setFormData(updatedData);
  };

  const handleDateChange = (_event, selectedDate, dateField) => {
    if (dateField === "fitnessValidity") {
      setShowFitnessDatePicker(false);
    } else if (dateField === "insuranceValidity") {
      setShowInsuranceDatePicker(false);
    }

    if (selectedDate) {
      handleChange(dateField, selectedDate);
    }
  };

  const formatDate = (date) => {
    return format(new Date(date), "dd/MM/yyyy");
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.name.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Truck name is required",
        position: "top",
      });
      return;
    }

    if (!formData.registrationNumber || !formData.registrationNumber.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Registration number is required",
        position: "top",
      });
      return;
    }

    if (!formData.manufacturer || !formData.manufacturer.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Manufacturer is required",
        position: "top",
      });
      return;
    }

    if (!formData.model || !formData.model.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Model is required",
        position: "top",
      });
      return;
    }

    // Year validation
    const year = parseInt(formData.manufactureYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1990 || year > currentYear + 1) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: `Year must be between 1990 and ${currentYear + 1}`,
        position: "top",
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        chassisNumber: formData.chassisNumber.trim(),
        engineNumber: formData.engineNumber.trim(),
        registrationNumber: formData.registrationNumber.trim().toUpperCase(),
        registrationState: formData.registrationState.trim(),
        manufacturer: formData.manufacturer.trim(),
        model: formData.model.trim(),
        manufactureYear: parseInt(formData.manufactureYear),
        permitType: formData.permitType,
        permitDetails: formData.permitDetails.trim(),
        fitnessValidity: formData.fitnessValidity.toISOString(),
        insuranceValidity: formData.insuranceValidity.toISOString(),
        maintenanceSchedule: formData.maintenanceSchedule,
        maintenancePeriod: parseInt(formData.maintenancePeriod),
        fuelType: formData.fuelType,
        tankCapacity: formData.tankCapacity
          ? parseFloat(formData.tankCapacity)
          : 0,
        averageFuelConsumption: formData.averageFuelConsumption
          ? parseFloat(formData.averageFuelConsumption)
          : 0,
        odometer: formData.odometer ? parseFloat(formData.odometer) : 0,
        status: formData.status,
        currentDriver: formData.currentDriver || null,
        documents: formData.documents || [],
      };

      const response = await apiClient.post("/trucks", payload);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Truck Added",
          text2: "New truck has been registered successfully",
          position: "top",
        });

        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to add truck",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to add truck:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to add truck. Please try again.",
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
              className="mr-4 p-2 rounded-full bg-white"
            >
              <Ionicons name="arrow-back" size={24} color="#D4AF37" />
            </TouchableOpacity>
            <Text
              className="text-2xl text-gray-800 flex-1"
              style={{ fontFamily: "Cinzel" }}
            >
              Add New Truck
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-sm">
            {/* BASIC INFORMATION SECTION */}
            <Text
              className="text-lg font-bold mb-4 text-[#D4AF37]"
              style={{ fontFamily: "Cinzel" }}
            >
              Basic Information
            </Text>

            {/* Truck Name */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Truck Name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter truck name"
                value={formData.name}
                onChangeText={(text) => handleChange("name", text)}
              />
            </View>

            {/* Registration Number */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Registration Number <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="e.g., KA01AB1234"
                value={formData.registrationNumber}
                onChangeText={(text) =>
                  handleChange("registrationNumber", text)
                }
                autoCapitalize="characters"
              />
            </View>

            {/* Registration State */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Registration State <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-gray-50 rounded-lg border border-gray-300">
                <Picker
                  selectedValue={formData.registrationState}
                  onValueChange={(value) =>
                    handleChange("registrationState", value)
                  }
                  style={{ fontFamily: "Poppins" }}
                >
                  {INDIAN_STATES.map((state) => (
                    <Picker.Item
                      key={state.value}
                      label={state.label}
                      value={state.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* MANUFACTURER DETAILS SECTION */}
            <Text
              className="text-lg font-bold mb-4 text-[#D4AF37]"
              style={{ fontFamily: "Cinzel" }}
            >
              Manufacturer Details
            </Text>

            {/* Manufacturer */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Manufacturer <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="e.g., Tata Motors"
                value={formData.manufacturer}
                onChangeText={(text) => handleChange("manufacturer", text)}
              />
            </View>

            {/* Model */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Model <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="e.g., Prima"
                value={formData.model}
                onChangeText={(text) => handleChange("model", text)}
              />
            </View>

            {/* Manufacture Year */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Manufacture Year <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="e.g., 2022"
                value={formData.manufactureYear}
                onChangeText={(text) => handleChange("manufactureYear", text)}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>

            {/* VEHICLE IDENTIFICATION SECTION */}
            <Text
              className="text-lg font-bold mb-4 text-[#D4AF37]"
              style={{ fontFamily: "Cinzel" }}
            >
              Vehicle Identification
            </Text>

            {/* Chassis Number */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Chassis Number
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter chassis number"
                value={formData.chassisNumber}
                onChangeText={(text) => handleChange("chassisNumber", text)}
              />
            </View>

            {/* Engine Number */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Engine Number
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter engine number"
                value={formData.engineNumber}
                onChangeText={(text) => handleChange("engineNumber", text)}
              />
            </View>

            {/* DOCUMENTATION & PERMIT SECTION */}
            <Text
              className="text-lg font-bold mb-4 text-[#D4AF37]"
              style={{ fontFamily: "Cinzel" }}
            >
              Documentation & Permit
            </Text>

            {/* Permit Type */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Permit Type
              </Text>
              <View className="flex-row flex-wrap">
                {PERMIT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    className={`mr-2 mb-2 px-4 py-2 rounded-lg border ${
                      formData.permitType === type
                        ? "bg-[#D4AF37] border-[#D4AF37]"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => handleChange("permitType", type)}
                  >
                    <Text
                      className={`${
                        formData.permitType === type
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                      style={{ fontFamily: "Poppins" }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Permit Details */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Permit Details
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter permit details"
                value={formData.permitDetails}
                onChangeText={(text) => handleChange("permitDetails", text)}
              />
            </View>

            {/* Fitness Certificate Validity */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Fitness Certificate Validity
              </Text>
              <TouchableOpacity
                className="bg-gray-50 rounded-lg p-3 border border-gray-300 flex-row justify-between items-center"
                onPress={() => setShowFitnessDatePicker(true)}
              >
                <Text
                  className="text-gray-700"
                  style={{ fontFamily: "Poppins" }}
                >
                  {formatDate(formData.fitnessValidity)}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#888" />
              </TouchableOpacity>

              {showFitnessDatePicker && (
                <DateTimePicker
                  value={formData.fitnessValidity}
                  mode="date"
                  display="default"
                  onChange={(event, date) =>
                    handleDateChange(event, date, "fitnessValidity")
                  }
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Insurance Validity */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Insurance Validity
              </Text>
              <TouchableOpacity
                className="bg-gray-50 rounded-lg p-3 border border-gray-300 flex-row justify-between items-center"
                onPress={() => setShowInsuranceDatePicker(true)}
              >
                <Text
                  className="text-gray-700"
                  style={{ fontFamily: "Poppins" }}
                >
                  {formatDate(formData.insuranceValidity)}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color="#888" />
              </TouchableOpacity>

              {showInsuranceDatePicker && (
                <DateTimePicker
                  value={formData.insuranceValidity}
                  mode="date"
                  display="default"
                  onChange={(event, date) =>
                    handleDateChange(event, date, "insuranceValidity")
                  }
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* MAINTENANCE DETAILS SECTION */}
            <Text
              className="text-lg font-bold mb-4 text-[#D4AF37]"
              style={{ fontFamily: "Cinzel" }}
            >
              Maintenance Details
            </Text>

            {/* Maintenance Schedule */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Maintenance Schedule
              </Text>
              <View className="flex-row flex-wrap">
                {MAINTENANCE_SCHEDULES.map(({ label, period }) => (
                  <TouchableOpacity
                    key={label}
                    className={`mr-2 mb-2 px-4 py-2 rounded-lg border ${
                      formData.maintenanceSchedule === label
                        ? "bg-[#D4AF37] border-[#D4AF37]"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        maintenanceSchedule: label,
                        maintenancePeriod: period,
                      });
                    }}
                  >
                    <Text
                      className={`${
                        formData.maintenanceSchedule === label
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                      style={{ fontFamily: "Poppins" }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* FUEL DETAILS SECTION */}
            <Text
              className="text-lg font-bold mb-4 text-[#D4AF37]"
              style={{ fontFamily: "Cinzel" }}
            >
              Fuel Details
            </Text>

            {/* Fuel Type */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Fuel Type
              </Text>
              <View className="flex-row flex-wrap">
                {FUEL_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    className={`mr-2 mb-2 px-4 py-2 rounded-lg border ${
                      formData.fuelType === type
                        ? "bg-[#D4AF37] border-[#D4AF37]"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => handleChange("fuelType", type)}
                  >
                    <Text
                      className={`${
                        formData.fuelType === type
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                      style={{ fontFamily: "Poppins" }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tank Capacity */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Tank Capacity (liters)
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter tank capacity"
                value={formData.tankCapacity}
                onChangeText={(text) => handleChange("tankCapacity", text)}
                keyboardType="numeric"
              />
            </View>

            {/* Average Fuel Consumption */}
            <View className="mb-4">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Average Fuel Consumption (km/l)
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter average consumption"
                value={formData.averageFuelConsumption}
                onChangeText={(text) =>
                  handleChange("averageFuelConsumption", text)
                }
                keyboardType="numeric"
              />
            </View>

            {/* Odometer */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Current Odometer Reading (km)
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg p-3 text-gray-800 border border-gray-300"
                style={{ fontFamily: "Poppins" }}
                placeholder="Enter odometer reading"
                value={formData.odometer}
                onChangeText={(text) => handleChange("odometer", text)}
                keyboardType="numeric"
              />
            </View>

            {/* STATUS SECTION */}
            <Text
              className="text-lg font-bold mb-4 text-[#D4AF37]"
              style={{ fontFamily: "Cinzel" }}
            >
              Status
            </Text>

            {/* Status Picker */}
            <View className="mb-6">
              <Text
                className="text-gray-700 mb-2"
                style={{ fontFamily: "Poppins" }}
              >
                Current Status
              </Text>
              <View className="bg-gray-50 rounded-lg border border-gray-300">
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                  style={{ fontFamily: "Poppins" }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Submit Button */}
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
                  Register Truck
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
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
