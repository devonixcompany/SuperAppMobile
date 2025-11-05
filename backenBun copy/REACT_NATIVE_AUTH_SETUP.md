# React Native Authentication Setup

## 1. ติดตั้ง Dependencies

```bash
# AsyncStorage สำหรับเก็บ tokens
npm install @react-native-async-storage/async-storage

# Keychain สำหรับเก็บ tokens อย่างปลอดภัย (แนะนำ)
npm install react-native-keychain

# สำหรับ iOS
cd ios && pod install
```

## 2. Setup AuthManager

```javascript
// AuthManager.js
import AuthManager from './FRONTEND_AUTH_HELPER.js';

// สร้าง instance สำหรับ React Native
const auth = new AuthManager({
  baseURL: 'https://your-api-domain.com',
  platform: 'react-native',
  useKeychain: true // ใช้ Keychain สำหรับความปลอดภัย
});

export default auth;
```

## 3. ใช้งานใน React Native Components

### Login Screen
```javascript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import auth from './AuthManager';

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกเบอร์โทรและรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const userData = await auth.login(phoneNumber, password);
      console.log('✅ เข้าสู่ระบบสำเร็จ:', userData);
      
      // ไปหน้าหลัก
      navigation.replace('Home');
    } catch (error) {
      console.error('❌ เข้าสู่ระบบไม่สำเร็จ:', error);
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="เบอร์โทรศัพท์"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="รหัสผ่าน"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      <TouchableOpacity 
        onPress={handleLogin}
        disabled={loading}
        style={{ 
          backgroundColor: loading ? '#ccc' : '#007AFF', 
          padding: 15, 
          borderRadius: 5 
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;
```

### API Calls ใน Components
```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import auth from './AuthManager';

const ChargePointsScreen = () => {
  const [chargePoints, setChargePoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChargePoints();
  }, []);

  const loadChargePoints = async () => {
    try {
      // API call จะ refresh token อัตโนมัติถ้าหมดอายุ
      const response = await auth.apiCall('/api/chargepoints');
      setChargePoints(response.data);
    } catch (error) {
      console.error('❌ โหลดข้อมูลไม่สำเร็จ:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ออกจากระบบ', 
          onPress: async () => {
            await auth.logout();
            // navigation จะถูกจัดการโดย AuthManager
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        จุดชาร์จ
      </Text>
      <FlatList
        data={chargePoints}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>{item.name}</Text>
            <Text style={{ color: '#666' }}>{item.location}</Text>
          </View>
        )}
      />
      <TouchableOpacity 
        onPress={handleLogout}
        style={{ 
          backgroundColor: '#FF3B30', 
          padding: 15, 
          borderRadius: 5,
          marginTop: 20
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          ออกจากระบบ
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChargePointsScreen;
```

### App Navigation Setup
```javascript
// App.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import auth from './AuthManager';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createStackNavigator();

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // โหลด tokens จาก storage
      await auth.loadTokens();
      
      // ตรวจสอบว่ามี token และยังไม่หมดอายุ
      const loggedIn = auth.isLoggedIn() && !auth.isAccessTokenExpired();
      setIsLoggedIn(loggedIn);
      
      if (loggedIn) {
        console.log('✅ ผู้ใช้เข้าสู่ระบบอยู่');
        const expiration = auth.getAccessTokenExpiration();
        console.log('🕐 Token หมดอายุ:', expiration);
      } else {
        console.log('❌ ผู้ใช้ยังไม่ได้เข้าสู่ระบบ');
      }
    } catch (error) {
      console.error('❌ ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>กำลังโหลด...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
```

## 4. iOS Keychain Setup

### Info.plist
```xml
<!-- เพิ่มใน ios/YourApp/Info.plist -->
<key>keychain-access-groups</key>
<array>
  <string>$(AppIdentifierPrefix)com.yourapp.keychain</string>
</array>
```

### Entitlements
```xml
<!-- สร้างไฟล์ ios/YourApp/YourApp.entitlements -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>keychain-access-groups</key>
  <array>
    <string>$(AppIdentifierPrefix)com.yourapp.keychain</string>
  </array>
</dict>
</plist>
```

## 5. Android Keystore Setup

Android Keystore จะทำงานอัตโนมัติ ไม่ต้อง setup เพิ่มเติม

## 6. Security Best Practices

### ✅ ควรทำ
- ใช้ Keychain/Keystore สำหรับเก็บ tokens
- ตรวจสอบ token expiration ก่อนส่ง request
- ใช้ HTTPS เสมอ
- ตั้ง timeout สำหรับ API calls
- Log ข้อมูลสำคัญเพื่อ debug

### ❌ ไม่ควรทำ
- เก็บ tokens ใน plain text
- ส่ง tokens ผ่าน URL parameters
- เก็บ sensitive data ใน AsyncStorage โดยไม่เข้ารหัส
- ใช้ HTTP ใน production

## 7. Troubleshooting

### Token หมดอายุบ่อย
```javascript
// ตรวจสอบเวลาหมดอายุ
const expiration = auth.getAccessTokenExpiration();
console.log('Token expires at:', expiration);

// ตรวจสอบว่า refresh token ยังใช้ได้
if (auth.refreshToken) {
  console.log('Has refresh token');
} else {
  console.log('No refresh token - need to login again');
}
```

### Keychain ไม่ทำงาน
```javascript
// ตรวจสอบว่า keychain ใช้ได้
const auth = new AuthManager({
  baseURL: 'https://api.superapp.com',
  platform: 'react-native',
  useKeychain: false // ปิดใช้ keychain ชั่วคราว
});
```

### API calls ล้มเหลว
```javascript
// เพิ่ม error handling
try {
  const response = await auth.apiCall('/api/profile');
  console.log('Success:', response);
} catch (error) {
  console.error('API Error:', {
    message: error.message,
    hasToken: !!auth.accessToken,
    tokenExpired: auth.isAccessTokenExpired()
  });
}
```