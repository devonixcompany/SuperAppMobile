/**
 * ตัวอย่าง Login Screen ที่ใช้ AuthContext และ AuthManager
 * วางไฟล์นี้ใน app/(auth)/login.tsx หรือ screens/LoginScreen.tsx
 */

import { useAuth } from '@/contexts/AuthContext';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const LoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isLoading: authLoading } = useAuth();

  const handleLogin = async () => {
    // ตรวจสอบข้อมูล
    if (!phoneNumber.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกเบอร์โทรศัพท์');
      return;
    }

    if (!password.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Attempting login with:', phoneNumber);
      
      const response = await login({
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
      });

      console.log('✅ Login successful:', response.user);
      
      // แสดงข้อความสำเร็จ
      Alert.alert(
        'เข้าสู่ระบบสำเร็จ',
        `ยินดีต้อนรับ ${response.user.fullName || response.user.phoneNumber}`,
        [{ text: 'ตกลง' }]
      );

      // Navigation จะถูกจัดการโดย AuthContext และ App.tsx
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      Alert.alert(
        'เข้าสู่ระบบไม่สำเร็จ',
        error.message || 'กรุณาตรวจสอบเบอร์โทรและรหัสผ่าน',
        [{ text: 'ตกลง' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || authLoading || !phoneNumber.trim() || !password.trim();

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>เข้าสู่ระบบ</Text>
        <Text style={styles.subtitle}>SuperApp Charging</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>เบอร์โทรศัพท์</Text>
            <TextInput
              style={styles.input}
              placeholder="0812345678"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !authLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <TextInput
              style={styles.input}
              placeholder="รหัสผ่าน"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !authLoading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              isButtonDisabled && styles.loginButtonDisabled
            ]}
            onPress={handleLogin}
            disabled={isButtonDisabled}
          >
            {loading || authLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>ลืมรหัสผ่าน?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ยังไม่มีบัญชี? </Text>
          <TouchableOpacity>
            <Text style={styles.registerText}>สมัครสมาชิก</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  registerText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;