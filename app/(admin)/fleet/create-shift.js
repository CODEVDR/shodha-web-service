import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import apiClient from "../../../services/api/apiClient";

export default function CreateShift() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [formData, setFormData] = useState({
    driverId: "",
    truckId: "",
    startLocation: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Load drivers, trucks, and pending trips
      const [driversResponse, trucksResponse, tripsResponse] =
        await Promise.all([
          apiClient.get("/drivers"),
          apiClient.get("/trucks"),
          apiClient.get("/trips?status=pending"),
        ]);

      if (driversResponse.success) {
        // Filter available drivers (not currently on shift)
        const availableDrivers = (driversResponse.data || []).filter(
          (driver) => !driver.currentShift
        );
        setDrivers(availableDrivers);
      }

      if (trucksResponse.success) {
        // Filter available trucks
        const availableTrucks = (trucksResponse.data || []).filter(
          (truck) => truck.status === "available"
        );
        setTrucks(availableTrucks);
      }

      if (tripsResponse.success) {
        setTrips(tripsResponse.data || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load data",
        position: "top",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const toggleTripSelection = (tripId) => {
    setSelectedTrips((prev) => {
      if (prev.includes(tripId)) {
        return prev.filter((id) => id !== tripId);
      } else {
        return [...prev, tripId];
      }
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (
      !formData.driverId ||
      !formData.truckId ||
      !formData.startLocation.trim()
    ) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please fill in all required fields",
        position: "top",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post("/shifts/start", {
        driverId: formData.driverId,
        truckId: formData.truckId,
        startLocation: {
          type: "Point",
          coordinates: [0, 0], // You can add map integration later
          address: formData.startLocation,
        },
        tripIds: selectedTrips,
      });

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Shift Created",
          text2: "New shift has been started successfully",
          position: "top",
        });

        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to create shift",
          position: "top",
        });
      }
    } catch (error) {
      console.error("Failed to create shift:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to create shift. Please try again.",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
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
            Loading data...
          </Text>
        </View>
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
              Create New Shift
            </Text>
          </View>

          {/* Check if data is available */}
          {drivers.length === 0 || trucks.length === 0 ? (
            <View className="bg-yellow-50 rounded-2xl p-6 mb-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="warning-outline" size={24} color="#D97706" />
                <Text
                  className="text-yellow-800 text-lg ml-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Cannot Create Shift
                </Text>
              </View>
              <Text
                className="text-yellow-700"
                style={{ fontFamily: "Poppins" }}
              >
                {drivers.length === 0 && "No available drivers found. "}
                {trucks.length === 0 && "No available trucks found. "}
                Please add drivers and trucks first.
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl p-6 shadow-sm">
              {/* Select Driver */}
              <View className="mb-4">
                <Text
                  className="text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Select Driver *
                </Text>
                <View className="bg-gray-50 rounded-lg">
                  <Picker
                    selectedValue={formData.driverId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, driverId: value })
                    }
                    style={{ fontFamily: "Poppins" }}
                  >
                    <Picker.Item label="Choose a driver" value="" />
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

              {/* Select Truck */}
              <View className="mb-4">
                <Text
                  className="text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Select Truck *
                </Text>
                <View className="bg-gray-50 rounded-lg">
                  <Picker
                    selectedValue={formData.truckId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, truckId: value })
                    }
                    style={{ fontFamily: "Poppins" }}
                  >
                    <Picker.Item label="Choose a truck" value="" />
                    {trucks.map((truck) => (
                      <Picker.Item
                        key={truck._id}
                        label={`${truck.truckNumber} - ${truck.model}`}
                        value={truck._id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Start Location */}
              <View className="mb-6">
                <Text
                  className="text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Start Location *
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-lg p-3 text-gray-800"
                  style={{ fontFamily: "Poppins" }}
                  placeholder="Enter start location address"
                  value={formData.startLocation}
                  onChangeText={(text) =>
                    setFormData({ ...formData, startLocation: text })
                  }
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Select Trips (Optional) */}
              <View className="mb-6">
                <Text
                  className="text-gray-700 mb-2"
                  style={{ fontFamily: "Poppins" }}
                >
                  Assign Trips (Optional)
                </Text>
                {trips.length === 0 ? (
                  <Text className="text-gray-500 italic">
                    No pending trips available
                  </Text>
                ) : (
                  <View className="bg-gray-50 rounded-lg p-2 max-h-48">
                    <ScrollView nestedScrollEnabled={true}>
                      {trips.map((trip) => (
                        <TouchableOpacity
                          key={trip._id}
                          onPress={() => toggleTripSelection(trip._id)}
                          className={`flex-row items-center p-3 mb-2 rounded-lg border ${
                            selectedTrips.includes(trip._id)
                              ? "bg-blue-50 border-blue-500"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <Ionicons
                            name={
                              selectedTrips.includes(trip._id)
                                ? "checkbox"
                                : "square-outline"
                            }
                            size={24}
                            color={
                              selectedTrips.includes(trip._id)
                                ? "#3B82F6"
                                : "#9CA3AF"
                            }
                          />
                          <View className="ml-3 flex-1">
                            <Text className="font-bold text-gray-800">
                              {trip.startLocation?.address || "Unknown Start"}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              To: {trip.endLocation?.address || "Unknown End"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className="bg-[#D4AF37] rounded-lg p-4 items-center"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className="text-white text-lg font-semibold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Start Shift
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
