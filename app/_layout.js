import { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { store } from "../store";
import "../global.css";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel: require("../assets/fonts/cinzel.ttf"),
    Poppins: require("../assets/fonts/poppins.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide splash screen after fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(driver)" />
          <Stack.Screen name="(admin)" />
        </Stack>
        <Toast />
      </GestureHandlerRootView>
    </Provider>
  );
}
