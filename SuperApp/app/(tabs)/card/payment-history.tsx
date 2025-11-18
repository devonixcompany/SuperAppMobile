import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentService, type PaymentHistory } from "@/services/api/payment.service";
import { TABS_HORIZONTAL_GUTTER } from "../_layout";

export default function PaymentHistoryScreen() {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load payment history
  const loadPaymentHistory = async () => {
    try {
      const response = await paymentService.getPaymentHistory();
      if (response.success && response.data) {
        setPaymentHistory(response.data);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดประวัติการชำระเงินได้');
    } finally {
      setLoading(false);
    }
  };

  // Refresh payment history
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentHistory();
    setRefreshing(false);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'successful':
        return 'สำเร็จ';
      case 'pending':
        return 'รอดำเนินการ';
      case 'failed':
        return 'ล้มเหลว';
      default:
        return 'ไม่ทราบสถานะ';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format amount
  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'THB' ? '฿' : currency;
    return `${symbol} ${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color="#51BC8E" />
        <Text className="text-[#6B7280] mt-4">กำลังโหลด...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#F8FAFC]"
      style={{ paddingHorizontal: TABS_HORIZONTAL_GUTTER }}
    >
      {/* Header */}
      <View className="pt-4 pb-2">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-[#1F2937]">
            ประวัติการชำระเงิน
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View>
          {paymentHistory.length === 0 ? (
            // Empty state
            <View className="items-center justify-center py-20">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-[#1F2937] mb-2">
                ยังไม่มีประวัติการชำระเงิน
              </Text>
              <Text className="text-[#6B7280] text-center">
                เมื่อคุณชำระเงินแล้ว ประวัติจะแสดงที่นี่
              </Text>
            </View>
          ) : (
            // Payment history list
            <View className="space-y-3">
              {paymentHistory.map((payment) => (
                <TouchableOpacity
                  key={payment.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      {/* Payment description */}
                      <Text className="font-semibold text-[#1F2937] mb-1">
                        {payment.description || 'การชำระเงิน'}
                      </Text>
                      
                      {/* Transaction ID if available */}
                      {payment.transaction_id && (
                        <Text className="text-sm text-[#6B7280] mb-1">
                          รหัสธุรกรรม: {payment.transaction_id}
                        </Text>
                      )}
                      
                      {/* Payment method */}
                      <Text className="text-sm text-[#6B7280] mb-2">
                        {payment.payment_method.type === 'card' 
                          ? `บัตรเครดิต **** ${payment.payment_method.last_digits}`
                          : payment.payment_method.name || 'บัญชีธนาคาร'
                        }
                      </Text>
                      
                      {/* Date */}
                      <Text className="text-xs text-[#9CA3AF]">
                        {formatDate(payment.created_at)}
                      </Text>
                    </View>

                    <View className="items-end">
                      {/* Amount */}
                      <Text className="font-semibold text-[#1F2937] mb-2">
                        {formatAmount(payment.amount, payment.currency)}
                      </Text>
                      
                      {/* Status */}
                      <View
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${getStatusColor(payment.status)}20` }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: getStatusColor(payment.status) }}
                        >
                          {getStatusText(payment.status)}
                        </Text>
                      </View>
                      
                      {/* Failure message if failed */}
                      {payment.status === 'failed' && payment.failure_message && (
                        <Text className="text-xs text-red-500 mt-1 text-right">
                          {payment.failure_message}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Add space at bottom */}
          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
