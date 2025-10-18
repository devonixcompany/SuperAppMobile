import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChargingScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const chargingStations = [
    {
      id: 1,
      name: 'Central World',
      address: 'ชั้น B1 ห้างเซ็นทรัลเวิลด์',
      distance: '0.5 กม.',
      available: 3,
      total: 8,
      price: '12 บาท/หน่วย',
      status: 'available'
    },
    {
      id: 2,
      name: 'Siam Paragon',
      address: 'ชั้น B2 ห้างสยามพารากอน',
      distance: '0.8 กม.',
      available: 1,
      total: 6,
      price: '15 บาท/หน่วย',
      status: 'limited'
    },
    {
      id: 3,
      name: 'MBK Center',
      address: 'ชั้น B1 ห้าง MBK',
      distance: '1.2 กม.',
      available: 0,
      total: 4,
      price: '10 บาท/หน่วย',
      status: 'full'
    },
    {
      id: 4,
      name: 'Terminal 21',
      address: 'ชั้น B1 ห้าง Terminal 21',
      distance: '1.5 กม.',
      available: 5,
      total: 10,
      price: '13 บาท/หน่วย',
      status: 'available'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'limited': return '#F59E0B';
      case 'full': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'ว่าง';
      case 'limited': return 'เหลือน้อย';
      case 'full': return 'เต็ม';
      default: return 'ไม่ทราบ';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-[#1F2937]">เครื่องชาร์จ EV</Text>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
            <Ionicons name="map-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-sm mb-4">
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-base text-[#1F2937]"
            placeholder="ค้นหาสถานีชาร์จ..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row space-x-3">
            {['ทั้งหมด', 'ใกล้ฉัน', 'ว่าง', 'ราคาถูก'].map((filter, index) => (
              <TouchableOpacity
                key={index}
                className={`px-4 py-2 rounded-full ${
                  index === 0 ? 'bg-[#51BC8E]' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    index === 0 ? 'text-white' : 'text-[#6B7280]'
                  }`}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Charging Stations List */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {chargingStations.map((station) => (
          <TouchableOpacity
            key={station.id}
            className="bg-white rounded-xl p-4 mb-4 shadow-sm"
          >
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-[#1F2937] mb-1">
                  {station.name}
                </Text>
                <Text className="text-sm text-[#6B7280] mb-2">
                  {station.address}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text className="text-sm text-[#6B7280] ml-1">
                    {station.distance}
                  </Text>
                </View>
              </View>
              
              <View className="items-end">
                <View
                  className="px-3 py-1 rounded-full mb-2"
                  style={{ backgroundColor: `${getStatusColor(station.status)}20` }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: getStatusColor(station.status) }}
                  >
                    {getStatusText(station.status)}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-[#1F2937]">
                  {station.price}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="flash" size={16} color="#51BC8E" />
                <Text className="text-sm text-[#6B7280] ml-1">
                  ว่าง {station.available}/{station.total} หัวชาร์จ
                </Text>
              </View>
              
              <TouchableOpacity className="bg-[#51BC8E] px-4 py-2 rounded-lg">
                <Text className="text-white text-sm font-medium">นำทาง</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Add some bottom padding for the tab bar */}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}