import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

const GRAPHHOPPER_API_KEY =
  Constants.expoConfig?.extra?.GRAPHHOPPER_API_KEY ||
  process.env.EXPO_PUBLIC_GRAPHHOPPER_API_KEY;

export default function LocationAutocomplete({
  placeholder = "Search location",
  onLocationSelect,
  country = "IN",
  provider = "default",
  minChars = 3,
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= minChars) {
        searchLocations(query);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const searchLocations = async (searchText) => {
    if (!GRAPHHOPPER_API_KEY) return;
    setLoading(true);
    try {
      const url = new URL("https://graphhopper.com/api/1/geocode");
      url.searchParams.set("q", searchText);
      url.searchParams.set("locale", "en");
      url.searchParams.set("limit", "8");
      url.searchParams.set("provider", provider);
      if (country) url.searchParams.set("country", country);
      url.searchParams.set("key", GRAPHHOPPER_API_KEY);

      const resp = await fetch(url.toString());
      const data = await resp.json();
      if (data && data.hits) {
        setSuggestions(data.hits);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location) => {
    const formatted = `${location.name}${location.city ? ", " + location.city : ""}${location.state ? ", " + location.state : ""}`;
    setQuery(formatted);
    setShowSuggestions(false);

    if (onLocationSelect) {
      onLocationSelect({
        name: formatted,
        latitude: location.point.lat,
        longitude: location.point.lng,
        city: location.city,
        state: location.state,
        country: location.country,
      });
    }
  };

  const renderSuggestion = (item, index) => (
    <TouchableOpacity
      key={`${item.osm_id || index}`}
      className="p-3 border-b border-gray-200 flex-row items-center"
      onPress={() => handleSelectLocation(item)}
    >
      <Ionicons name="location-outline" size={20} color="#D4AF37" />
      <View className="ml-3 flex-1">
        <Text
          className="text-gray-800 font-medium"
          style={{ fontFamily: "Poppins" }}
        >
          {item.name}
        </Text>
        <Text
          className="text-gray-500 text-sm"
          style={{ fontFamily: "Poppins" }}
        >
          {[item.city, item.state, item.country].filter(Boolean).join(", ")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ zIndex: 1000 }}>
      {showSuggestions && suggestions.length > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            marginBottom: 8,
            maxHeight: 256,
            zIndex: 9999,
          }}
        >
          <ScrollView nestedScrollEnabled>
            {suggestions.map((item, index) => renderSuggestion(item, index))}
          </ScrollView>
        </View>
      )}
      <View className="flex-row items-center bg-gray-50 rounded-lg border border-gray-300 px-3">
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          className="flex-1 p-3 text-gray-800"
          style={{ fontFamily: "Poppins" }}
          placeholder={placeholder}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setShowSuggestions(true)}
        />
        {loading && <ActivityIndicator size="small" color="#D4AF37" />}
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setSuggestions([]);
            }}
          >
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
