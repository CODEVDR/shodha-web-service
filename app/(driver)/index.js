import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useState, useEffect, useRef } from "react";
import Toast from "react-native-toast-message";
import { AutoShiftService, NotificationService } from "../../services";

export default function DriverDashboard() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [istTime, setIstTime] = useState(null);
  const [myActiveShift, setMyActiveShift] = useState(null);
  const [shiftSchedules, setShiftSchedules] = useState([]);

  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    loadData();
    initializeNotifications();

    return () => {
      if (notificationListener.current) {
        NotificationService.removeAllListeners();
      }
    };
  }, []);

  const initializeNotifications = async () => {
    // Request permissions
    const hasPermission = await NotificationService.requestPermissions();
    if (hasPermission) {
      console.log("Notification permissions granted");
    }

    // Listen for notifications
    notificationListener.current = NotificationService.addNotificationListener(
      (notification) => {
        console.log("Notification received:", notification);
        // Reload data when trip assigned
        if (notification.request.content.data.type === "TRIP_ASSIGNED") {
          loadData();
        }
      }
    );

    // Listen for notification taps
    responseListener.current =
      NotificationService.addNotificationResponseListener((response) => {
        const screen = response.notification.request.content.data.screen;
        const tripId = response.notification.request.content.data.tripId;
        if (screen && tripId) {
          router.push(screen.replace("[id]", tripId));
        }
      });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, myShiftRes] = await Promise.all([
        AutoShiftService.getShiftSchedules(),
        AutoShiftService.getMyShift(),
      ]);

      if (schedulesRes.success) {
        setShiftSchedules(schedulesRes.data.schedules || []);
        setCurrentShift(schedulesRes.data.current);
        setIstTime(schedulesRes.data.istTime);
      }

      if (myShiftRes.success && myShiftRes.data) {
        setMyActiveShift(myShiftRes.data);
      } else {
        setMyActiveShift(null);
      }
    } catch (error) {
      console.log("Error loading shift data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleActivateShift = async () => {
    try {
      setLoading(true);
      console.log("Attempting to activate shift...");
      const response = await AutoShiftService.activateShift();
      console.log(
        "Activate shift response:",
        JSON.stringify(response, null, 2)
      );

      if (response.success) {
        // Send notification to admin
        await NotificationService.notifyShiftActivated(
          user?.name || "Driver",
          response.data.truck?.registrationNumber || "N/A"
        );

        Toast.show({
          type: "success",
          text1: "Success",
          text2: `Shift activated! Truck ${response.data.truck?.registrationNumber || ""} assigned`,
        });
        loadData();
      } else {
        console.log("Shift activation failed:", response.message);
        Toast.show({
          type: "error",
          text1: "Cannot Activate Shift",
          text2: response.message || "Failed to activate shift",
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error("Shift activation error:", error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to activate shift";
      Toast.show({
        type: "error",
        text1: "Error",
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!myActiveShift) return;

    try {
      setLoading(true);
      const response = await AutoShiftService.releaseShift(myActiveShift._id);

      if (response.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Shift ended successfully",
        });
        setMyActiveShift(null);
        loadData();
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: response.message || "Failed to end shift",
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to end shift",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const menuItems = [
    {
      title: "Active Shift",
      icon: "time-outline",
      route: "/(driver)/shift/active",
      color: "#4CAF50",
    },
    {
      title: "Trip List",
      icon: "list-outline",
      route: "/(driver)/shift/trips",
      color: "#2196F3",
    },
    {
      title: "Shift History",
      icon: "calendar-outline",
      route: "/(driver)/shift/history",
      color: "#FF9800",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6">
          {/* Welcome Section */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <Text
              className="text-2xl text-gray-800 mb-2"
              style={{ fontFamily: "Cinzel" }}
            >
              Welcome Back!
            </Text>
            <Text
              className="text-lg text-[#D4AF37]"
              style={{ fontFamily: "Poppins" }}
            >
              {user?.name || "Driver"}
            </Text>
            <View className="mt-4 pt-4 border-t border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text
                  className="ml-2 text-gray-600"
                  style={{ fontFamily: "Poppins" }}
                >
                  Status: Ready for Trip
                </Text>
              </View>
            </View>
          </View>

          {/* Current Shift Status */}
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <Text
              className="text-lg text-gray-800 mb-4"
              style={{ fontFamily: "Poppins", fontWeight: "600" }}
            >
              Shift Status
            </Text>

            {/* Current Time & Shift Schedule */}
            {currentShift && (
              <View className="bg-green-50 rounded-xl p-4 mb-4">
                <View className="flex-row items-center mb-2">
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "#10B981",
                      marginRight: 8,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#10B981",
                    }}
                  >
                    {currentShift.name} - ACTIVE
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Poppins",
                    fontSize: 13,
                    color: "#666",
                  }}
                >
                  {currentShift.startHour}:
                  {String(currentShift.startMinute).padStart(2, "0")} -{" "}
                  {currentShift.endHour}:
                  {String(currentShift.endMinute).padStart(2, "0")} IST
                </Text>
                {istTime && (
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 12,
                      color: "#999",
                      marginTop: 4,
                    }}
                  >
                    Current Time: {istTime}
                  </Text>
                )}
              </View>
            )}

            {/* My Active Shift */}
            {myActiveShift ? (
              <View>
                <View className="bg-blue-50 rounded-xl p-4 mb-3">
                  <Text
                    style={{
                      fontFamily: "Poppins",
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#1F2937",
                      marginBottom: 8,
                    }}
                  >
                    Your Active Shift
                  </Text>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="car" size={18} color="#3B82F6" />
                    <Text
                      className="ml-2 text-gray-700"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Truck: {myActiveShift.truck?.registrationNumber || "N/A"}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={18} color="#3B82F6" />
                    <Text
                      className="ml-2 text-gray-700"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Started:{" "}
                      {new Date(myActiveShift.startTime).toLocaleTimeString()}
                    </Text>
                  </View>
                  {myActiveShift.trips && myActiveShift.trips.length > 0 && (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="list" size={18} color="#3B82F6" />
                      <Text
                        className="ml-2 text-gray-700"
                        style={{ fontFamily: "Poppins" }}
                      >
                        {myActiveShift.trips.length} trip(s) assigned
                      </Text>
                    </View>
                  )}
                </View>

                {/* View Route Button */}
                <TouchableOpacity
                  onPress={() => router.push("/(driver)/shift/active")}
                  className="bg-green-500 rounded-lg py-3 items-center mb-3 flex-row justify-center"
                >
                  <Ionicons name="map" size={20} color="#fff" />
                  <Text
                    className="text-white font-semibold ml-2"
                    style={{ fontFamily: "Poppins" }}
                  >
                    View Route & Track Location
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleEndShift}
                  className="bg-red-500 rounded-lg py-3 items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      className="text-white font-semibold"
                      style={{ fontFamily: "Poppins" }}
                    >
                      End Shift
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View className="items-center py-4">
                  <Ionicons name="time-outline" size={40} color="#D1D5DB" />
                  <Text
                    className="text-gray-500 mt-2 text-center"
                    style={{ fontFamily: "Poppins" }}
                  >
                    No active shift
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleActivateShift}
                  className="bg-[#D4AF37] rounded-lg py-3 items-center"
                  disabled={loading || !currentShift}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      className="text-white font-semibold"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {currentShift
                        ? "Activate Shift"
                        : "No Active Shift Period"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Menu Grid */}
          <View className="mb-6">
            <Text
              className="text-xl text-gray-800 mb-4"
              style={{ fontFamily: "Cinzel" }}
            >
              Quick Access
            </Text>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                className="bg-white rounded-xl p-5 mb-4 flex-row items-center shadow-sm"
                onPress={() => router.push(item.route)}
              >
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <View className="flex-1 ml-4">
                  <Text
                    className="text-lg text-gray-800"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {item.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#D4AF37" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Card */}
          <View className="bg-[#D4AF37] rounded-2xl p-6">
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="information-circle-outline"
                size={24}
                color="#fff"
              />
              <Text
                className="text-white text-lg ml-2"
                style={{ fontFamily: "Cinzel" }}
              >
                Important
              </Text>
            </View>
            <Text
              className="text-white text-sm leading-6"
              style={{ fontFamily: "Poppins" }}
            >
              Remember to start your shift before beginning any trip. Keep your
              GPS enabled for accurate tracking.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
