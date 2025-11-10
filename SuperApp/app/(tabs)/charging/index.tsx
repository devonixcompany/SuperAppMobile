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
  Dimensions,
  Keyboard,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import ClusteredMapView from "react-native-map-clustering";
import { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { mockChargingStationsThai } from "../../../data/mockChargingStations";
import { ChargingStation } from "../../../types/charging.types";
// import { useAuth } from '../../../contexts/AuthContext'; // ใช้เมื่อมี AuthContext

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.4;

export default function ChargingScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] =
    useState<ChargingStation | null>(null);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [chargingStations, setChargingStations] = useState<ChargingStation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 13.7563, // ใจกลางประเทศไทย
    longitude: 100.5018,
    latitudeDelta: 12.0, // ซูมออกเพื่อเห็นทั้งประเทศ
    longitudeDelta: 8.0,
  });
  // เก็บ region ล่าสุดเพื่อใช้ใน callback โดยไม่ต้องใส่ dependency
  const regionRef = useRef(region);
  const isAnimating = useRef(false); // ป้องกัน loop จากการ setRegion
  const isUserInteracting = useRef(false); // ตรวจสอบว่าผู้ใช้กำลังโต้ตอบกับแผนที่หรือไม่

  // ซิงค์ regionRef กับ region state แต่เฉพาะเมื่อไม่มีการ animate และไม่ใช่การเปลี่ยนแปลงเล็กน้อย
  useEffect(() => {
    if (!isAnimating.current) {
      const current = regionRef.current;
      // อัพเดตเฉพาะเมื่อมีการเปลี่ยนแปลงที่มีนัยสำคัญ
      if (
        Math.abs(current.latitude - region.latitude) > 0.0001 ||
        Math.abs(current.longitude - region.longitude) > 0.0001 ||
        Math.abs(current.latitudeDelta - region.latitudeDelta) > 0.0001 ||
        Math.abs(current.longitudeDelta - region.longitudeDelta) > 0.0001
      ) {
        regionRef.current = region;
      }
    }
  }, [region]);

  const mapRef = useRef<ClusteredMapView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const bottomSheetAnimation = useRef(new Animated.Value(0)).current;

  const bottomSheetPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // อนุญาตให้ swipe เฉพาะแนวตั้งและ swipe ลงเท่านั้น ถ้า ScrollView อยู่บนสุดแล้ว
      return (
        Math.abs(gestureState.dy) > 15 &&
        Math.abs(gestureState.dx) < 30 &&
        gestureState.dy > 0
      );
    },
    onPanResponderMove: (_, gestureState) => {
      // ไม่ต้องทำอะไรใน move เพื่อให้ ScrollView ทำงานปกติ
    },
    onPanResponderRelease: (_, gestureState) => {
      // ถ้า swipe ลงเกิน threshold หรือมีความเร็วสูง ให้ปิด bottom sheet
      if (
        gestureState.dy > 100 ||
        (gestureState.dy > 50 && gestureState.vy > 0.3)
      ) {
        Animated.timing(bottomSheetAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setSelectedStation(null);
        });
      }
      // ถ้าไม่เกิน threshold ไม่ต้องทำอะไร (ให้อยู่ตำแหน่งเดิม)
    },
    onPanResponderTerminationRequest: () => false, // อนุญาตให้ ScrollView ทำงานปกติ
  });

  useEffect(() => {
    requestLocationPermission();
    // ใช้ mock data ทั่วประเทศไทย
    setChargingStations(mockChargingStationsThai);
    setLoading(false);

    // TODO: เปิดใช้งานเมื่อมี AuthContext แล้ว
    // loadChargingStations();
  }, []);

  // ป้องกันการเปลี่ยน region โดยไม่จำเป็นเมื่อ component โหลดครั้งแรก
  useEffect(() => {
    // ตั้งค่าเริ่มต้นของ regionRef เพียงครั้งเดียว
    regionRef.current = region;
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);

        // ตั้งค่า region เริ่มต้นให้เป็นตำแหน่งผู้ใช้เมื่อได้รับ permission
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        // ตั้งค่า region เริ่มต้นเฉพาะครั้งแรกเท่านั้น
        if (
          regionRef.current.latitude === 13.7563 &&
          regionRef.current.longitude === 100.5018
        ) {
          regionRef.current = newRegion;
          setRegion(newRegion);
        }
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  };

  const filteredStations = chargingStations.filter(
    (station) =>
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // คำนวณระยะทางระหว่าง 2 จุด (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // รัศมีของโลกเป็น km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // ระยะทางเป็น km
  };

  // คำนวณระยะเวลาโดยประมาณ (สมมติความเร็วเฉลี่ย 40 km/h)
  const calculateDuration = (distance: number): number => {
    const averageSpeed = 40; // km/h
    return (distance / averageSpeed) * 60; // แปลงเป็นนาที
  };

  // ฟังก์ชันสำหรับแสดงระยะทางและเวลา
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

      const distance = calculateDistance(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        station.latitude,
        station.longitude
      );

      const duration = calculateDuration(distance);

      let distanceText = "";
      if (distance < 1) {
        distanceText = `${Math.round(distance * 1000)} ม.`;
      } else {
        distanceText = `${distance.toFixed(1)} กม.`;
      }

      let durationText = "";
      if (duration < 1) {
        durationText = "< 1 นาที";
      } else if (duration < 60) {
        durationText = `${Math.round(duration)} นาที`;
      } else {
        const hours = Math.floor(duration / 60);
        const mins = Math.round(duration % 60);
        durationText = `${hours} ชม. ${mins} นาที`;
      }

      return { distance, distanceText, duration, durationText };
    },
    [userLocation]
  );

  const getMarkerColor = useCallback((status: ChargingStation["status"]) => {
    switch (status) {
      case "available":
        return "#10b981"; // สีเขียว
      case "in-use":
        return "#f59e0b"; // สีส้ม
      case "offline":
        return "#ef4444"; // สีแดง
      default:
        return "#6b7280"; // สีเทา
    }
  }, []);

  const handleMarkerPress = useCallback(
    (station: ChargingStation) => {
      setSelectedStation(station);

      // เปิด bottom sheet โดยไม่เลื่อนแผนที่
      Animated.spring(bottomSheetAnimation, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
    },
    [bottomSheetAnimation]
  );

  // ใช้ useCallback เพื่อป้องกันการสร้างฟังก์ชันใหม่ทุกครั้ง
  const handleSearchResultPress = useCallback(
    (station: ChargingStation) => {
      setSearchQuery("");
      setShowSearchResults(false);
      Keyboard.dismiss();

      // ซูมไปที่สถานีที่เลือกโดยไม่ offset
      const newRegion: Region = {
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      const current = regionRef.current;
      if (
        Math.abs(current.latitude - newRegion.latitude) < 0.0001 &&
        Math.abs(current.longitude - newRegion.longitude) < 0.0001 &&
        Math.abs(current.latitudeDelta - newRegion.latitudeDelta) < 0.0001 &&
        Math.abs(current.longitudeDelta - newRegion.longitudeDelta) < 0.0001
      ) {
        handleMarkerPress(station);
        return;
      }

      // ป้องกันการ setRegion ถ้าผู้ใช้กำลังโต้ตอบกับแผนที่
      if (isUserInteracting.current) {
        return;
      }

      isAnimating.current = true;
      regionRef.current = newRegion;
      setRegion(newRegion);
      // รอ region change ผ่าน onRegionChangeComplete แล้วค่อยเปิด bottom sheet
      const checkAnimationComplete = () => {
        if (!isAnimating.current) {
          handleMarkerPress(station);
        } else {
          // ถ้ายัง animate อยู่ ลองอีกครั้งใน 100ms
          setTimeout(checkAnimationComplete, 100);
        }
      };
      setTimeout(checkAnimationComplete, 250);
    },
    [handleMarkerPress]
  );

  const closeBottomSheet = () => {
    Animated.timing(bottomSheetAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setSelectedStation(null);
    });
  };

  const navigateToStation = () => {
    if (selectedStation) {
      // เปิด Google Maps สำหรับนำทางไปยังสถานีที่เลือก
      const { latitude, longitude, name, address } = selectedStation;

      // สร้าง URL สำหรับ Google Maps
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(
        name
      )}&destination_place_name=${encodeURIComponent(name + ", " + address)}`;

      // เปิด Google Maps ในแอปภายนอก
      Alert.alert(
        "นำทาง",
        `ต้องการเปิด Google Maps เพื่อนำทางไปยัง ${selectedStation.name} หรือไม่?`,
        [
          {
            text: "ยกเลิก",
            style: "cancel",
          },
          {
            text: "เปิด Google Maps",
            onPress: () => {
              // ใช้ Linking เพื่อเปิด URL ภายนอกแอป
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
  };

  const goBack = () => {
    router.back();
  };

  // NOTE: เดิมใช้ useMemo เพื่อ memoize markers แต่ทำให้เกิด state sync ที่ยุ่งยากระหว่าง zoom; ย้ายกลับไป render ตรงๆ ด้านล่าง

  const goToMyLocation = async () => {
    if (userLocation) {
      // ไม่ต้องใช้ offset เพราะอาจทำให้เกิด loop
      // ให้แผนที่ไปที่ตำแหน่งผู้ใช้โดยตรง
      const newRegion = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      // ป้องกันการ setRegion ซ้ำกัน
      if (isAnimating.current) {
        return;
      }
      const current = regionRef.current;
      if (
        Math.abs(current.latitude - newRegion.latitude) < 0.0001 &&
        Math.abs(current.longitude - newRegion.longitude) < 0.0001 &&
        Math.abs(current.latitudeDelta - newRegion.latitudeDelta) < 0.0001 &&
        Math.abs(current.longitudeDelta - newRegion.longitudeDelta) < 0.0001
      ) {
        return; // ไม่ต้องอัพเดตซ้ำ
      }
      // ป้องกันการ setRegion ถ้าผู้ใช้กำลังโต้ตอบกับแผนที่
      if (isUserInteracting.current) {
        return;
      }

      isAnimating.current = true;
      regionRef.current = newRegion;
      setRegion(newRegion);
    } else {
      // ถ้ายังไม่มี location ให้ขอ permission
      await requestLocationPermission();
      // หลังจากได้ location แล้ว ต้องกดปุ่มอีกครั้ง
    }
  };

  const bottomSheetHeight = bottomSheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BOTTOM_SHEET_MAX_HEIGHT],
  });

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
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search"
              size={20}
              color="#9ca3af"
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="ค้นหา"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSearchResults(text.length > 0);
              }}
              onFocus={() => {
                if (searchQuery.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              returnKeyType="search"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                setShowSearchResults(false);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setShowSearchResults(false);
                  Keyboard.dismiss();
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowSearchResults(false);
            }}
          >
            <Text style={styles.searchButtonText}>ค้นหา</Text>
          </TouchableOpacity>
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && filteredStations.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <ScrollView
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {filteredStations.slice(0, 5).map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={styles.searchResultCard}
                  onPress={() => handleSearchResultPress(station)}
                >
                  <View style={styles.searchResultIconContainer}>
                    <View
                      style={[
                        styles.searchResultMarker,
                        { backgroundColor: getMarkerColor(station.status) },
                      ]}
                    >
                      <Ionicons name="flash" size={16} color="white" />
                    </View>
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName} numberOfLines={1}>
                      {station.name}
                    </Text>
                    <Text style={styles.searchResultAddress} numberOfLines={2}>
                      {station.address}
                    </Text>
                    <View style={styles.searchResultMeta}>
                      <View style={styles.searchResultBadge}>
                        <Text
                          style={[
                            styles.searchResultStatus,
                            { color: getMarkerColor(station.status) },
                          ]}
                        >
                          {station.status === "available"
                            ? "ว่าง"
                            : station.status === "in-use"
                            ? "ใช้งาน"
                            : "ออฟไลน์"}
                        </Text>
                      </View>
                      <Text style={styles.searchResultPower}>
                        {station.power}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {filteredStations.length > 5 && (
                <View style={styles.moreResultsHint}>
                  <Text style={styles.moreResultsText}>
                    และอีก {filteredStations.length - 5} สถานี...
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>กำลังโหลดข้อมูลสถานีชาร์จ...</Text>
          </View>
        ) : filteredStations.length === 0 && searchQuery.length > 0 ? (
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
        ) : (
          <>
            {/* Map View with Clustering */}
            <ClusteredMapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={region}
              showsUserLocation
              showsMyLocationButton={false}
              clusterColor="#10b981"
              clusterTextColor="#ffffff"
              clusterFontFamily="System"
              spiralEnabled={false}
              radius={35}
              extent={256}
              minZoom={0}
              maxZoom={20}
              animationEnabled={false}
              moveOnMarkerPress={false}
              onPress={() => {
                // ซ่อนคีย์บอร์ดก่อนเสมอ
                Keyboard.dismiss();

                // ซ่อน search results
                setShowSearchResults(false);

                // ถ้ามีสถานีที่เลือกอยู่ ให้ซ่อน bottom sheet
                if (selectedStation) {
                  closeBottomSheet();
                }
              }}
              onRegionChangeComplete={(newRegion) => {
                // อัพเดต ref และรีเซ็ต animation flag เฉพาะเมื่อจำเป็น
                if (!isAnimating.current) {
                  regionRef.current = newRegion;
                } else {
                  isAnimating.current = false;
                  regionRef.current = newRegion;
                }
                isUserInteracting.current = false;
              }}
              onRegionChange={(newRegion) => {
                // อัพเดต ref ระหว่างการเคลื่อนไหวเพื่อป้องกันการกระโดด
                if (!isAnimating.current) {
                  regionRef.current = newRegion;
                  isUserInteracting.current = true;
                }
              }}
              onPanDrag={() => {
                isUserInteracting.current = true;
              }}
              renderCluster={(cluster) => {
                const { id, geometry, properties } = cluster;
                const points = properties.point_count;

                const handleClusterPress = () => {
                  // ป้องกันการซูมซ้ำถ้ากำลัง animate อยู่
                  if (isAnimating.current) {
                    return;
                  }

                  const currentDelta = regionRef.current.latitudeDelta;

                  // คำนวณการซูมเป็น step ละหลายๆ ครั้ง
                  let newDelta;
                  if (currentDelta > 5.0) {
                    newDelta = currentDelta * 0.5;
                  } else if (currentDelta > 2.0) {
                    newDelta = currentDelta * 0.6;
                  } else if (currentDelta > 0.5) {
                    newDelta = currentDelta * 0.7;
                  } else if (currentDelta > 0.1) {
                    newDelta = currentDelta * 0.8;
                  } else {
                    newDelta = Math.max(currentDelta * 0.9, 0.02);
                  }

                  const newRegion = {
                    latitude: geometry.coordinates[1],
                    longitude: geometry.coordinates[0],
                    latitudeDelta: newDelta,
                    longitudeDelta: newDelta * 1.5,
                  };

                  // ป้องกันการ setRegion ซ้ำกัน
                  if (isAnimating.current) {
                    return;
                  }

                  // เช็คว่าต่างจากปัจจุบันหรือไม่ (tolerance หลวมขึ้น)
                  const current = regionRef.current;
                  if (
                    Math.abs(current.latitude - newRegion.latitude) < 0.01 &&
                    Math.abs(current.longitude - newRegion.longitude) < 0.01 &&
                    Math.abs(current.latitudeDelta - newRegion.latitudeDelta) <
                      0.01 &&
                    Math.abs(
                      current.longitudeDelta - newRegion.longitudeDelta
                    ) < 0.01
                  ) {
                    return; // ไม่ต้องอัพเดตถ้าค่าใกล้เคียงกัน
                  }

                  // ป้องกันการ setRegion ถ้าผู้ใช้กำลังโต้ตอบกับแผนที่
                  if (isUserInteracting.current) {
                    return;
                  }

                  isAnimating.current = true;
                  // ใช้ setRegion แต่อัพเดต regionRef พร้อมกัน
                  regionRef.current = newRegion;
                  setRegion(newRegion);
                  // ไม่ต้องใช้ setTimeout เพราะ onRegionChangeComplete จะจัดการการรีเซ็ต flag
                };

                return (
                  <Marker
                    key={`cluster-${id}`}
                    coordinate={{
                      longitude: geometry.coordinates[0],
                      latitude: geometry.coordinates[1],
                    }}
                    onPress={handleClusterPress}
                  >
                    <View style={styles.clusterContainer}>
                      <Text style={styles.clusterText}>{points}</Text>
                    </View>
                  </Marker>
                );
              }}
            >
              {filteredStations.map((station) => (
                <Marker
                  key={station.id}
                  coordinate={{
                    latitude: station.latitude,
                    longitude: station.longitude,
                  }}
                  onPress={() => handleMarkerPress(station)}
                >
                  <View
                    style={[
                      styles.markerContainer,
                      {
                        backgroundColor:
                          station.status === "available"
                            ? "#10b981"
                            : station.status === "in-use"
                            ? "#f59e0b"
                            : station.status === "offline"
                            ? "#ef4444"
                            : "#6b7280",
                      },
                    ]}
                  >
                    <Ionicons name="flash" size={20} color="white" />
                  </View>
                </Marker>
              ))}
            </ClusteredMapView>

            {/* My Location Button */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={goToMyLocation}
            >
              <Ionicons name="locate" size={24} color="#10b981" />
            </TouchableOpacity>
          </>
        )}

        {/* Bottom Sheet */}
        {selectedStation && (
          <Animated.View
            style={[styles.bottomSheet, { height: bottomSheetHeight }]}
            {...bottomSheetPanResponder.panHandlers}
          >
            <Pressable
              style={styles.bottomSheetHandle}
              onPress={closeBottomSheet}
              onLongPress={closeBottomSheet}
              hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            >
              <View style={styles.handle} />
            </Pressable>

            <ScrollView
              style={styles.bottomSheetContent}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              removeClippedSubviews={false}
              automaticallyAdjustContentInsets={false}
            >
              <View style={styles.stationHeader}>
                <View style={styles.stationIconContainer}>
                  <Ionicons name="flash" size={24} color="#10b981" />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{selectedStation.name}</Text>
                  <Text style={styles.stationAddress}>
                    {selectedStation.address}
                  </Text>
                </View>
              </View>

              <View style={styles.stationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    เปิด {selectedStation.openTime} -{" "}
                    {selectedStation.closeTime} น.
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ประเภทหัวจ่าย :</Text>
                  <View style={styles.connectorTypes}>
                    {selectedStation.acCount ? (
                      <View style={styles.connectorBadge}>
                        <Ionicons
                          name="flash-outline"
                          size={14}
                          color="#10b981"
                        />
                        <Text style={styles.connectorText}>AC</Text>
                      </View>
                    ) : null}
                    {selectedStation.dcCount ? (
                      <View style={styles.connectorBadge}>
                        <Ionicons name="flash" size={14} color="#10b981" />
                        <Text style={styles.connectorText}>DC</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    กำลังไฟ: {selectedStation.power}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    ราคาต่อหน่วย: {selectedStation.pricePerUnit}
                  </Text>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Ionicons name="navigate" size={20} color="#10b981" />
                    <Text style={styles.statValue}>
                      {getDistanceInfo(selectedStation).distanceText} (
                      {getDistanceInfo(selectedStation).durationText})
                    </Text>
                  </View>
                </View>
              </View>

              {/* เพิ่มข้อมูลเพิ่มเติมเพื่อทดสอบการ scroll */}
              <View style={styles.additionalInfo}>
                <Text style={styles.sectionTitle}>ข้อมูลเพิ่มเติม</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    ระยะทางจากตำแหน่งปัจจุบัน:{" "}
                    {getDistanceInfo(selectedStation).distanceText}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    เวลาโดยประมาณ:{" "}
                    {getDistanceInfo(selectedStation).durationText}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>โทรศัพท์: 02-123-4567</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="globe" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    เว็บไซต์: www.chargingstation.com
                  </Text>
                </View>
              </View>

              <View style={styles.additionalInfo}>
                <Text style={styles.sectionTitle}>บริการเสริม</Text>
                <View style={styles.amenityRow}>
                  <Ionicons name="wifi" size={16} color="#10b981" />
                  <Text style={styles.amenityText}>WiFi ฟรี</Text>
                </View>
                <View style={styles.amenityRow}>
                  <Ionicons name="cafe" size={16} color="#10b981" />
                  <Text style={styles.amenityText}>คาเฟ่</Text>
                </View>
                <View style={styles.amenityRow}>
                  <Ionicons name="car" size={16} color="#10b981" />
                  <Text style={styles.amenityText}>ที่จอดรถ 10 คัน</Text>
                </View>
              </View>

              <View style={styles.additionalInfo}>
                <Text style={styles.sectionTitle}>ข้อมูลสถานี</Text>
                <Text style={styles.descriptionText}>
                  สถานีชาร์จรถยนต์ไฟฟ้าแห่งนี้ตั้งอยู่ในทำเลที่สะดวกสบาย
                  มีอุปกรณ์ชาร์จครบครันทั้งแบบ AC และ DC
                  รองรับรถยนต์ไฟฟ้าทุกรุ่น เปิดให้บริการทุกวัน
                  มีพนักงานคอยดูแลและให้คำแนะนำ พร้อมบริการเสริมต่างๆ
                  เพื่อความสะดวกสบายของผู้ใช้งาน
                </Text>
              </View>

              <TouchableOpacity
                style={styles.navigateButton}
                onPress={navigateToStation}
              >
                <Ionicons name="navigate" size={20} color="white" />
                <Text style={styles.navigateButtonText}>นำทาง</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 8,
    zIndex: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  searchResultsContainer: {
    position: "absolute",
    top: 168, // header (76) + search bar (92)
    left: 16,
    right: 16,
    maxHeight: SCREEN_HEIGHT * 0.5,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  searchResultsList: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  searchResultCard: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  searchResultIconContainer: {
    marginRight: 12,
    justifyContent: "center",
  },
  searchResultMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  searchResultInfo: {
    flex: 1,
    justifyContent: "center",
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
    lineHeight: 18,
  },
  searchResultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
  },
  searchResultStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchResultPower: {
    fontSize: 12,
    color: "#6b7280",
  },
  moreResultsHint: {
    padding: 12,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  moreResultsText: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
  },
  map: {
    flex: 1,
  },
  clusterContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  clusterText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationButton: {
    position: "absolute",
    bottom: BOTTOM_SHEET_MAX_HEIGHT + 20,
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
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomSheetHandle: {
    alignItems: "center",
    paddingVertical: 16, // เพิ่ม padding เพื่อให้กดง่ายขึ้น
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
  },
  bottomSheetContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40, // เพิ่ม padding ด้านล่างเพื่อให้ scroll ง่ายขึ้น
    flexGrow: 1, // ให้ content ขยายเต็มพื้นที่
  },
  stationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  stationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d1fae5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  stationDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  detailLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  connectorTypes: {
    flexDirection: "row",
    marginLeft: 8,
    gap: 8,
  },
  connectorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  connectorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  statsContainer: {
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    color: "#4b5563",
  },
  navigateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  navigateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  additionalInfo: {
    marginBottom: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#4b5563",
    flex: 1,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  amenityText: {
    fontSize: 14,
    color: "#10b981",
  },
  descriptionText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
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
