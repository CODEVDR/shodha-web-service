import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { AuthService } from "../services";
import { loginSuccess } from "../store/slices/authSlice";
import { ROLES } from "../utils";

export default function Index() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await AuthService.getUserData();

      if (userData) {
        // User is authenticated, restore session
        dispatch(loginSuccess(userData));

        // Redirect based on role
        if (userData.role === ROLES.ADMIN) {
          router.replace("/(admin)");
        } else if (userData.role === ROLES.DRIVER) {
          router.replace("/(driver)");
        }
      } else {
        // Not authenticated, go to login
        router.replace("/(auth)/login");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      router.replace("/(auth)/login");
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
}
