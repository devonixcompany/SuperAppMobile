import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MapView, Marker, UrlTile } from '../../../components/maps/MapComponents';

// Define types for the components we'll use
interface ChargingStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  available: boolean;
  power: string;
  type: string;
}

const chargingStations: ChargingStation[] = [
  {
    id: '1',
    name: 'Tesla Supercharger',
    address: '123 Main St, City',
    latitude: 37.7749,
    longitude: -122.4194,
    available: true,
    power: '150kW',
    type: 'DC Fast'
  },
  {
    id: '2',
    name: 'ChargePoint Station',
    address: '456 Oak Ave, City',
    latitude: 37.7849,
    longitude: -122.4094,
    available: false,
    power: '50kW',
    type: 'DC Fast'
  },
  {
    id: '3',
    name: 'EVgo Charging',
    address: '789 Pine St, City',
    latitude: 37.7649,
    longitude: -122.4294,
    available: true,
    power: '100kW',
    type: 'DC Fast'
  }
];

export default function ChargingScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const filteredStations = chargingStations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStationPress = (station: ChargingStation) => {
    if (station.available) {
      Alert.alert(
        'Start Charging',
        `Would you like to start charging at ${station.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start', onPress: () => console.log('Starting charge at', station.name) }
        ]
      );
    } else {
      Alert.alert('Station Unavailable', 'This charging station is currently occupied.');
    }
  };

  const renderMapView = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webMapPlaceholder}>
          <Ionicons name="map-outline" size={48} color="#666" />
          <Text style={styles.webMapText}>
            Map view is available in the Expo Go app or installed mobile app
          </Text>
        </View>
      );
    }

    return (
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {filteredStations.map((station) => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: station.latitude,
              longitude: station.longitude,
            }}
            title={station.name}
            description={`${station.power} - ${station.available ? 'Available' : 'Occupied'}`}
            pinColor={station.available ? 'green' : 'red'}
          />
        ))}
      </MapView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Charging Stations</Text>
        <TouchableOpacity
          style={styles.mapToggle}
          onPress={() => setShowMap(!showMap)}
        >
          <Ionicons 
            name={showMap ? "list" : "map"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search charging stations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {showMap ? (
        <View style={styles.mapContainer}>
          {renderMapView()}
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {filteredStations.map((station) => (
            <TouchableOpacity
              key={station.id}
              style={[
                styles.stationCard,
                { backgroundColor: station.available ? '#f0f9ff' : '#fef2f2' }
              ]}
              onPress={() => handleStationPress(station)}
            >
              <View style={styles.stationHeader}>
                <Text style={styles.stationName}>{station.name}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: station.available ? '#10b981' : '#ef4444' }
                ]}>
                  <Text style={styles.statusText}>
                    {station.available ? 'Available' : 'Occupied'}
                  </Text>
                </View>
              </View>
              <Text style={styles.stationAddress}>{station.address}</Text>
              <View style={styles.stationDetails}>
                <Text style={styles.stationPower}>{station.power}</Text>
                <Text style={styles.stationType}>{station.type}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  mapToggle: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 40,
  },
  webMapText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stationCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  stationAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  stationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stationPower: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  stationType: {
    fontSize: 14,
    color: '#6b7280',
  },
});