import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChargingStation } from "../../../../types/charging.types";
import ChargingStationService from "../ChargingStationService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SearchResultsProps {
  stations: ChargingStation[];
  onStationPress: (station: ChargingStation) => void;
  totalResults: number;
}

export default function SearchResults({
  stations,
  onStationPress,
  totalResults,
}: SearchResultsProps) {
  const service = ChargingStationService.getInstance();

  if (stations.length === 0) {
    return null;
  }

  return (
    <View style={styles.searchResultsContainer}>
      <ScrollView
        style={styles.searchResultsList}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {stations.slice(0, 5).map((station) => (
          <SearchResultItem
            key={station.id}
            station={station}
            onPress={() => onStationPress(station)}
            service={service}
          />
        ))}
        {totalResults > 5 && (
          <View style={styles.moreResultsHint}>
            <Text style={styles.moreResultsText}>
              และอีก {totalResults - 5} สถานี...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface SearchResultItemProps {
  station: ChargingStation;
  onPress: () => void;
  service: ChargingStationService;
}

function SearchResultItem({ station, onPress, service }: SearchResultItemProps) {
  return (
    <TouchableOpacity style={styles.searchResultCard} onPress={onPress}>
      <View style={styles.searchResultIconContainer}>
        <View
          style={[
            styles.searchResultMarker,
            { backgroundColor: service.getMarkerColor(station.status) },
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
                { color: service.getMarkerColor(station.status) },
              ]}
            >
              {service.getStatusText(station.status)}
            </Text>
          </View>
          <Text style={styles.searchResultPower}>{station.power}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});