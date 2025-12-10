import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { TruckService, ShiftService } from "../../../services";
import apiClient from "../../../services/api/apiClient";

export default function Reports() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalTrucks: 0, activeTrips: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [trucksResponse, tripsResponse] = await Promise.all([
        TruckService.getAllTrucks(),
        apiClient.get("/trips"),
      ]);

      const totalTrucks = trucksResponse.success
        ? (trucksResponse.data || []).length
        : 0;
      const activeTrips = tripsResponse.success
        ? (tripsResponse.data || []).filter(
            (trip) => trip.status === "in-progress" || trip.status === "active"
          ).length
        : 0;

      setStats({ totalTrucks, activeTrips });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };
  const reportTypes = [
    {
      title: "Fleet Summary",
      description: "Overview of all fleet activities",
      icon: "car-outline",
      color: "#2196F3",
    },
    {
      title: "Driver Performance",
      description: "Driver efficiency and metrics",
      icon: "people-outline",
      color: "#4CAF50",
    },
    {
      title: "Trip Analytics",
      description: "Detailed trip statistics",
      icon: "analytics-outline",
      color: "#FF9800",
    },
    {
      title: "Fuel Consumption",
      description: "Fuel usage and costs",
      icon: "water-outline",
      color: "#F44336",
    },
    {
      title: "Geofence Violations",
      description: "Zone entry/exit reports",
      icon: "warning-outline",
      color: "#9C27B0",
    },
    {
      title: "Monthly Summary",
      description: "Comprehensive monthly report",
      icon: "calendar-outline",
      color: "#00BCD4",
    },
  ];

  const handleGenerateReport = (title) => {
    Toast.show({
      type: "info",
      text1: "Generating Report",
      text2: `${title} report is being generated`,
      position: "top",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D4AF37"]}
          />
        }
      >
        <View className="p-6">
          <Text
            className="text-2xl text-gray-800 mb-2"
            style={{ fontFamily: "Cinzel" }}
          >
            Reports & Analytics
          </Text>
          <Text
            className="text-gray-600 mb-6"
            style={{ fontFamily: "Poppins" }}
          >
            Generate detailed reports and insights
          </Text>

          {/* Stats Cards */}
          <View className="flex-row mb-6">
            <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm">
              <Ionicons name="car" size={24} color="#D4AF37" />
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#D4AF37"
                  className="mt-2"
                />
              ) : (
                <Text
                  className="text-2xl text-gray-800 mt-2 font-bold"
                  style={{ fontFamily: "Poppins" }}
                >
                  {stats.totalTrucks}
                </Text>
              )}
              <Text
                className="text-sm text-gray-600"
                style={{ fontFamily: "Poppins" }}
              >
                Total Trucks
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm">
              <Ionicons name="location" size={24} color="#D4AF37" />
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#D4AF37"
                  className="mt-2"
                />
              ) : (
                <Text
                  className="text-2xl text-gray-800 mt-2 font-bold"
                  style={{ fontFamily: "Poppins" }}
                >
                  {stats.activeTrips}
                </Text>
              )}
              <Text
                className="text-sm text-gray-600"
                style={{ fontFamily: "Poppins" }}
              >
                Active Trips
              </Text>
            </View>
          </View>

          {/* Report Types */}
          <Text
            className="text-xl text-gray-800 mb-4"
            style={{ fontFamily: "Cinzel" }}
          >
            Available Reports
          </Text>

          {reportTypes.map((report, index) => (
            <TouchableOpacity
              key={index}
              className="bg-white rounded-xl p-5 mb-4 shadow-sm"
              onPress={() => handleGenerateReport(report.title)}
            >
              <View className="flex-row items-center">
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${report.color}20` }}
                >
                  <Ionicons name={report.icon} size={28} color={report.color} />
                </View>
                <View className="flex-1 ml-4">
                  <Text
                    className="text-lg text-gray-800 mb-1"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {report.title}
                  </Text>
                  <Text
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {report.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#D4AF37" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
