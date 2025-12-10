import { Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { logout } from "../../store/slices/authSlice";
import { AuthService } from "../../services";

export default function AdminLayout() {
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
          title: "Admin Dashboard",
        }}
      />
      <Stack.Screen
        name="tracking/live"
        options={{
          title: "Live Tracking",
        }}
      />
      <Stack.Screen
        name="fleet/trucks"
        options={{
          title: "Manage Trucks",
        }}
      />
      <Stack.Screen
        name="fleet/drivers"
        options={{
          title: "Manage Drivers",
        }}
      />
      <Stack.Screen
        name="fleet/shifts"
        options={{
          title: "Manage Shifts",
        }}
      />
      <Stack.Screen
        name="geofence/manage"
        options={{
          title: "Geofences",
        }}
      />
      <Stack.Screen
        name="geofence/create"
        options={{
          title: "Create Geofence",
        }}
      />
      <Stack.Screen
        name="reports/index"
        options={{
          title: "Reports",
        }}
      />
    </Stack>
  );
}
