import React from 'react';
import { View, Text } from 'react-native';

// Mock MapView component for web
const MapView = ({ children, style, ...props }: any) => (
  <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }]}>
    <Text style={{ color: '#666', fontSize: 16 }}>Map view is available in the mobile app</Text>
    {children}
  </View>
);

// Mock Marker component for web
const Marker = ({ title, description, ...props }: any) => null;

// Mock UrlTile component for web
const UrlTile = (props: any) => null;

export { MapView, Marker, UrlTile };
export default MapView;