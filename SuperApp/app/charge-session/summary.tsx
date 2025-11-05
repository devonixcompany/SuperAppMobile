import { paymentService, type PaymentCard } from "@/services/api/payment.service";
import { transactionService } from "@/services/api/transaction.service";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  primary: "#1D2144",
  accent: "#0CC46C",
  background: "#0A0E27",
  card: "rgba(255, 255, 255, 0.05)",
  cardLight: "rgba(255, 255, 255, 0.1)",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A6C5",
  divider: "rgba(255, 255, 255, 0.1)",
  glow: "#00E5FF",
  glowGreen: "#0CC46C",
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
  const secs = total % 60;
  if (hours > 0) {
    return `${hours} ชม. ${minutes.toString().padStart(2, "0")} นาที`;
  }
  return `${minutes} นาที ${secs.toString().padStart(2, "0")} วินาที`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value?: number | null, currencyLabel: string = "บาท") => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return `0.00 ${currencyLabel}`;
  }
  return `${value.toFixed(2)} ${currencyLabel}`;
};

type ChargeSummaryParams = {
  transactionId?: string;
  energy?: string;
  cost?: string;
  durationSeconds?: string;
  startTime?: string;
  endTime?: string;
  meterStart?: string;
  meterStop?: string;
  stopReason?: string;
  connectorId?: string;
  chargePointIdentity?: string;
  chargePointName?: string;
  currency?: string;
  rate?: string;
};

