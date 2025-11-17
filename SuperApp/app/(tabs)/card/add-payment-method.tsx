import env from "@/config/env";
import { paymentService } from "@/services/api/payment.service";
import { createCardToken } from "@/services/omise";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { TABS_HORIZONTAL_GUTTER } from "../_layout";

export default function AddPaymentMethodScreen() {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const canUseOmiseUI = !!env.omisePublicKey;
  const [omiseLoading, setOmiseLoading] = useState(false);
  const [omiseStatus, setOmiseStatus] = useState<string>('');
  const pushStatus = (msg: string) => setOmiseStatus(prev => (prev ? `${prev} \u2022 ${msg}` : msg));

  const omiseHtml = useMemo(() => {
    const pk = env.omisePublicKey || '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.omise.co/omise.js"></script>
<style>body{font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding:16px; background:#F8FAFC} button{padding:12px 16px;border-radius:12px;background:#51BC8E;color:#fff;border:none;font-size:16px;font-weight:600} .hint{margin-top:12px;color:#6B7280;font-size:13px}</style>
</head><body>
<button id="open" style="display:none">Open</button>
<script>
  var OmiseCard = window.OmiseCard;
  try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'init' })); } catch(e) {}
  OmiseCard.configure({ publicKey: '${pk}', defaultPaymentMethod: 'credit_card', submitLabel: 'เพิ่มบัตร', frameLabel: 'SuperApp' });
  try {
    OmiseCard.configureButton('#open', {
      amount: 0,
      currency: 'THB',
      defaultPaymentMethod: 'credit_card',
      submitLabel: 'เพิ่มบัตร',
      frameLabel: 'SuperApp',
       onCreateTokenSuccess: function(token){
        try {
          var id = null;
          if (typeof token === 'string') {
            id = token;
          } else if (token && typeof token === 'object' && token.id) {
            id = token.id;
          }
          if (id) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', id: id }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Omise ไม่ส่ง token id กลับมา' }));
          }
        } catch(e) {}
       },
      onFormClosed: function(){
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'closed' })); } catch(e) {}
      }
    });
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'configureButton_ok' })); } catch(e) {}
  } catch(e) { try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'configureButton_error' })); } catch(_) {} }
  try { OmiseCard.attach(); try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'attach_ok' })); } catch(_) {} } catch(e) { try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'attach_error' })); } catch(_) {} }
  function openForm(){
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'open_request' })); } catch(e) {}
    OmiseCard.open({
      amount: 0,
      currency: 'THB',
      defaultPaymentMethod: 'credit_card',
       onCreateTokenSuccess: function(token){
        try {
          var id = null;
          if (typeof token === 'string') {
            id = token;
          } else if (token && typeof token === 'object' && token.id) {
            id = token.id;
          }
          if (id) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', id: id }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Omise ไม่ส่ง token id กลับมา' }));
          }
        } catch(e) {}
       },
      onCreateTokenFailure: function(error){
        var msg = (error && (error.message || error.code)) || 'เกิดข้อผิดพลาด';
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: msg })); } catch(e) {}
      },
      onFormClosed: function(){
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'closed' })); } catch(e) {}
      }
    });
  }
  function autoOpen(){
    try {
      var btn = document.getElementById('open');
      if (btn) {
        btn.click();
      }
      openForm();
    } catch(e) {}
  }
  if (document.readyState === 'complete') {
    setTimeout(autoOpen, 250);
  } else {
    window.addEventListener('load', function(){ setTimeout(autoOpen, 250); });
  }
</script>
</body></html>`;
  }, []);

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

  const handleOmiseMessage = async (event: any) => {
    try {
      const data = JSON.parse(event?.nativeEvent?.data ?? '{}');
      console.log('Omise WebView message:', data);
      if (data?.type === 'debug' && data?.message) {
        pushStatus(String(data.message));
        return;
      }
      if (data?.type === 'token' && data?.id) {
        setOmiseLoading(true);
        try {
          const response = await paymentService.addPaymentCard({ token: data.id, setDefault: isDefault });
          if (response.success) {
            Alert.alert('สำเร็จ', 'เพิ่มวิธีการชำระเงินเรียบร้อยแล้ว', [
              { text: 'ตกลง', onPress: () => router.back() }
            ]);
          } else {
            Alert.alert('ข้อผิดพลาด', response.message || 'ไม่สามารถเพิ่มบัตรได้');
          }
        } catch (e: any) {
          const msg = e?.status === 401 ? 'กรุณาเข้าสู่ระบบก่อนเพิ่มบัตร' : (e?.message || 'ไม่สามารถเพิ่มบัตรได้');
          Alert.alert('ข้อผิดพลาด', msg);
        } finally {
          setOmiseLoading(false);
        }
      } else if (data?.type === 'error') {
        Alert.alert('ข้อผิดพลาด', data?.message || 'ไม่สามารถสร้างโทเคนได้');
      } else if (data?.type === 'closed') {
        Alert.alert('ยกเลิก', 'คุณปิดฟอร์ม Omise โดยยังไม่ได้เพิ่มบัตร');
      }
    } catch {
      Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสื่อสารกับ Omise');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="pt-4 pb-2" style={{ paddingHorizontal: TABS_HORIZONTAL_GUTTER }}>
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

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
          <View style={{ paddingHorizontal: TABS_HORIZONTAL_GUTTER }}>
            {canUseOmiseUI ? (
              <View className="rounded-xl overflow-hidden mb-6">
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: omiseHtml }}
                  onMessage={handleOmiseMessage}
                  javaScriptEnabled
                  domStorageEnabled
                  mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
                  onError={() => { pushStatus('webview_error'); Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดฟอร์ม Omise ได้'); }}
                  onHttpError={() => { pushStatus('webview_http_error'); Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดจาก Omise โปรดลองใหม่'); }}
                  onLoadStart={() => pushStatus('webview_load_start')}
                  onLoadEnd={() => pushStatus('webview_load_end')}
                  startInLoadingState
                  renderLoading={() => (
                    <View className="items-center justify-center py-10">
                      <ActivityIndicator color="#51BC8E" />
                      <Text className="text-[#6B7280] mt-2">กำลังโหลดฟอร์ม Omise...</Text>
                    </View>
                  )}
                  style={{ height: 640 }}
                />
                {Boolean(omiseStatus) && (
                  <View className="px-3 py-2 bg-yellow-50 border border-yellow-200">
                    <Text className="text-yellow-700 text-xs">สถานะ Omise: {omiseStatus}</Text>
                  </View>
                )}
                {omiseLoading && (
                  <View className="absolute inset-0 bg-black/10 items-center justify-center">
                    <ActivityIndicator color="#51BC8E" />
                  </View>
                )}
              </View>
            ) : (
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
            )}

          {!canUseOmiseUI && (
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
          )}

          {!canUseOmiseUI && (
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
          )}

      

       
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
