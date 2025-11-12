# Charging Tab - Refactored Architecture

This document describes the refactored architecture of the charging tab for the electric vehicle charging station map application.

## Overview

The charging tab has been refactored to improve code organization, maintainability, and reusability. The code is now modular with clear separation of concerns between UI components, business logic, and data services.

## File Structure

```
app/(tabs)/charging/
├── index.tsx                    # Main screen component
├── ChargingMapScreen.tsx        # Alternative full-screen component
├── ChargingStationService.ts    # Business logic and data service
├── components/                  # UI Components
│   ├── SearchBar.tsx           # Search input component
│   ├── SearchResults.tsx       # Search results dropdown
│   ├── StationMarker.tsx       # Map marker component
│   ├── StationBottomSheet.tsx  # Station details bottom sheet
│   └── ChargingMapView.tsx     # Main map view component
└── ARCHITECTURE.md             # This documentation
```

## Architecture Components

### 1. Main Screen (`index.tsx`)

**Responsibilities:**
- State management for search, selected station, and user location
- Coordinate between different components
- Handle user permissions and location services
- Manage animation states for bottom sheet

**Key Features:**
- Clean separation of concerns with callback-based event handling
- Optimized with React hooks (useCallback, useEffect, useRef)
- Proper state management for location and map interactions

### 2. ChargingStationService (`ChargingStationService.ts`)

**Responsibilities:**
- Centralized business logic for charging station operations
- Distance calculations and formatting utilities
- Station search and filtering
- Mock API data management (easily replaceable with real API)

**Key Features:**
- Singleton pattern for consistent data access
- Utility methods for distance/time calculations
- Station filtering by multiple criteria
- Thai language support for status texts

**Key Methods:**
```typescript
// Data loading
loadChargingStations(): Promise<ChargingStation[]>

// Search and filtering
searchStations(query: string): ChargingStation[]
getStationsByStatus(status: ChargingStation['status']): ChargingStation[]
getNearbyStations(lat: number, lng: number, radiusKm: number): ChargingStation[]

// Distance calculations
getDistanceInfo(userLat: number, userLng: number, station: ChargingStation): DistanceInfo
formatDistanceText(distanceKm: number): string
formatDurationText(durationMinutes: number): string

// Utilities
getMarkerColor(status: ChargingStation['status']): string
getStatusText(status: ChargingStation['status']): string
```

### 3. UI Components

#### SearchBar (`components/SearchBar.tsx`)
- Reusable search input with clear button
- Handles keyboard interactions
- Consistent styling with the app theme

#### SearchResults (`components/SearchResults.tsx`)
- Dropdown results display
- Station status indicators
- Limited to 5 results with "more results" hint
- Keyboard-friendly navigation

#### StationMarker (`components/StationMarker.tsx`)
- Individual map marker component
- Color-coded by station status
- Touch interaction handling

#### StationBottomSheet (`components/StationBottomSheet.tsx`)
- Animated bottom sheet for station details
- Pan gesture support for dismissal
- Comprehensive station information display
- Navigation button integration

#### ChargingMapView (`components/ChargingMapView.tsx`)
- Main map component with clustering
- Region change handling
- User location display
- Integrated location button

## Data Flow

```
User Action → Main Screen → Service → Component Updates
    ↓
State Change → UI Re-render → User Feedback
```

1. **Initial Load:**
   - Request location permissions
   - Load charging stations from service
   - Initialize map with user location or default position

2. **Search Flow:**
   - User types in SearchBar
   - Search query passed to service
   - Filtered results displayed in SearchResults
   - Selecting result focuses map on station

3. **Map Interaction:**
   - User interacts with map markers
   - Station details shown in bottom sheet
   - Navigation option available via Google Maps

4. **Location Services:**
   - User location tracked and displayed
   - Distance calculations to all stations
   - "My Location" button for quick positioning

## Key Improvements

### 1. Modular Architecture
- Separated UI components from business logic
- Reusable components across different screens
- Clear interfaces and prop contracts

### 2. Performance Optimizations
- React.memo and useCallback for optimal re-renders
- Efficient search and filtering algorithms
- Lazy loading of map data

### 3. Maintainability
- Single responsibility principle
- Consistent coding patterns
- TypeScript interfaces for type safety

### 4. Extensibility
- Service layer easily replaceable with real API
- Components designed for reusability
- Configuration-driven styling

## Usage Examples

### Basic Usage
```typescript
import ChargingScreen from './charging';

// In your tab navigator
<Tabs.Screen
  name="charging"
  component={ChargingScreen}
  options={{
    title: 'สถานีชาร์จ',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="flash" size={size} color={color} />
    ),
  }}
/>
```

### Custom Service Integration
```typescript
// Replace mock data with real API
class RealChargingStationService extends ChargingStationService {
  async loadChargingStations(): Promise<ChargingStation[]> {
    const response = await fetch('/api/charging-stations');
    return response.json();
  }
}
```

## Future Enhancements

1. **Real API Integration**
   - Replace mock data with REST API calls
   - Add caching and offline support
   - Implement real-time station status updates

2. **Advanced Features**
   - Station filtering by connector type
   - Route planning with multiple stops
   - User favorites and recent stations
   - Station rating and review system

3. **Performance Improvements**
   - Virtualized lists for large datasets
   - Progressive loading of map markers
   - Image optimization for station photos

## Troubleshooting

### Common Issues

1. **Map Not Loading**
   - Check Google Maps API configuration
   - Verify location permissions
   - Ensure proper provider setup

2. **Location Permission Denied**
   - Handle permission states gracefully
   - Provide clear user guidance
   - Offer manual location input option

## Dependencies

- `react-native-maps` - Map display and interactions
- `react-native-map-clustering` - Marker clustering
- `expo-location` - Location services
- `expo-linking` - External app integration
- `@expo/vector-icons` - Icon components