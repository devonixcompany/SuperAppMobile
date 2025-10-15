import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhoneAuthProvider, signInWithCredential, Auth } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { router, useLocalSearchParams } from 'expo-router';

export default function OTPVerificationScreen() {
  const { phoneNumber, verificationId } = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authData, setAuthData] = useState<any>(null);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setLoading(true);

    try {
      const credential = PhoneAuthProvider.credential(
        verificationId as string,
        otpCode
      );
      
      const userCredential = await signInWithCredential(auth, credential);
      
      // Show success feedback immediately
      setLoading(false);
      
      // Display authentication response data
       const responseData = {
         idToken: await userCredential.user.getIdToken(),
         refreshToken: userCredential.user.refreshToken,
         localId: userCredential.user.uid,
         phoneNumber: userCredential.user.phoneNumber,
         isNewUser: (userCredential as any).additionalUserInfo?.isNewUser || false,
         expiresIn: "3600" // Default token expiration
       };
      
      console.log('Authentication Response:', responseData);
      
      // Set auth data and show modal instead of Alert
      setAuthData(responseData);
      setShowAuthModal(true);
      
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      Alert.alert(
        '❌ ข้อผิดพลาด',
        error.message || 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง'
      );
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setResendLoading(true);
    setCountdown(60);
    
    try {
      // In a real app, you would call the resend OTP function here
      // For now, we'll just show a success message
      Alert.alert('สำเร็จ', 'ส่งรหัส OTP ใหม่แล้ว');
    } catch (error: any) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งรหัส OTP ใหม่ได้');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← กลับ</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>ยืนยันรหัส OTP</Text>
            <Text style={styles.subtitle}>
              เราได้ส่งรหัส OTP ไปยัง{'\n'}
              {phoneNumber}
            </Text>
          </View>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) => 
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={verifyOTP}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                  กำลังยืนยัน...
                </Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>ยืนยัน</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>
                ส่งรหัสใหม่ได้ในอีก {countdown} วินาที
              </Text>
            ) : (
              <TouchableOpacity
                onPress={resendOTP}
                disabled={resendLoading}
              >
                <Text style={styles.resendText}>
                  {resendLoading ? 'กำลังส่ง...' : 'ส่งรหัสใหม่'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Authentication Response Modal */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✅ เข้าสู่ระบบสำเร็จ!</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAuthModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {authData && (
              <View>
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>ข้อมูลผู้ใช้</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>เบอร์โทร:</Text>
                    <Text style={styles.infoValue}>{authData.phoneNumber}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID:</Text>
                    <Text style={styles.infoValue}>{authData.localId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>ผู้ใช้ใหม่:</Text>
                    <Text style={styles.infoValue}>{authData.isNewUser ? 'ใช่' : 'ไม่ใช่'}</Text>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Token Information</Text>
                  <View style={styles.tokenContainer}>
                    <Text style={styles.tokenLabel}>ID Token:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text style={styles.tokenValue}>{authData.idToken}</Text>
                    </ScrollView>
                  </View>
                  
                  <View style={styles.tokenContainer}>
                    <Text style={styles.tokenLabel}>Refresh Token:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text style={styles.tokenValue}>{authData.refreshToken}</Text>
                    </ScrollView>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>หมดอายุใน:</Text>
                    <Text style={styles.infoValue}>{authData.expiresIn} วินาที</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setShowAuthModal(false);
                setTimeout(() => {
                  router.replace('/(tabs)');
                }, 500);
              }}
            >
              <Text style={styles.primaryButtonText}>ไปหน้าหลัก</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: '#f9f9f9',
  },
  otpInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 14,
    color: '#999',
  },
  resendText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  infoSection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  tokenContainer: {
    marginVertical: 8,
  },
  tokenLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 12,
    color: '#1a1a1a',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});