import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ShiftHistory() {
  const history = [
    {
      id: 1,
      date: "Dec 4, 2025",
      duration: "8h 30m",
      trips: 5,
      distance: "350 km",
    },
    {
      id: 2,
      date: "Dec 3, 2025",
      duration: "7h 45m",
      trips: 4,
      distance: "280 km",
    },
    {
      id: 3,
      date: "Dec 2, 2025",
      duration: "8h 15m",
      trips: 6,
      distance: "420 km",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Text
            className="text-2xl text-gray-800 mb-6"
            style={{ fontFamily: "Cinzel" }}
          >
            Shift History
          </Text>

          {history.map((shift) => (
            <View
              key={shift.id}
              className="bg-white rounded-xl p-5 mb-4 shadow-sm"
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-lg text-gray-800"
                  style={{ fontFamily: "Poppins" }}
                >
                  {shift.date}
                </Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text
                    className="text-green-600 text-xs font-semibold"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Completed
                  </Text>
                </View>
              </View>

              <View className="space-y-2">
                <View className="flex-row items-center py-2">
                  <Ionicons name="time-outline" size={18} color="#D4AF37" />
                  <Text
                    className="text-gray-600 ml-3"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Duration: {shift.duration}
                  </Text>
                </View>
                <View className="flex-row items-center py-2">
                  <Ionicons name="car-outline" size={18} color="#D4AF37" />
                  <Text
                    className="text-gray-600 ml-3"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Trips: {shift.trips}
                  </Text>
                </View>
                <View className="flex-row items-center py-2">
                  <Ionicons name="location-outline" size={18} color="#D4AF37" />
                  <Text
                    className="text-gray-600 ml-3"
                    style={{ fontFamily: "Poppins" }}
                  >
                    Distance: {shift.distance}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
