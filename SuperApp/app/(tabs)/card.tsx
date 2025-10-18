import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CardScreen() {
  const transactions = [
    {
      id: 1,
      type: 'charge',
      title: 'ชาร์จ EV - Central World',
      date: '15 ม.ค. 2024',
      amount: -120.00,
      status: 'completed'
    },
    {
      id: 2,
      type: 'topup',
      title: 'เติมเงินผ่านบัตรเครดิต',
      date: '14 ม.ค. 2024',
      amount: +500.00,
      status: 'completed'
    },
    {
      id: 3,
      type: 'charge',
      title: 'ชาร์จ EV - Siam Paragon',
      date: '12 ม.ค. 2024',
      amount: -85.50,
      status: 'completed'
    },
    {
      id: 4,
      type: 'refund',
      title: 'คืนเงิน - ยกเลิกการชาร์จ',
      date: '10 ม.ค. 2024',
      amount: +45.00,
      status: 'completed'
    }
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'charge': return 'flash';
      case 'topup': return 'add-circle';
      case 'refund': return 'return-up-back';
      default: return 'card';
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? '#10B981' : '#EF4444';
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-[#1F2937]">บัตรและกระเป๋าเงิน</Text>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
            <Ionicons name="add-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6">
          {/* Balance Card */}
          <View className="mb-6">
            <LinearGradient
              colors={['#1F274B', '#5EC1A0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-xl p-6"
            >
              <View className="mb-4">
                <Text className="text-white/80 text-sm">ยอดเงินคงเหลือ</Text>
                <Text className="text-white text-3xl font-bold mt-1">฿ 1,250.00</Text>
              </View>
              
              <View className="flex-row justify-between">
                <TouchableOpacity className="bg-white/20 rounded-lg px-6 py-3 flex-1 mr-2">
                  <Text className="text-white font-semibold text-center">เติมเงิน</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-white/20 rounded-lg px-6 py-3 flex-1 ml-2">
                  <Text className="text-white font-semibold text-center">โอนเงิน</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">การดำเนินการ</Text>
            <View className="flex-row justify-between">
              {[
                { icon: 'card-outline', title: 'จัดการบัตร', color: '#3B82F6' },
                { icon: 'receipt-outline', title: 'ประวัติ', color: '#10B981' },
                { icon: 'gift-outline', title: 'โปรโมชั่น', color: '#F59E0B' },
                { icon: 'settings-outline', title: 'ตั้งค่า', color: '#6B7280' },
              ].map((action, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-white rounded-xl p-4 items-center shadow-sm"
                  style={{ width: '22%' }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Ionicons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text className="text-xs font-medium text-[#1F2937] text-center">
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Methods */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">วิธีการชำระเงิน</Text>
            
            {/* Credit Card */}
            <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="card" size={24} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">บัตรเครดิต</Text>
                    <Text className="text-sm text-[#6B7280]">**** **** **** 1234</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  <Text className="text-sm text-[#6B7280]">หลัก</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Bank Account */}
            <TouchableOpacity className="bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-green-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="business" size={24} color="#10B981" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">บัญชีธนาคาร</Text>
                    <Text className="text-sm text-[#6B7280]">ธนาคารกสิกรไทย</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-[#1F2937]">ธุรกรรมล่าสุด</Text>
              <TouchableOpacity>
                <Text className="text-sm text-[#51BC8E] font-medium">ดูทั้งหมด</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-xl shadow-sm">
              {transactions.map((transaction, index) => (
                <TouchableOpacity
                  key={transaction.id}
                  className={`p-4 ${index !== transactions.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                        <Ionicons
                          name={getTransactionIcon(transaction.type) as any}
                          size={20}
                          color="#6B7280"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium text-[#1F2937]">
                          {transaction.title}
                        </Text>
                        <Text className="text-sm text-[#6B7280]">
                          {transaction.date}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="font-semibold"
                      style={{ color: getTransactionColor(transaction.amount) }}
                    >
                      {transaction.amount > 0 ? '+' : ''}฿ {Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Add some bottom padding for the tab bar */}
          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}