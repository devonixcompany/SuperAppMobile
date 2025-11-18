import { transactionService } from "@/services/api/transaction.service";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const COLORS = {
  primary: "#1F274B",
  accent: "#51BC8E",
  background: "#EEF0F6",
  card: "#FFFFFF",
  cardLight: "#E5E7EB",
  textPrimary: "#1F274B",
  textSecondary: "#6B7280",
  divider: "#E5E7EB",
  glow: "#51BC8E",
  glowGreen: "#51BC8E",
  success: "#10B981",
};

const formatNumber = (value?: number | null, fractionDigits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(fractionDigits);
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) {
    return "-";
  }
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) {
    return `${hours} ชม. ${minutes.toString().padStart(2, "0")} นาที`;
  }
  return `${minutes} นาที`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour12: false,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (value?: number | null, currencyLabel: string = "บาท") => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return `0.00 ${currencyLabel}`;
  }
  return `${value.toFixed(2)} ${currencyLabel}`;
};

interface ChargingHistoryData {
  id: string;
  transactionId: string;
  ocppTransactionId?: string;
  status: string;
  station: {
    name: string;
    location: string;
    latitude: string;
    longitude: string;
    chargePointName: string;
    connectorId: string;
  };
  chargePoint: {
    powerKw: number;
    connectorType: string;
    maxPower?: number;
  };
  timing: {
    startTime: string;
    endTime: string;
    chargingDurationMinutes: number;
    completedAt: string;
  };
  charging: {
    totalEnergy: number;
    startMeterValue: number;
    endMeterValue: number;
    currentSoC: number;
    appliedRate: number | null;
  };
  financial: {
    totalCost: number;
    totalPaid: number;
    currency: string;
    paymentStatus: string;
    paymentMethod: string | null;
    latestPayment: {
      id: string;
      amount: number;
      paidAt: string;
      provider: string;
    } | null;
  };
  payments: {
    id: string;
    amount: number;
    paidAt: string;
    provider: string;
  }[];
  vehicle: any;
  summary: {
    isLatestPaidSession: boolean;
    totalPayments: number;
    sessionCompletedDate: string;
  };
  stopReason: string;
  createdAt: string;
}

