import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Region } from "react-native-maps";
import { ChargingStation } from "../../../types/charging.types";
import ChargingStationService from "./ChargingStationService";
import SearchBar from "./components/SearchBar";
import SearchResults from "./components/SearchResults";
import ChargingMapView from "./components/ChargingMapView";
import StationBottomSheet from "./components/StationBottomSheet";


export default function ChargingScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 13.7543,
    longitude: 100.5677,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Track region changes to prevent loops
  const lastRegionRef = useRef<Region>(region);

  const service = useRef(ChargingStationService.getInstance()).current;
  const bottomSheetAnimation = useRef(new Animated.Value(0)).current;
  const regionRef = useRef(region);
  const isAnimating = useRef(false);
  const isUserInteracting = useRef(false);

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        updateUserRegion(location.coords);
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  }, []);

  const updateUserRegion = useCallback((coords: Location.LocationObjectCoords) => {
    const newRegion = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    // Only update if still at default location (first time setting user location)
    if (
      Math.abs(regionRef.current.latitude - 13.7543) < 0.001 &&
      Math.abs(regionRef.current.longitude - 100.5677) < 0.001
    ) {
      regionRef.current = newRegion;
      lastRegionRef.current = newRegion;
      setRegion(newRegion);
    }
  }, []);

  const initializeData = useCallback(async () => {
    try {
      await requestLocationPermission();
      await service.loadChargingStations();
      setLoading(false);
    } catch (error) {
      console.error("Error initializing data:", error);
      setLoading(false);
    }
  }, [requestLocationPermission, service]);

  // Initialize data and permissions
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Get filtered stations based on search
  const filteredStations = service.searchStations(searchQuery);

  // UI Event handlers
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    setShowSearchResults(query.length > 0);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
    setShowSearchResults(false);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (searchQuery.length > 0) {
      setShowSearchResults(true);
    }
  }, [searchQuery]);

  const handleStationPress = useCallback((station: ChargingStation) => {
    setSelectedStation(station);
    Animated.timing(bottomSheetAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [bottomSheetAnimation]);

  const handleSearchResultPress = useCallback(
    (station: ChargingStation) => {
      setSearchQuery("");
      setShowSearchResults(false);
      Keyboard.dismiss();

      const newRegion: Region = {
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      const current = regionRef.current;
      if (
        Math.abs(current.latitude - newRegion.latitude) < 0.0001 &&
        Math.abs(current.longitude - newRegion.longitude) < 0.0001
      ) {
        handleStationPress(station);
        return;
      }

      if (isUserInteracting.current) {
        return;
      }

      isAnimating.current = true;
      regionRef.current = newRegion;
      setRegion(newRegion);

      setTimeout(() => {
        handleStationPress(station);
      }, 250);
    },
    [handleStationPress]
  );

  const handleMapPress = useCallback(() => {
    Keyboard.dismiss();
    setShowSearchResults(false);
    if (selectedStation) {
      closeBottomSheet();
    }
  }, [selectedStation]);

  
  const closeBottomSheet = useCallback(() => {
    console.log('Closing bottom sheet...');
    Animated.timing(bottomSheetAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      console.log('Bottom sheet animation completed');
      setSelectedStation(null);
    });
  }, [bottomSheetAnimation]);

  const goToMyLocation = useCallback(async () => {
    console.log('goToMyLocation called, userLocation:', !!userLocation);

    if (userLocation) {
      // Always zoom to user location when button is pressed
      const targetRegion = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.02, // Zoom in closer
        longitudeDelta: 0.02,
      };

      const current = regionRef.current;
      console.log('Current region:', current);
      console.log('Target region:', targetRegion);

      // Reset animation and interaction flags
      isAnimating.current = false;
      isUserInteracting.current = false;

      // Check if we're already at the target location and zoom
      const centerDistance = Math.sqrt(
        Math.pow(current.latitude - targetRegion.latitude, 2) +
        Math.pow(current.longitude - targetRegion.longitude, 2)
      );

      const isAtTarget = centerDistance < 0.0001 &&
        Math.abs(current.latitudeDelta - targetRegion.latitudeDelta) < 0.001;

      console.log('Center distance to target:', centerDistance);
      console.log('Is at target location:', isAtTarget);

      if (isAtTarget) {
        console.log('Already at target location, resetting to standard view');
        // If already at target, reset to standard zoom level
        const standardRegion = {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        isAnimating.current = true;
        regionRef.current = standardRegion;
        setRegion(standardRegion);

        setTimeout(() => {
          isAnimating.current = false;
        }, 1000);
      } else {
        console.log('Zooming to user location');
        isAnimating.current = true;
        regionRef.current = targetRegion;
        setRegion(targetRegion);

        setTimeout(() => {
          isAnimating.current = false;
        }, 1000);
      }
    } else {
      console.log('No user location, requesting permission');
      await requestLocationPermission();
    }
  }, [userLocation, requestLocationPermission]);

  const navigateToStation = useCallback(() => {
    if (selectedStation) {
      const { latitude, longitude, name, address } = selectedStation;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(
        name
      )}&destination_place_name=${encodeURIComponent(name + ", " + address)}`;

      Alert.alert(
        "นำทาง",
        `ต้องการเปิด Google Maps เพื่อนำทางไปยัง ${selectedStation.name} หรือไม่?`,
        [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "เปิด Google Maps",
            onPress: () => {
              Linking.openURL(url).catch((error: any) => {
                console.error("Error opening Google Maps:", error);
                Alert.alert(
                  "ข้อผิดพลาด",
                  "ไม่สามารถเปิด Google Maps ได้ กรุณาตรวจสอบว่ามีแอปติดตั้งหรือไม่"
                );
              });
            },
          },
        ]
      );
    }
  }, [selectedStation]);

  const goBack = () => {
    router.back();
  };

  const getDistanceInfo = useCallback(
    (station: ChargingStation) => {
      if (!userLocation) {
        return {
          distance: 0,
          distanceText: "ไม่ทราบระยะทาง",
          duration: 0,
          durationText: "-",
        };
      }

      return service.getDistanceInfo(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        station
      );
    },
    [userLocation, service]
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูลสถานีชาร์จ...</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar style="dark" backgroundColor="#ffffff" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>สถานีชาร์จ</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          onSearchSubmit={handleSearchSubmit}
          onFocus={handleSearchFocus}
        />

        {/* Search Results */}
        {showSearchResults && filteredStations.length > 0 && (
          <SearchResults
            stations={filteredStations}
            onStationPress={handleSearchResultPress}
            totalResults={filteredStations.length}
          />
        )}

        {/* No Results */}
        {filteredStations.length === 0 && searchQuery.length > 0 && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={48} color="#9ca3af" />
            <Text style={styles.noResultsTitle}>ไม่พบสถานีชาร์จ</Text>
            <Text style={styles.noResultsText}>
              ไม่พบสถานีที่ตรงกับคำค้นหา &quot;{searchQuery}&quot;
            </Text>
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => {
                setSearchQuery("");
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.clearSearchText}>ล้างการค้นหา</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Map */}
        {filteredStations.length > 0 && (
          <ChargingMapView
            stations={filteredStations}
            region={region}
            onRegionChange={undefined}
            onRegionChangeComplete={undefined}
            onStationPress={handleStationPress}
            onMapPress={handleMapPress}
            showUserLocation={!!userLocation}
            onMyLocationPress={goToMyLocation}
          />
        )}

        {/* Bottom Sheet */}
        {selectedStation && (
          <StationBottomSheet
            station={selectedStation}
            onClose={closeBottomSheet}
            onNavigate={navigateToStation}
            distanceInfo={getDistanceInfo(selectedStation)}
            bottomSheetAnimation={bottomSheetAnimation}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  placeholder: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  locationButton: {
    position: "absolute",
    bottom: 20,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  clearSearchButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#10b981",
    borderRadius: 8,
  },
  clearSearchText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});