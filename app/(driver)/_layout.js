import { Stack } from "expo-router";
import { TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { logout } from "../../store/slices/authSlice";
import { AuthService } from "../../services";

export default function DriverLayout() {
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      dispatch(logout());
      Toast.show({
        type: "success",
        text1: "Logged Out",
        text2: "You have been logged out successfully",
        position: "top",
      });
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#D4AF37",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontFamily: "Cinzel",
          fontSize: 20,
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} className="mr-4">
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Driver Dashboard",
        }}
      />
      <Stack.Screen
        name="shift/active"
        options={{
          title: "Active Shift",
        }}
      />
      <Stack.Screen
        name="shift/trips"
        options={{
          title: "Trip List",
        }}
      />
      <Stack.Screen
        name="shift/history"
        options={{
          title: "Shift History",
        }}
      />
      <Stack.Screen
        name="trip/[id]"
        options={{
          title: "Trip Details",
        }}
      />
      <Stack.Screen
        name="trip/end"
        options={{
          title: "End Trip",
        }}
      />
    </Stack>
  );
}
