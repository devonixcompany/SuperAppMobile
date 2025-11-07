import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentService } from "@/services/api/payment.service";
import { createCardToken } from "@/services/omise";

export default function AddPaymentMethodScreen() {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Format card number with spaces
  const formatCardNumber = (text: string) => {
    // ลบอักขระที่ไม่ใช่ตัวเลขทั้งหมด (รวมช่องว่างเก่า)
    const cleaned = text.replace(/\D/g, '');

    // จำกัดแค่ 16 หลัก
    const limited = cleaned.substring(0, 16);

    // เพิ่มช่องว่างทุก 4 ตัว
    const formatted = limited.match(/.{1,4}/g)?.join(' ') || limited;

    return formatted;
  };

  // Format expiry date
  const formatExpiry = (text: string, isMonth: boolean) => {
    const cleaned = text.replace(/\D/g, '');
    if (isMonth) {
      return cleaned.substring(0, 2);
    }
    return cleaned.substring(0, 4);
  };

  // Validate form
  const isFormValid = () => {
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    return (
      cleanCardNumber.length >= 13 &&
      expiryMonth.length === 2 &&
      expiryYear.length === 4 &&
      cvv.length >= 3 &&
      cardholderName.trim().length > 0
    );
  };

  // Add payment method
  const handleAddPaymentMethod = async () => {
    if (!isFormValid()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      // Clean card number - remove all non-digits
      const cleanCardNumber = cardNumber.replace(/\D/g, '');
      const month = Number.parseInt(expiryMonth, 10);
      const year = Number.parseInt(expiryYear, 10);

      console.log('Card validation:', {
        original: cardNumber,
        cleaned: cleanCardNumber,
        length: cleanCardNumber.length,
        isNumeric: /^\d+$/.test(cleanCardNumber),
        month,
        year,
        cvvLength: cvv.length
      });

      // Validate card number
      if (!cleanCardNumber || cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        Alert.alert('ข้อผิดพลาด', 'หมายเลขบัตรต้องมี 13-19 หลัก');
        setLoading(false);
        return;
      }

      if (!/^\d+$/.test(cleanCardNumber)) {
        Alert.alert('ข้อผิดพลาด', 'หมายเลขบัตรต้องเป็นตัวเลขเท่านั้น');
        setLoading(false);
        return;
      }

      if (!Number.isFinite(month) || month < 1 || month > 12) {
        Alert.alert('ข้อผิดพลาด', 'เดือนหมดอายุต้องอยู่ระหว่าง 01 ถึง 12');
        setLoading(false);
        return;
      }

      if (!Number.isFinite(year) || expiryYear.length !== 4) {
        Alert.alert('ข้อผิดพลาด', 'กรุณากรอกปีหมดอายุเป็นตัวเลข 4 หลัก');
        setLoading(false);
        return;
      }

      if (cvv.length < 3 || cvv.length > 4) {
        Alert.alert('ข้อผิดพลาด', 'CVV ต้องมี 3-4 หลัก');
        setLoading(false);
        return;
      }

      console.log('Creating Omise token with:', {
        number: cleanCardNumber,
        expirationMonth: month,
        expirationYear: year,
        securityCode: cvv,
        name: cardholderName.trim()
      });

      const token = await createCardToken({
        number: cleanCardNumber,
        expirationMonth: month,
        expirationYear: year,
        securityCode: cvv,
        name: cardholderName.trim(),
      });

      const response = await paymentService.addPaymentCard({
        token: token.id,
        setDefault: isDefault,
      });

      if (response.success) {
        Alert.alert('สำเร็จ', 'เพิ่มวิธีการชำระเงินเรียบร้อยแล้ว', [
          { text: 'ตกลง', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      const message =
        error?.message ??
        error?.response?.data?.message ??
        'ไม่สามารถเพิ่มวิธีการชำระเงินได้';
      Alert.alert('ข้อผิดพลาด', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-[#1F2937]">
            เพิ่มบัตรเครดิต
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6">
          {/* Card Preview */}
          <View className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6">
            <View className="flex-row justify-between items-start mb-8">
              <View>
                <Text className="text-white/80 text-sm">บัตรเครดิต</Text>
              </View>
              <Ionicons name="card" size={32} color="rgba(255,255,255,0.8)" />
            </View>
            
            <Text className="text-white text-xl font-mono mb-4 tracking-wider">
              {cardNumber || '**** **** **** ****'}
            </Text>
            
            <View className="flex-row justify-between">
              <View>
                <Text className="text-white/80 text-xs">ชื่อผู้ถือบัตร</Text>
                <Text className="text-white font-semibold">
                  {cardholderName || 'YOUR NAME'}
                </Text>
              </View>
              <View>
                <Text className="text-white/80 text-xs">วันหมดอายุ</Text>
                <Text className="text-white font-semibold">
                  {expiryMonth && expiryYear ? `${expiryMonth}/${expiryYear.slice(-2)}` : 'MM/YY'}
                </Text>
              </View>
            </View>
          </View>

          {/* Form */}
          <View className="space-y-4">
            {/* Card Number */}
            <View>
              <Text className="text-sm font-medium text-[#1F2937] mb-2">
                หมายเลขบัตร
              </Text>
              <TextInput
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                className="bg-white rounded-lg px-4 py-3 text-[#1F2937] shadow-sm"
                maxLength={19}
              />
            </View>

            {/* Expiry and CVV */}
            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-[#1F2937] mb-2">
                  เดือนหมดอายุ
                </Text>
                <TextInput
                  value={expiryMonth}
                  onChangeText={(text) => setExpiryMonth(formatExpiry(text, true))}
                  placeholder="MM"
                  keyboardType="numeric"
                  className="bg-white rounded-lg px-4 py-3 text-[#1F2937] shadow-sm"
                  maxLength={2}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-[#1F2937] mb-2">
                  ปีหมดอายุ
                </Text>
                <TextInput
                  value={expiryYear}
                  onChangeText={(text) => setExpiryYear(formatExpiry(text, false))}
                  placeholder="YYYY"
                  keyboardType="numeric"
                  className="bg-white rounded-lg px-4 py-3 text-[#1F2937] shadow-sm"
                  maxLength={4}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-[#1F2937] mb-2">
                  CVV
                </Text>
                <TextInput
                  value={cvv}
                  onChangeText={(text) => setCvv(text.replace(/\D/g, ''))}
                  placeholder="123"
                  keyboardType="numeric"
                  secureTextEntry
                  className="bg-white rounded-lg px-4 py-3 text-[#1F2937] shadow-sm"
                  maxLength={4}
                />
              </View>
            </View>

            {/* Cardholder Name */}
            <View>
              <Text className="text-sm font-medium text-[#1F2937] mb-2">
                ชื่อผู้ถือบัตร
              </Text>
              <TextInput
                value={cardholderName}
                onChangeText={setCardholderName}
                placeholder="ชื่อตามที่ปรากฏบนบัตร"
                className="bg-white rounded-lg px-4 py-3 text-[#1F2937] shadow-sm"
                autoCapitalize="characters"
              />
            </View>

            {/* Set as Default */}
            <TouchableOpacity
              onPress={() => setIsDefault(!isDefault)}
              className="flex-row items-center py-4"
            >
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                  isDefault ? 'bg-[#51BC8E] border-[#51BC8E]' : 'border-gray-300'
                }`}
              >
                {isDefault && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text className="text-[#1F2937] font-medium">
                ตั้งเป็นวิธีการชำระเงินหลัก
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            onPress={handleAddPaymentMethod}
            disabled={!isFormValid() || loading}
            className={`rounded-lg py-4 mt-8 ${
              isFormValid() && !loading
                ? 'bg-[#51BC8E]'
                : 'bg-gray-300'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-center text-lg">
                เพิ่มบัตรเครดิต
              </Text>
            )}
          </TouchableOpacity>

          {/* Security Notice */}
          <View className="bg-blue-50 rounded-lg p-4 mt-6">
            <View className="flex-row items-start">
              <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-blue-900 mb-1">
                  ความปลอดภัย
                </Text>
                <Text className="text-sm text-blue-700">
                  ข้อมูลบัตรของคุณจะถูกเข้ารหัสและจัดเก็บอย่างปลอดภัย
                  เราไม่เก็บข้อมูลบัตรในระบบของเรา
                </Text>
              </View>
            </View>
          </View>

          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
