import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function TripsList() {
  const trips = [
    { id: 1, destination: "Mumbai", status: "In Progress", distance: "450 km" },
    { id: 2, destination: "Pune", status: "Pending", distance: "250 km" },
    { id: 3, destination: "Nashik", status: "Pending", distance: "180 km" },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-100 text-blue-600";
      case "Completed":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text
            className="text-2xl text-gray-800 mb-6"
            style={{ fontFamily: "Cinzel" }}
          >
            Today's Trips
          </Text>

          {trips.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Ionicons name="folder-open-outline" size={64} color="#D4AF37" />
              <Text
                className="text-gray-600 text-lg mt-4 text-center"
                style={{ fontFamily: "Poppins" }}
              >
                No trips scheduled for today
              </Text>
            </View>
          ) : (
            trips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                className="bg-white rounded-xl p-5 mb-4 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text
                      className="text-lg text-gray-800 mb-1"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Trip #{trip.id}
                    </Text>
                    <Text
                      className="text-base text-gray-600"
                      style={{ fontFamily: "Poppins" }}
                    >
                      Destination: {trip.destination}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${getStatusColor(
                      trip.status
                    )}`}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ fontFamily: "Poppins" }}
                    >
                      {trip.status}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center mt-2">
                  <Ionicons name="location-outline" size={16} color="#D4AF37" />
                  <Text
                    className="text-sm text-gray-600 ml-2"
                    style={{ fontFamily: "Poppins" }}
                  >
                    {trip.distance}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
