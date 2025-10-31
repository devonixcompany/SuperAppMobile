import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  const currencyLabel = currencyParam ?? "บาท";
  const connectorLabel = connectorIdParam
    ? `หัวชาร์จ ${connectorIdParam}`
    : "-";

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

          <View style={styles.actions}>
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
  actions: {
    gap: 12,
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
});