export default function ChargeSummaryScreen() {
  const params = useLocalSearchParams<ChargeSummaryParams>();

  const resolveParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const transactionId = resolveParam(params.transactionId);
  const energyParam = resolveParam(params.energy);
  const costParam = resolveParam(params.cost);
  const durationParam = resolveParam(params.durationSeconds);
  const startTimeParam = resolveParam(params.startTime);
  const endTimeParam = resolveParam(params.endTime);
  const meterStartParam = resolveParam(params.meterStart);
  const meterStopParam = resolveParam(params.meterStop);
  const stopReasonParam = resolveParam(params.stopReason);
  const connectorIdParam = resolveParam(params.connectorId);
  const chargePointIdentityParam = resolveParam(params.chargePointIdentity);
  const chargePointNameParam = resolveParam(params.chargePointName);
  const currencyParam = resolveParam(params.currency);
  const rateParam = resolveParam(params.rate);

  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isProcessingPayment, setProcessingPayment] = useState(false);
  const [isLoadingCards, setLoadingCards] = useState(true);

  const loadPaymentCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      const response = await paymentService.getPaymentCards();
      if (response.success && response.data) {
        setPaymentCards(response.data);
        const defaultCard = response.data.find((card) => card.isDefault);
        setSelectedCardId(
          (defaultCard ?? response.data[0])?.id ?? null
        );
      }
    } catch (error) {
      console.error('Error loading payment cards:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดบัตรชำระเงินได้');
    } finally {
      setLoadingCards(false);
    }
  }, []);

  const energyKWh = useMemo(() => {
    const parsed = Number(energyParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [energyParam]);

  const totalCost = useMemo(() => {
    const parsed = Number(costParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [costParam]);

  const durationSeconds = useMemo(() => {
    const parsed = Number(durationParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [durationParam]);

  const meterStart = useMemo(() => {
    const parsed = Number(meterStartParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [meterStartParam]);

  const meterStop = useMemo(() => {
    const parsed = Number(meterStopParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [meterStopParam]);

  const appliedRate = useMemo(() => {
    const parsed = Number(rateParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [rateParam]);

  useEffect(() => {
    loadPaymentCards();
  }, [loadPaymentCards]);

  const selectedCard = useMemo(
    () => paymentCards.find((card) => card.id === selectedCardId) ?? null,
    [paymentCards, selectedCardId]
  );

  const currencyLabel = currencyParam ?? "บาท";
  const connectorLabel = connectorIdParam
    ? `หัวชาร์จ ${connectorIdParam}`
    : "-";

  const canInitiatePayment =
    Boolean(transactionId) && totalCost != null && totalCost > 0;

  const handleOpenPaymentModal = useCallback(() => {
    if (!canInitiatePayment) {
      Alert.alert('ไม่สามารถชำระเงินได้', 'ไม่พบข้อมูลค่าชาร์จที่ต้องชำระ');
      return;
    }

    if (paymentCards.length === 0) {
      Alert.alert('ยังไม่มีบัตร', 'กรุณาเพิ่มบัตรก่อนทำการชำระเงิน', [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'เพิ่มบัตร',
          onPress: () => router.push('/(tabs)/card/add-payment-method'),
        },
      ]);
      return;
    }

    setPaymentModalVisible(true);
  }, [canInitiatePayment, paymentCards.length]);

  const handleAddNewCard = useCallback(() => {
    setPaymentModalVisible(false);
    router.push('/(tabs)/card/add-payment-method');
  }, []);

  const handleProcessPayment = useCallback(async () => {
    if (!transactionId) {
      Alert.alert('ไม่พบข้อมูลธุรกรรม', 'ไม่สามารถระบุธุรกรรมสำหรับการชำระเงินได้');
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await transactionService.processTransactionPayment(transactionId, {
        cardId: selectedCardId ?? undefined,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'ไม่สามารถชำระเงินได้');
      }

      const result = response.data;

      if (!result.success) {
        Alert.alert('ชำระเงินไม่สำเร็จ', result.error ?? 'ไม่สามารถชำระเงินได้');
        return;
      }

      setPaymentModalVisible(false);

      if (result.requiresAction && result.authorizeUri) {
        await WebBrowser.openBrowserAsync(result.authorizeUri);
        Alert.alert('ต้องยืนยันเพิ่มเติม', 'กรุณาทำตามขั้นตอนกับธนาคารของคุณเพื่อยืนยันการชำระเงิน');
        return;
      }

      await loadPaymentCards();
      Alert.alert('ชำระเงินสำเร็จ', 'บันทึกการชำระเงินเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Process payment error:', error);
      const message =
        error?.message ??
        error?.response?.data?.message ??
        'ไม่สามารถชำระเงินได้';
      Alert.alert('ข้อผิดพลาด', message);
    } finally {
      setProcessingPayment(false);
    }
  }, [loadPaymentCards, selectedCardId, transactionId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#0A0E27", "#1a1f3a", "#0A0E27"]}
        style={styles.backgroundGradient}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/(tabs)/home")}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>สรุปการชาร์จ</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <LinearGradient
            colors={["rgba(12, 196, 108, 0.25)", "rgba(0, 229, 255, 0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryHero}
          >
            <View style={styles.heroIconWrapper}>
              <Ionicons name="checkmark-done" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>การชาร์จเสร็จสิ้น</Text>
            <Text style={styles.heroSubtitle}>
              {chargePointNameParam ?? chargePointIdentityParam ?? "ไม่ระบุสถานี"}
            </Text>
          </LinearGradient>

          <View style={styles.metricsCard}>
            <View style={styles.metricsColumn}>
              <Text style={styles.metricLabel}>พลังงานที่ใช้</Text>
              <Text style={styles.metricValue}>
                {energyKWh != null ? `${formatNumber(energyKWh, 2)} kWh` : "-"}
              </Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.metricsColumn}>
              <Text style={styles.metricLabel}>ค่าใช้จ่ายโดยประมาณ</Text>
              <Text style={[styles.metricValue, { color: COLORS.glowGreen }]}>
                {totalCost != null
                  ? formatCurrency(totalCost, currencyLabel)
                  : "-"}
              </Text>
            </View>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>รายละเอียดการชาร์จ</Text>

            <InfoRow label="หมายเลขธุรกรรม" value={transactionId ?? "-"} />
            <InfoRow label="สถานี" value={chargePointNameParam ?? chargePointIdentityParam ?? "-"} />
            <InfoRow label="หัวชาร์จ" value={connectorLabel} />
            <InfoRow label="เริ่มชาร์จ" value={formatDateTime(startTimeParam)} />
            <InfoRow label="สิ้นสุด" value={formatDateTime(endTimeParam)} />
            <InfoRow label="ระยะเวลา" value={formatDuration(durationSeconds)} />
            <InfoRow
              label="ค่ามิเตอร์เริ่มต้น"
              value={
                meterStart != null
                  ? `${formatNumber(meterStart, 3)}`
                  : "-"
              }
            />
            <InfoRow
              label="ค่ามิเตอร์สิ้นสุด"
              value={
                meterStop != null
                  ? `${formatNumber(meterStop, 3)}`
                  : "-"
              }
            />
            <InfoRow
              label="อัตราค่าบริการ"
              value={
                appliedRate != null
                  ? `${formatCurrency(appliedRate, currencyLabel)}/kWh`
                  : "-"
              }
            />
            <InfoRow label="เหตุผลการหยุด" value={stopReasonParam || "AUTO"} />
          </View>

          {paymentCards.length > 0 ? (
            <View style={styles.paymentCardSection}>
              <View style={styles.paymentCardHeader}>
                <Text style={styles.paymentCardTitle}>บัตรสำหรับการชำระเงิน</Text>
                <TouchableOpacity onPress={handleOpenPaymentModal}>
                  <Text style={styles.paymentCardAction}>เปลี่ยนบัตร</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.paymentCardBody}>
                <View style={styles.paymentCardIcon}>
                  <Ionicons name="card" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.paymentCardInfo}>
                  <Text style={styles.paymentCardBrand}>
                    {selectedCard?.brand?.toUpperCase() ?? "บัตรเครดิต"}
                  </Text>
                  <Text style={styles.paymentCardNumber}>
                    {selectedCard?.lastDigits
                      ? `**** **** **** ${selectedCard.lastDigits}`
                      : "เลือกบัตรสำหรับชำระเงิน"}
                  </Text>
                  {selectedCard?.isDefault && (
                    <Text style={styles.paymentCardBadge}>บัตรหลัก</Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.paymentCardEmpty}
              activeOpacity={0.85}
              onPress={handleOpenPaymentModal}
            >
              <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} />
              <View style={styles.paymentCardEmptyTextWrapper}>
                <Text style={styles.paymentCardEmptyTitle}>เพิ่มบัตรเพื่อชำระเงิน</Text>
                <Text style={styles.paymentCardEmptySubtitle}>
                  ผูกบัตรเครดิตเพื่อชำระค่าชาร์จได้รวดเร็ว
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.actions}>
            {canInitiatePayment && (
              <TouchableOpacity
                style={styles.paymentButton}
                activeOpacity={0.85}
                onPress={handleOpenPaymentModal}
              >
                <LinearGradient
                  colors={["#4ADE80", "#22D3EE"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.paymentButtonGradient}
                >
                  <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.paymentButtonText}>ชำระค่าใช้จ่าย</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => router.replace("/(tabs)/home")}
            >
              <LinearGradient
                colors={[COLORS.glowGreen, COLORS.glow]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.primaryButtonGradient}
              >
                <Ionicons name="home-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>กลับหน้าหลัก</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => router.replace("/(tabs)/charging")}
            >
              <Ionicons name="repeat-outline" size={20} color={COLORS.glow} />
              <Text style={styles.secondaryButtonText}>เริ่มชาร์จใหม่</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={isPaymentModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPaymentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>เลือกบัตรสำหรับชำระเงิน</Text>
              <View style={styles.modalCardList}>
                {isLoadingCards ? (
                  <View style={styles.modalLoader}>
                    <ActivityIndicator color="#2563EB" />
                  </View>
                ) : paymentCards.length === 0 ? (
                  <TouchableOpacity
                    style={styles.modalEmptyState}
                    onPress={handleAddNewCard}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="card-outline" size={24} color="#2563EB" />
                    <Text style={styles.modalEmptyStateText}>
                      ยังไม่มีบัตรที่ผูกไว้
                    </Text>
                    <Text style={styles.modalEmptyStateHint}>
                      แตะเพื่อเพิ่มบัตรใหม่
                    </Text>
                  </TouchableOpacity>
                ) : (
                  paymentCards.map((card) => {
                    const isSelected = card.id === selectedCardId;
                    return (
                      <TouchableOpacity
                        key={card.id}
                        style={[
                          styles.modalCardRow,
                          isSelected && styles.modalCardRowSelected,
                        ]}
                        onPress={() => setSelectedCardId(card.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.modalCardIconWrapper}>
                          <Ionicons name="card" size={20} color="#2563EB" />
                        </View>
                        <View style={styles.modalCardInfo}>
                          <Text style={styles.modalCardBrand}>
                            {card.brand?.toUpperCase() ?? "บัตรเครดิต"}
                          </Text>
                          <Text style={styles.modalCardDigits}>
                            {card.lastDigits
                              ? `**** **** **** ${card.lastDigits}`
                              : "ไม่มีข้อมูลเลขบัตร"}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons name="radio-button-on" size={20} color="#2563EB" />
                        ) : (
                          <Ionicons name="radio-button-off" size={20} color="#CBD5F5" />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <TouchableOpacity
                style={styles.modalAddCardButton}
                onPress={handleAddNewCard}
              >
                <Ionicons name="add" size={16} color="#2563EB" />
                <Text style={styles.modalAddCardLabel}>เพิ่มบัตรใหม่</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setPaymentModalVisible(false)}
                  disabled={isProcessingPayment}
                >
                  <Text style={styles.modalSecondaryLabel}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    (!selectedCardId || isProcessingPayment) && styles.modalPrimaryButtonDisabled,
                  ]}
                  onPress={handleProcessPayment}
                  disabled={!selectedCardId || isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalPrimaryLabel}>ชำระเงิน</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  summaryHero: {
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  heroIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  metricsCard: {
    flexDirection: "row",
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardLight,
    marginBottom: 20,
    overflow: "hidden",
  },
  metricsColumn: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  detailsCard: {
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardLight,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "right",
    marginLeft: 12,
  },
  paymentCardSection: {
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardLight,
    padding: 18,
    marginBottom: 24,
  },
  paymentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  paymentCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  paymentCardAction: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.glow,
  },
  paymentCardBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  paymentCardInfo: {
    marginLeft: 16,
  },
  paymentCardBrand: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  paymentCardNumber: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  paymentCardBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#22D3EE",
  },
  paymentCardEmpty: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardLight,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  paymentCardEmptyTextWrapper: {
    flex: 1,
  },
  paymentCardEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  paymentCardEmptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  paymentButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  paymentButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  paymentButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glow,
    backgroundColor: "rgba(0,229,255,0.08)",
  },
  secondaryButtonText: {
    color: COLORS.glow,
    fontSize: 15,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  modalCardList: {
    maxHeight: 320,
  },
  modalLoader: {
    paddingVertical: 36,
    alignItems: "center",
  },
  modalCardRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  modalCardRowSelected: {
    borderColor: "#2563EB",
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  modalCardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalCardInfo: {
    flex: 1,
  },
  modalCardBrand: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  modalCardDigits: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  modalAddCardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginVertical: 8,
  },
  modalAddCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  modalSecondaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  modalPrimaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  modalPrimaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalEmptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
  },
  modalEmptyStateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  modalEmptyStateHint: {
    fontSize: 12,
    color: "#64748B",
  },
});
