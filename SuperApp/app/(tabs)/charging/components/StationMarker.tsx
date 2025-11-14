import { Ionicons } from "@expo/vector-icons";
import { Marker } from "react-native-maps";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ChargingStation } from "../../../../types/charging.types";
import ChargingStationService from "../ChargingStationService";

interface StationMarkerProps {
  station: ChargingStation;
  onPress: (station: ChargingStation) => void;
  service: ChargingStationService;
}

export default function StationMarker({ station, onPress, service }: StationMarkerProps) {
  return (
    <Marker
      key={station.id}
      coordinate={{
        latitude: station.latitude,
        longitude: station.longitude,
      }}
      onPress={() => onPress(station)}
    >
      <View
        style={[
          styles.markerContainer,
          { backgroundColor: service.getStationColor(station) },
        ]}
      >
        <Ionicons name="flash" size={20} color="white" />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
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
});