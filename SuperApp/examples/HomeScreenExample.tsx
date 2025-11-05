/**
 * ตัวอย่าง Home Screen ที่ใช้ AuthContext และ API Hooks
 * วางไฟล์นี้ใน app/(tabs)/index.tsx หรือ screens/HomeScreen.tsx
 */

import { useAuth, useUser } from '@/contexts/AuthContext';
import {
    useChargePoints,
    useTransactions,
    useUserProfile,
    useWebSocketUrl
} from '@/hooks/useApi';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const HomeScreen = () => {
  const { logout, tokenInfo } = useAuth();
  const { user } = useUser();
  
  // API Hooks
  const { 
    data: chargePoints, 
    loading: chargePointsLoading, 
    error: chargePointsError,
    refetch: refetchChargePoints 
  } = useChargePoints();
  
  const { 
    data: profile, 
    loading: profileLoading, 
    error: profileError,
    refetch: refetchProfile 
  } = useUserProfile();
  
  const { 
    data: transactions, 
    loading: transactionsLoading, 
    error: transactionsError,
    refetch: refetchTransactions 
  } = useTransactions(user?.id);

  // ตัวอย่างการใช้ WebSocket URL
  const { 
    data: websocketData, 
    loading: websocketLoading,
    execute: getWebSocketUrl 
  } = useWebSocketUrl('CP-TH-BKK-001', 1, user?.id || '');

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ออกจากระบบ', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              console.log('✅ Logout successful');
            } catch (error) {
              console.error('❌ Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchChargePoints(),
        refetchProfile(),
        refetchTransactions(),
      ]);
      console.log('✅ Data refreshed');
    } catch (error) {
      console.error('❌ Refresh error:', error);
    }
  };

  const handleGetWebSocketUrl = async () => {
    if (!user?.id) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้');
      return;
    }

    try {
      const result = await getWebSocketUrl();
      Alert.alert(
        'WebSocket URL',
        result?.websocketUrl || 'ไม่พบ URL',
        [{ text: 'ตกลง' }]
      );
    } catch (error: any) {
      Alert.alert('ข้อผิดพลาด', error.message);
    }
  };

  const isLoading = chargePointsLoading || profileLoading || transactionsLoading;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>สวัสดี</Text>
          <Text style={styles.userName}>
            {profile?.user?.fullName || user?.phoneNumber || 'ผู้ใช้'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      {/* Token Info (สำหรับ Debug) */}
      <View style={styles.debugSection}>
        <Text style={styles.sectionTitle}>Token Status</Text>
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenText}>
            🔑 Access Token: {tokenInfo.hasAccessToken ? '✅' : '❌'}
          </Text>
          <Text style={styles.tokenText}>
            🔄 Refresh Token: {tokenInfo.hasRefreshToken ? '✅' : '❌'}
          </Text>
          <Text style={styles.tokenText}>
            ⏰ Expired: {tokenInfo.isExpired ? '❌' : '✅'}
          </Text>
          {tokenInfo.expiration && (
            <Text style={styles.tokenText}>
              📅 Expires: {tokenInfo.expiration.toLocaleString('th-TH')}
            </Text>
          )}
        </View>
      </View>

      {/* User Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ข้อมูลผู้ใช้</Text>
        {profileLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : profileError ? (
          <Text style={styles.errorText}>
            ❌ โหลดข้อมูลไม่สำเร็จ: {profileError.message}
          </Text>
        ) : profile ? (
          <View style={styles.profileCard}>
            <Text style={styles.profileText}>
              📱 เบอร์โทร: {profile.user?.phoneNumber}
            </Text>
            <Text style={styles.profileText}>
              👤 ประเภท: {profile.user?.typeUser}
            </Text>
            <Text style={styles.profileText}>
              ✅ สถานะ: {profile.user?.status}
            </Text>
          </View>
        ) : (
          <Text style={styles.noDataText}>ไม่มีข้อมูล</Text>
        )}
      </View>

      {/* Charge Points */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>จุดชาร์จ</Text>
        {chargePointsLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : chargePointsError ? (
          <Text style={styles.errorText}>
            ❌ โหลดข้อมูลไม่สำเร็จ: {chargePointsError.message}
          </Text>
        ) : chargePoints?.data?.length > 0 ? (
          <View>
            <Text style={styles.dataText}>
              📍 พบจุดชาร์จ {chargePoints.data.length} จุด
            </Text>
            {chargePoints.data.slice(0, 3).map((cp: any, index: number) => (
              <View key={index} style={styles.chargePointCard}>
                <Text style={styles.chargePointName}>
                  {cp.chargepointname || cp.chargePointIdentity}
                </Text>
                <Text style={styles.chargePointStatus}>
                  สถานะ: {cp.chargepointstatus}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>ไม่พบจุดชาร์จ</Text>
        )}
      </View>

      {/* Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ธุรกรรม</Text>
        {transactionsLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : transactionsError ? (
          <Text style={styles.errorText}>
            ❌ โหลดข้อมูลไม่สำเร็จ: {transactionsError.message}
          </Text>
        ) : transactions?.data?.length > 0 ? (
          <View>
            <Text style={styles.dataText}>
              💳 พบธุรกรรม {transactions.data.length} รายการ
            </Text>
            {transactions.data.slice(0, 3).map((tx: any, index: number) => (
              <View key={index} style={styles.transactionCard}>
                <Text style={styles.transactionId}>
                  ID: {tx.transactionId}
                </Text>
                <Text style={styles.transactionStatus}>
                  สถานะ: {tx.status}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>ไม่พบธุรกรรม</Text>
        )}
      </View>

      {/* WebSocket Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ทดสอบ WebSocket</Text>
        <TouchableOpacity 
          style={styles.testButton}
          onPress={handleGetWebSocketUrl}
          disabled={websocketLoading}
        >
          {websocketLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.testButtonText}>
              ดึง WebSocket URL
            </Text>
          )}
        </TouchableOpacity>
        {websocketData && (
          <Text style={styles.websocketUrl}>
            🔗 {websocketData.websocketUrl}
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  debugSection: {
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  tokenInfo: {
    gap: 4,
  },
  tokenText: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: 'monospace',
  },
  profileCard: {
    gap: 8,
  },
  profileText: {
    fontSize: 14,
    color: '#374151',
  },
  chargePointCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  chargePointName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  chargePointStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  transactionCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  transactionStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  websocketUrl: {
    fontSize: 12,
    color: '#374151',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  loader: {
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  noDataText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  dataText: {
    color: '#059669',
    fontSize: 14,
    marginBottom: 8,
  },
});

export default HomeScreen;