export default function ChargingHistoryScreen() {
  const params = useLocalSearchParams();
  const transactionId = Array.isArray(params.transactionId) 
    ? params.transactionId[0] 
    : params.transactionId;

  const [historyData, setHistoryData] = useState<ChargingHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistoryData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use real API to fetch latest completed transaction
      const response = await transactionService.getLatestCompletedTransaction();
      
      console.log('🗗️ [DEBUG] Full API response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('✅ [HISTORY] Raw API data:', JSON.stringify(response.data, null, 2));
        
        // Map the API response to match our interface structure
        const mappedData: ChargingHistoryData = {
          id: response.data.id,
          transactionId: response.data.transactionId,
          ocppTransactionId: response.data.ocppTransactionId,
          status: response.data.status,
          station: {
            name: response.data.station?.name || 'Unknown Station',
            location: response.data.station?.location || 'Unknown Location',
            latitude: response.data.station?.latitude || '',
            longitude: response.data.station?.longitude || '',
            chargePointName: response.data.station?.chargePointName || 'Unknown Charge Point',
            connectorId: response.data.station?.connectorId || ''
          },
          chargePoint: {
            powerKw: 50, // Default power since not provided in API
            connectorType: 'Type 2', // Default connector type
            maxPower: 50
          },
          timing: response.data.timing || {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            chargingDurationMinutes: 0,
            completedAt: new Date().toISOString()
          },
          charging: response.data.charging || {
            totalEnergy: 0,
            startMeterValue: 0,
            endMeterValue: 0,
            currentSoC: 0,
            appliedRate: null
          },
          financial: response.data.financial || {
            totalCost: 0,
            totalPaid: 0,
            currency: 'THB',
            paymentStatus: 'PENDING',
            paymentMethod: null,
            latestPayment: null
          },
          payments: response.data.financial?.latestPayment ? [{
            id: response.data.financial.latestPayment.id,
            amount: response.data.financial.latestPayment.amount,
            paidAt: response.data.financial.latestPayment.paidAt,
            provider: response.data.financial.latestPayment.provider
          }] : [],
          vehicle: response.data.vehicle,
          summary: response.data.summary || {
            isLatestPaidSession: false,
            totalPayments: 0,
            sessionCompletedDate: new Date().toISOString().split('T')[0]
          },
          stopReason: response.data.stopReason || 'Unknown',
          createdAt: response.data.createdAt || new Date().toISOString()
        };
        
        console.log('✅ [HISTORY] Mapped data:', JSON.stringify(mappedData, null, 2));
        setHistoryData(mappedData);
        console.log('✅ [HISTORY] Transaction data loaded:', mappedData.id);
      } else {
        console.warn('⚠️ [HISTORY] No transaction data found, response:', response);
        setHistoryData(null);
      }
    } catch (error) {
      console.error('❌ [HISTORY] Error loading history data:', error);
      setHistoryData(null);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลประวัติการชาร์จได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  const handleDownloadReceipt = () => {
    Alert.alert("ดาวน์โหลดใบเสร็จ", "ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้");
  };

  const handleTaxInvoice = () => {
    Alert.alert("ขอใบกำกับภาษี", "ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้");
  };

  const goHome = () => {
    router.replace("/(tabs)/home");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!historyData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>ไม่พบข้อมูลประวัติการชาร์จ</Text>
          <TouchableOpacity style={styles.homeButton} onPress={goHome}>
            <Text style={styles.homeButtonText}>กลับหน้าหลัก</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate charging duration from API data
  const chargingDuration = historyData.timing?.startTime && historyData.timing?.endTime 
    ? Math.floor((new Date(historyData.timing.endTime).getTime() - new Date(historyData.timing.startTime).getTime()) / 1000)
    : null;

  // Get first payment for display
  const mainPayment = historyData.payments?.[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/react-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Success Status */}
        <View style={styles.statusContainer}>
          <LinearGradient
            colors={[COLORS.success, COLORS.accent]}
            style={styles.statusGradient}
          >
            <Ionicons name="checkmark-circle" size={60} color="white" />
            <Text style={styles.statusTitle}>การชาร์จเสร็จสมบูรณ์แล้ว</Text>
          </LinearGradient>
        </View>

        {/* Station Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลสถานี</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>สถานีชาร์จ:</Text>
            <Text style={styles.infoValue}>{historyData.station?.name || 'ไม่ระบุ'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ตำแหน่ง:</Text>
            <Text style={styles.infoValue}>{historyData.station?.location || 'ไม่ระบุ'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>วัน/เวลา:</Text>
            <Text style={styles.infoValue}>{formatDateOnly(historyData.timing?.completedAt || historyData.createdAt)}</Text>
          </View>
        </View>

        {/* Charging Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลเกี่ยวกับการชาร์จ</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>วัน/เวลาเริ่มชาร์จ:</Text>
            <Text style={styles.infoValue}>{formatDateTime(historyData.timing?.startTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>สิ้นสุด:</Text>
            <Text style={styles.infoValue}>{formatDateTime(historyData.timing?.endTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>เวลาการชาร์จ:</Text>
            <Text style={styles.infoValue}>{formatDuration(chargingDuration)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>พลังงาน:</Text>
            <Text style={styles.infoValue}>{formatNumber((historyData.charging?.totalEnergy || 0) / 1000, 2)} kWh</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ขนาดชาร์จเจอร์:</Text>
            <Text style={styles.infoValue}>{formatNumber(historyData.chargePoint?.powerKw || 50, 0)} kW</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ประเภทหัวชาร์จ:</Text>
            <Text style={styles.infoValue}>{historyData.chargePoint?.connectorType || 'Type 2'}</Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ข้อมูลเกี่ยวกับการเงิน</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ช่องทางการชำระเงิน:</Text>
            <Text style={styles.infoValue}>
              {mainPayment?.provider === 'OMISE' ? 'บัตรเครดิต/เดบิต' : mainPayment?.provider || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ค่าบริการชาร์จ:</Text>
            <Text style={styles.infoValue}>{formatCurrency(historyData.financial?.totalCost || 0)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ค่าบริการรวม:</Text>
            <Text style={styles.infoValue}>{formatCurrency(historyData.financial?.totalPaid || 0)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>สถานะ:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {historyData.financial?.paymentStatus === 'SUCCESS' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>วัน/เวลาชำระเงิน:</Text>
            <Text style={styles.infoValue}>{formatDateTime(mainPayment?.paidAt)}</Text>
          </View>
        </View>

        {/* Thank You Message */}
        <View style={styles.thankYouContainer}>
          <View style={styles.divider} />
          <Text style={styles.thankYouText}>ขอบคุณที่ใช้บริการ PONIX</Text>
          <View style={styles.divider} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleDownloadReceipt}>
            <Ionicons name="download" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>ดาวน์โหลดใบเสร็จ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleTaxInvoice}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>ขอใบกำกับภาษี</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Home Button */}
        <TouchableOpacity style={styles.homeButtonLarge} onPress={goHome}>
          <Text style={styles.homeButtonLargeText}>กลับหน้าหลัก</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
  },
  logo: {
    width: 120,
    height: 40,
  },
  statusContainer: {
    marginBottom: 24,
  },
  statusGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginTop: 12,
    textAlign: "center",
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  statusBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  thankYouContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    width: "100%",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  homeButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  homeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  homeButtonLarge: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
  },
  homeButtonLargeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});