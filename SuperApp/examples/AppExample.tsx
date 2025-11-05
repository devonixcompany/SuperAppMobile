/**
 * ตัวอย่าง App.tsx ที่ใช้ AuthProvider และจัดการ Navigation
 * วางไฟล์นี้ใน App.tsx หรือ app/_layout.tsx
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Contexts
import { AuthProvider, useAuthStatus } from '@/contexts/AuthContext';

// Screens
import HomeScreen from '@/examples/HomeScreenExample';
import LoginScreen from '@/examples/LoginScreenExample';
// import RegisterScreen from '@/screens/RegisterScreen';
// import ProfileScreen from '@/screens/ProfileScreen';
// import ChargingScreen from '@/screens/ChargingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Loading Screen แสดงขณะตรวจสอบสถานะการเข้าสู่ระบบ
 */
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
    <Text style={styles.loadingText}>กำลังโหลด...</Text>
  </View>
);

/**
 * Auth Stack สำหรับผู้ใช้ที่ยังไม่ได้เข้าสู่ระบบ
 */
const AuthStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      cardStyle: { backgroundColor: '#FFFFFF' }
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    {/* <Stack.Screen name="Register" component={RegisterScreen} /> */}
    {/* <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> */}
  </Stack.Navigator>
);

/**
 * Main Tabs สำหรับผู้ใช้ที่เข้าสู่ระบบแล้ว
 */
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: '#6B7280',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E5E7EB',
        borderTopWidth: 1,
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
    }}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen}
      options={{
        title: 'หน้าหลัก',
        tabBarIcon: ({ color, size }) => (
          <Text style={{ color, fontSize: size }}>🏠</Text>
        ),
      }}
    />
    {/* <Tab.Screen 
      name="Charging" 
      component={ChargingScreen}
      options={{
        title: 'ชาร์จ',
        tabBarIcon: ({ color, size }) => (
          <Text style={{ color, fontSize: size }}>⚡</Text>
        ),
      }}
    /> */}
    {/* <Tab.Screen 
      name="History" 
      component={HistoryScreen}
      options={{
        title: 'ประวัติ',
        tabBarIcon: ({ color, size }) => (
          <Text style={{ color, fontSize: size }}>📋</Text>
        ),
      }}
    /> */}
    {/* <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{
        title: 'โปรไฟล์',
        tabBarIcon: ({ color, size }) => (
          <Text style={{ color, fontSize: size }}>👤</Text>
        ),
      }}
    /> */}
  </Tab.Navigator>
);

/**
 * App Navigator ที่ตัดสินใจแสดง Auth Stack หรือ Main Tabs
 */
const AppNavigator = () => {
  const { isLoggedIn, isLoading } = useAuthStatus();

  console.log('🧭 Navigation state:', { isLoggedIn, isLoading });

  // แสดง Loading Screen ขณะตรวจสอบสถานะ
  if (isLoading) {
    return <LoadingScreen />;
  }

  // แสดง Auth Stack หรือ Main Tabs ตามสถานะการเข้าสู่ระบบ
  return (
    <NavigationContainer>
      {isLoggedIn ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

/**
 * Main App Component
 */
const App = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default App;

/**
 * การใช้งาน:
 * 
 * 1. วางไฟล์นี้ใน App.tsx หรือ app/_layout.tsx
 * 2. ติดตั้ง dependencies:
 *    npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
 *    npx expo install react-native-screens react-native-safe-area-context
 * 
 * 3. สร้างหน้าจอต่างๆ ตามที่ comment ไว้
 * 4. ปรับแต่ง navigation และ UI ตามต้องการ
 * 
 * Features:
 * - ✅ Auto login/logout navigation
 * - ✅ Loading screen ขณะตรวจสอบสถานะ
 * - ✅ Token refresh อัตโนมัติ
 * - ✅ Secure token storage
 * - ✅ Error handling
 * - ✅ TypeScript support
 */