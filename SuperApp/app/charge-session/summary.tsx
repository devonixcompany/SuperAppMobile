import { paymentService, type PaymentCard } from "@/services/api/payment.service";
import { transactionService } from "@/services/api/transaction.service";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  selectedCardId?: string;
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
  const selectedCardIdParam = resolveParam(params.selectedCardId);

  const navigationInProgressRef = useRef(false);

  const goHome = useCallback(() => {
    if (navigationInProgressRef.current) {
      return;
    }
    navigationInProgressRef.current = true;
    router.replace("/(tabs)/home");
  }, []);

  const goToChargingHistory = useCallback(() => {
    if (navigationInProgressRef.current) {
      return;
    }
    navigationInProgressRef.current = true;
    if (transactionId) {
      router.replace({
        pathname: '/charging-history/[transactionId]',
        params: { transactionId }
      });
    } else {
      goHome();
    }
  }, [transactionId, goHome]);

  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isProcessingPayment, setProcessingPayment] = useState(false);
  const [isLoadingCards, setLoadingCards] = useState(true);
  const [isWaiting3DS, setIsWaiting3DS] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    setIsWaiting3DS(false);
    setPendingPaymentId(null);
  }, []);

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

  const startPollingPayment = useCallback((paymentId: string) => {
    stopPolling();
    setIsWaiting3DS(true);
    setPendingPaymentId(paymentId);

    let attempts = 0;
    const maxAttempts = 12; // ~30s total
    const intervalMs = 2500;

    pollerRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const statusResp = await paymentService.getPaymentStatus(paymentId);
        if (statusResp.success && statusResp.data) {
          const { status, failureMessage } = statusResp.data;
          if (status === 'SUCCESS' || status === 'FAILED') {
            stopPolling();
            if (status === 'SUCCESS') {
              setPaymentModalVisible(false);
              await loadPaymentCards();
              try { await WebBrowser.dismissBrowser(); } catch {}
              Alert.alert(
                'ชำระเงินสำเร็จ',
                'บันทึกการชำระเงินเรียบร้อยแล้ว',
                [{ text: 'ตกลง', onPress: goToChargingHistory }]
              );
            } else {
              Alert.alert('ชำระเงินไม่สำเร็จ', failureMessage ?? 'ไม่สามารถชำระเงินได้');
            }
          }
        }
      } catch (err) {
        console.warn('Polling payment history error:', err);
      }

      if (attempts >= maxAttempts) {
        stopPolling();
        Alert.alert('หมดเวลา', 'การตรวจสอบการยืนยัน 3DS หมดเวลา กรุณาลองใหม่');
      }
    }, intervalMs);
  }, [loadPaymentCards, stopPolling, goToChargingHistory]);


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

  // Update selected card when returning from card selection screen
  useEffect(() => {
    if (selectedCardIdParam) {
      setSelectedCardId(selectedCardIdParam);
    }
  }, [selectedCardIdParam]);

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

      // 3DS flow: keep modal open, start polling for result
      if (result.requiresAction && result.authorizeUri && result.paymentId) {
        setIsWaiting3DS(true);
        setPendingPaymentId(result.paymentId);
        startPollingPayment(result.paymentId);
        await WebBrowser.openBrowserAsync(result.authorizeUri);
        return;
      }

      // No 3DS required: close modal and refresh cards
      setPaymentModalVisible(false);

      await loadPaymentCards();
      try { await WebBrowser.dismissBrowser(); } catch {}
      Alert.alert(
        'ชำระเงินสำเร็จ',
        'บันทึกการชำระเงินเรียบร้อยแล้ว',
        [{ text: 'ตกลง', onPress: goToChargingHistory }]
      );
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
  }, [loadPaymentCards, selectedCardId, transactionId, goToChargingHistory, startPollingPayment]);

  // Stop polling if modal is closed or on unmount
  useEffect(() => {
    if (!isPaymentModalVisible) {
      stopPolling();
    }
  }, [isPaymentModalVisible, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Calculate VAT (7%) and base cost
  const vatRate = 0.07;
  const baseChargeCost = totalCost ? totalCost / (1 + vatRate) : 0;
  const vatAmount = totalCost ? totalCost - baseChargeCost : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundGradient}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={goHome}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>สรุปการชาร์จ</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Summary Section */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionLabel}>รายละเอียด</Text>
            <Text style={styles.stationName}>
              {chargePointNameParam ?? chargePointIdentityParam ?? "ไม่ระบุสถานี"}
            </Text>
            <Text style={styles.dateTime}>{formatDateTime(startTimeParam)}</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>เวลาการชาร์จ</Text>
              <Text style={styles.detailValue}>{formatDuration(durationSeconds)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>พลังงาน</Text>
              <Text style={styles.detailValue}>
                {energyKWh != null ? `${formatNumber(energyKWh, 2)} kWh` : "-"}
              </Text>
            </View>
          </View>

          {/* Service Fee Section */}
          <View style={styles.feeSection}>
            <Text style={styles.sectionLabel}>ค่าบริการ</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ค่าบริการชาร์จ</Text>
              <Text style={styles.detailValue}>{formatCurrency(baseChargeCost, currencyLabel)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VAT</Text>
              <Text style={styles.detailValue}>{formatCurrency(vatAmount, currencyLabel)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ค่าบริการรวม</Text>
              <Text style={styles.detailValue}>
                {totalCost != null ? formatCurrency(totalCost, currencyLabel) : "-"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ยอดที่ต้องชำระ</Text>
              <Text style={styles.amountToPay}>
                {totalCost != null ? formatCurrency(totalCost, currencyLabel) : "-"}
              </Text>
            </View>
          </View>

          {/* Payment Method Section */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionLabel}>ช่องทางการชำระเงิน</Text>

            {isLoadingCards ? (
              <View style={styles.paymentDropdown}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
            ) : paymentCards.length > 0 ? (
              <TouchableOpacity
                style={styles.paymentDropdown}
                onPress={() => {
                  router.push({
                    pathname: '/charge-session/select-credit-card',
                    params: {
                      transactionId: transactionId,
                      energy: energyParam,
                      cost: costParam,
                      durationSeconds: durationParam,
                      startTime: startTimeParam,
                      endTime: endTimeParam,
                      meterStart: meterStartParam,
                      meterStop: meterStopParam,
                      stopReason: stopReasonParam,
                      connectorId: connectorIdParam,
                      chargePointIdentity: chargePointIdentityParam,
                      chargePointName: chargePointNameParam,
                      currency: currencyParam,
                      rate: rateParam,
                      returnPath: '/charge-session/summary',
                    },
                  });
                }}
              >
                <View style={styles.dropdownContent}>
                  <View style={styles.cardIconWrapper}>
                    <Ionicons name="card" size={20} color={COLORS.accent} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardBrand}>
                      {selectedCard?.brand?.toUpperCase() ?? "บัตรเครดิต"}
                    </Text>
                    {selectedCard?.lastDigits && (
                      <Text style={styles.cardNumber}>
                        **** **** **** {selectedCard.lastDigits}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={COLORS.textPrimary}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.paymentDropdown}
                onPress={handleAddNewCard}
              >
                <View style={styles.dropdownContent}>
                  <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.emptyCardText}>เพิ่มบัตรเพื่อชำระเงิน</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={goHome}
            >
              <Text style={styles.secondaryButtonText}>กลับหน้าหลัก</Text>
            </TouchableOpacity>

            {canInitiatePayment && (
              <TouchableOpacity
                style={styles.paymentButton}
                activeOpacity={0.85}
                onPress={handleOpenPaymentModal}
              >
                <LinearGradient
                  colors={["#5EC1A0", "#67C1A5", "#589FAF", "#395F85", "#1F274B"]}
                  start={{ x: 1, y: 0.5 }}
                  end={{ x: 0, y: 0.5 }}
                  style={styles.paymentButtonGradient}
                >
                  <Text style={styles.paymentButtonText}>ชำระเงิน</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Payment Modal */}
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
                    <ActivityIndicator color={COLORS.accent} />
                  </View>
                ) : paymentCards.length === 0 ? (
                  <TouchableOpacity
                    style={styles.modalEmptyState}
                    onPress={handleAddNewCard}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="card-outline" size={24} color={COLORS.accent} />
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
                          <Ionicons name="card" size={20} color={COLORS.accent} />
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
                          <Ionicons name="radio-button-on" size={20} color={COLORS.accent} />
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
                <Ionicons name="add" size={16} color={COLORS.accent} />
                <Text style={styles.modalAddCardLabel}>เพิ่มบัตรใหม่</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => setPaymentModalVisible(false)}
                  disabled={isProcessingPayment || isWaiting3DS}
                >
                  <Text style={styles.modalSecondaryLabel}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    (!selectedCardId || isProcessingPayment || isWaiting3DS) && styles.modalPrimaryButtonDisabled,
                  ]}
                  onPress={handleProcessPayment}
                  disabled={!selectedCardId || isProcessingPayment || isWaiting3DS}
                >
                  {isProcessingPayment || isWaiting3DS ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalPrimaryLabel}>ชำระเงิน</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingTop: 48,
    paddingHorizontal: 40,
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
    alignItems: "center",
    justifyContent: "center",
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
  summarySection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "300",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  stationName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  dateTime: {
    fontSize: 18,
    fontWeight: "300",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 18,
    fontWeight: "300",
    color: COLORS.textPrimary,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: "300",
    color: COLORS.textPrimary,
  },
  feeSection: {
    marginBottom: 24,
  },
  amountToPay: {
    fontSize: 18,
    fontWeight: "300",
    color: COLORS.accent,
  },
  paymentSection: {
    marginBottom: 32,
  },
  paymentDropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIconWrapper: {
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  cardNumber: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyCardText: {
    fontSize: 15,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  actions: {
    gap: 16,
    marginTop: 40,
  },
  secondaryButton: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.accent,
  },
  paymentButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  paymentButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    color: COLORS.textPrimary,
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
    borderColor: COLORS.divider,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  modalCardRowSelected: {
    borderColor: COLORS.accent,
    backgroundColor: "rgba(81, 188, 142, 0.1)",
  },
  modalCardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(81, 188, 142, 0.15)",
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
    color: COLORS.textPrimary,
  },
  modalCardDigits: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    color: COLORS.accent,
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
    borderColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  modalSecondaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  modalPrimaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  modalPrimaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalEmptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
  },
  modalEmptyStateText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  modalEmptyStateHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
