import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import ClusteredMapView from "react-native-map-clustering";
import { Marker, Region } from "react-native-maps";
import { ChargingStation } from "../../../../types/charging.types";
import ChargingStationService from "../ChargingStationService";
import StationMarker from "./StationMarker";

const BOTTOM_SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.6;

interface ChargingMapViewProps {
  stations: ChargingStation[];
  initialRegion: Region;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  onStationPress: (station: ChargingStation) => void;
  onMapPress: () => void;
  showUserLocation?: boolean;
  onMyLocationPress?: () => void;
  focusStation?: ChargingStation | null;
}

export default function ChargingMapView({
  stations,
  initialRegion,
  onRegionChange,
  onRegionChangeComplete,
  onStationPress,
  onMapPress,
  showUserLocation = true,
  onMyLocationPress,
  focusStation,
}: ChargingMapViewProps) {
  const mapRef = useRef<ClusteredMapView>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);
  const service = ChargingStationService.getInstance();

  const handleClusterPress = useCallback((cluster: any) => {
    if (isAnimating || isUserInteracting) {
      return;
    }

    const { geometry } = cluster;
    const currentDelta = currentRegion.latitudeDelta;

    // Calculate zoom level based on current delta
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

    setIsAnimating(true);
    onRegionChangeComplete && onRegionChangeComplete(newRegion);

    // Reset animation flag after a delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  }, [isAnimating, isUserInteracting, currentRegion, onRegionChangeComplete]);

  const handleRegionChange = useCallback((newRegion: Region) => {
    if (!isAnimating) {
      setIsUserInteracting(true);
    }
    setCurrentRegion(newRegion);
    onRegionChange && onRegionChange(newRegion);
  }, [isAnimating, onRegionChange]);

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setIsAnimating(false);
    setIsUserInteracting(false);
    setCurrentRegion(newRegion);
    onRegionChangeComplete && onRegionChangeComplete(newRegion);
  }, [onRegionChangeComplete]);

  useEffect(() => {
    if (focusStation && mapRef.current) {
      const coords = [{ latitude: focusStation.latitude, longitude: focusStation.longitude }];
      const padding = {
        top: 40,
        right: 40,
        bottom: BOTTOM_SHEET_MAX_HEIGHT + 60,
        left: 40,
      };
      try {
        // @ts-ignore fitToCoordinates exists on underlying MapView
        mapRef.current.fitToCoordinates(coords, { edgePadding: padding, animated: true });
      } catch {}
    }
  }, [focusStation]);

  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, properties } = cluster;
    const points = properties.point_count;

    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          longitude: geometry.coordinates[0],
          latitude: geometry.coordinates[1],
        }}
        onPress={() => handleClusterPress(cluster)}
      >
        <View style={styles.clusterContainer}>
          <Text style={styles.clusterText}>{points}</Text>
        </View>
      </Marker>
    );
  }, [handleClusterPress]);

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        initialRegion={initialRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        clusterColor="#10b981"
        clusterTextColor="#ffffff"
        clusterFontFamily="System"
        spiralEnabled={false}
        radius={35}
        extent={256}
        minZoom={0}
        maxZoom={20}
        animationEnabled={true}
        moveOnMarkerPress={false}
        onPress={onMapPress}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={() => {
          setIsUserInteracting(true);
        }}
        renderCluster={renderCluster}
      >
        {stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            onPress={onStationPress}
            service={service}
          />
        ))}
      </ClusteredMapView>

      {onMyLocationPress && <MyLocationButton onPress={onMyLocationPress} />}
    </View>
  );
}

interface MyLocationButtonProps {
  onPress: () => void;
}

function MyLocationButton({ onPress }: MyLocationButtonProps) {
  const handlePress = () => {
    console.log('MyLocationButton pressed');
    onPress();
  };

  return (
    <TouchableOpacity style={styles.locationButton} onPress={handlePress}>
      <Ionicons name="locate" size={24} color="#10b981" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    zIndex: 1000,
  },
});