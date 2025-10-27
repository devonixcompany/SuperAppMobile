import env from "@/config/env";
import { normalizeWebSocketUrlToDevice } from "@/utils/network";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ConnectionState = "connecting" | "connected" | "error" | "closed";

type LogLevel = "info" | "success" | "error";

type StatusMessagePayload = {
  chargePointId: string;
  connectorId: number;
  status: string;
  isOnline: boolean;
  message?: string;
};

type ChargingDataPayload = {
  connectorId: number;
  status?: string;
  chargingPercentage?: number;
  currentPower?: number;
  currentMeter?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  energyDelivered?: number;
  sessionId?: string;
  transactionId?: number;
  startTime?: string | Date;
  duration?: number;
  estimatedRemainingSeconds?: number;
  cost?: number;
};

const COLORS = {
  primary: "#1D2144",
  accent: "#0CC46C",
  background: "#F5F6FA",
  card: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#808080",
  divider: "#D9D9D9",
};

const CONNECTOR_READY_STATUSES = new Set([
  "preparing",
  "suspendedev",
  "suspendedevse",
  "occupied",
  "finishing",
]);
const CONNECTOR_CHARGING_STATUSES = new Set(["charging"]);
const CONNECTOR_AVAILABLE_STATUSES = new Set(["available"]);

const STATUS_TEXT_MAP: Record<string, string> = {
  available: "พร้อมใช้งาน",
  preparing: "กำลังเตรียม",
  suspendedev: "ชาร์จเต็มเเล้ว",
  suspendedevse: "พักจากสถานี",
  occupied: "มีรถเสียบอยู่",
  finishing: "กำลังสรุปการชาร์จ",
  charging: "กำลังชาร์จ",
  unavailable: "ไม่พร้อมใช้งาน",
  faulted: "ขัดข้อง",
};

const formatNumber = (value?: number, fractionDigits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(fractionDigits);
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) {
    return "0 ชม. 00 นาที";
  }
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours} ชม. ${minutes.toString().padStart(2, "0")} นาที`;
};

const formatDateTime = (value?: string | number | Date | null) => {
  if (!value) return "-";
  const date =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatCurrency = (
  value?: number | null,
  currencyLabel: string = "บาท",
) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return `0.00 ${currencyLabel}`;
  }
  return `${value.toFixed(2)} ${currencyLabel}`;
};

export default function ChargeSessionScreen() {
  const params = useLocalSearchParams<{
    websocketUrl?: string;
    chargePointIdentity?: string;
    chargePointName?: string;
    connectorId?: string;
    stationName?: string;
    stationLocation?: string;
    powerRating?: string;
    baseRate?: string;
    currency?: string;
    pricingTierName?: string;
    chargePointBrand?: string;
    protocol?: string;
  }>();

  const normalizedWsUrl = useMemo(() => {
    if (!params.websocketUrl) {
      return undefined;
    }
    return normalizeWebSocketUrlToDevice(params.websocketUrl, env.apiUrl);
  }, [params.websocketUrl]);

  const connectorId = useMemo(() => {
    if (!params.connectorId) return undefined;
    const parsed = Number(params.connectorId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [params.connectorId]);

  const baseRate = useMemo(() => {
    if (!params.baseRate) return undefined;
    const parsed = Number(params.baseRate);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [params.baseRate]);

  const wsRef = useRef<WebSocket | null>(null);
  const chargingGlow = useRef(new Animated.Value(0.3)).current;
  const circleScale = useRef(new Animated.Value(1)).current;
  const chargingAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [status, setStatus] = useState<StatusMessagePayload | null>(null);
  const [chargingData, setChargingData] = useState<ChargingDataPayload | null>(
    null,
  );
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [activeTransactionId, setActiveTransactionId] = useState<
    number | null
  >(null);
  const [idTag, setIdTag] = useState("EV-USER-001");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const appendLog = useCallback((level: LogLevel, message: string) => {
    const prefix =
      level === "error" ? "[ERROR]" : level === "success" ? "[OK]" : "[INFO]";
    console.log(`${prefix} ${message}`);
  }, []);

  useEffect(() => {
    if (!normalizedWsUrl) return;

    appendLog("info", `กำลังเชื่อมต่อไปยัง ${normalizedWsUrl}`);

    const ws = new WebSocket(normalizedWsUrl);
    wsRef.current = ws;
    setConnectionState("connecting");

    ws.onopen = () => {
      setConnectionState("connected");
      appendLog("success", "เชื่อมต่อกับสถานีชาร์จสำเร็จ");
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingMessage(parsed);
      } catch (error) {
        console.error("ไม่สามารถแปลงข้อความที่ได้รับ:", error);
        appendLog("error", "รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง");
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setConnectionState("error");
      appendLog("error", "การเชื่อมต่อมีปัญหา");
    };

    ws.onclose = () => {
      wsRef.current = null;
      setConnectionState((prev) => (prev === "error" ? prev : "closed"));
      appendLog("info", "การเชื่อมต่อถูกปิด");
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [normalizedWsUrl, appendLog]);

  useEffect(() => {
    if (!sessionStartTime && !chargingData?.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const start = new Date(
      sessionStartTime ?? (chargingData?.startTime as string),
    ).getTime();
    if (Number.isNaN(start)) {
      setElapsedSeconds(0);
      return;
    }

    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime, chargingData?.startTime]);

  const handleIncomingMessage = (message: any) => {
    if (!message || typeof message !== "object") {
      return;
    }

    const { type, data, timestamp } = message;
    switch (type) {
      case "status": {
        setStatus(data as StatusMessagePayload);
        console.log("data", data);
        appendLog("info", data?.message ?? "อัปเดตสถานะเครื่องชาร์จ");
        break;
      }
      case "connectorStatus": {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                status: data?.status ?? prev.status,
                message: data?.message ?? prev.message,
              }
            : data,
        );
        appendLog("info", `หัวชาร์จอยู่ในสถานะ ${data?.status ?? "-"}`);
        break;
      }
      case "charging_data": {
        const payload = data as ChargingDataPayload;
        setChargingData(payload);

        if (payload.startTime) {
          setSessionStartTime(String(payload.startTime));
        }

        if (payload.status) {
          setStatus((prev) =>
            prev
              ? { ...prev, status: payload.status }
              : {
                  chargePointId:
                    params.chargePointIdentity ?? "unknown-chargepoint",
                  connectorId: payload.connectorId,
                  status: payload.status,
                  isOnline: true,
                },
          );
        }

        if (payload.transactionId) {
          setActiveTransactionId(payload.transactionId);
        }

        appendLog("info", "รับข้อมูลการชาร์จล่าสุด");
        break;
      }
      case "heartbeat": {
        setLastHeartbeat(timestamp ?? new Date().toISOString());
        break;
      }
      case "RemoteStartTransaction":
      case "RemoteStartTransactionResponse":
      case "RemoteStopTransaction":
      case "RemoteStopTransactionResponse": {
        const statusText =
          typeof data?.status === "string" ? data.status : undefined;
        const level =
          statusText && statusText.toLowerCase() === "accepted"
            ? "success"
            : "info";
        appendLog(
          level,
          `${type}: ${statusText ?? "สถานะไม่ระบุ"}${
            data?.message ? ` - ${data.message}` : ""
          }`,
        );
        break;
      }
      case "StartTransaction": {
        if (data?.transactionId) {
          setActiveTransactionId(data.transactionId);
          setSessionStartTime(data?.timestamp ?? new Date().toISOString());
          appendLog(
            "success",
            `เริ่มธุรกรรมการชาร์จ Transaction ${data.transactionId}`,
          );
        }
        break;
      }
      case "StopTransaction": {
        if (data?.transactionId) {
          appendLog(
            "success",
            `หยุดธุรกรรมการชาร์จ Transaction ${data.transactionId}`,
          );
        }
        setActiveTransactionId(null);
        setSessionStartTime(null);
        setChargingData((prev) =>
          prev
            ? {
                ...prev,
                currentPower: 0,
                status: "Available",
              }
            : prev,
        );
        break;
      }
      case "error": {
        appendLog("error", data?.message ?? "มีข้อผิดพลาดจากสถานีชาร์จ");
        break;
      }
      default: {
        appendLog("info", `ข้อความประเภท ${type ?? "ไม่ทราบ"} ถูกละไว้`);
      }
    }
  };

  const sendMessage = (payload: Record<string, any>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      appendLog("error", "ยังไม่ได้เชื่อมต่อ WebSocket");
      Alert.alert("ไม่สามารถส่งคำสั่ง", "ยังไม่ได้เชื่อมต่อกับเครื่องชาร์จ");
      return false;
    }

    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error("ไม่สามารถส่งข้อมูลผ่าน WebSocket:", error);
      appendLog("error", "ไม่สามารถส่งคำสั่งได้");
      return false;
    }
  };

  const handleStartCharging = () => {
    if (!connectorId && !chargingData?.connectorId) {
      Alert.alert("ไม่พบหัวชาร์จ", "ไม่สามารถระบุหัวชาร์จได้");
      return;
    }

    const statusKey = (status?.status ?? "").toString().toLowerCase();
    if (!CONNECTOR_READY_STATUSES.has(statusKey)) {
      Alert.alert(
        "ไม่สามารถเริ่มชาร์จได้",
        `หัวชาร์จอยู่ในสถานะ ${status?.status ?? "-"}`,
      );
      return;
    }

    if (!idTag.trim()) {
      Alert.alert("กรุณาระบุ ID Tag", "ต้องระบุ ID Tag เพื่อเริ่มชาร์จ");
      return;
    }

    const payload = {
      type: "RemoteStartTransaction",
      data: {
        connectorId: connectorId ?? chargingData?.connectorId ?? 1,
        idTag: idTag.trim(),
        timestamp: new Date().toISOString(),
      },
    };

    if (sendMessage(payload)) {
      appendLog(
        "info",
        `ส่งคำสั่งเริ่มชาร์จ (Connector ${payload.data.connectorId})`,
      );
    }
  };

  const handleStopCharging = () => {
    const transactionIdToUse =
      activeTransactionId ?? chargingData?.transactionId ?? null;

    if (transactionIdToUse === null || !Number.isFinite(transactionIdToUse)) {
      Alert.alert(
        "ไม่พบธุรกรรม",
        "ระบบยังไม่ได้รับ Transaction ID จากสถานี โปรดลองใหม่อีกครั้ง",
      );
      return;
    }

    const payload = {
      type: "RemoteStopTransaction",
      data: {
        connectorId: connectorId ?? chargingData?.connectorId ?? 1,
        transactionId: Number(transactionIdToUse),
        timestamp: new Date().toISOString(),
      },
    };

    if (sendMessage(payload)) {
      appendLog(
        "info",
        `ส่งคำสั่งหยุดชาร์จ (Transaction ${payload.data.transactionId})`,
      );
    }
  };

  const rawStatus = (chargingData?.status ?? status?.status ?? "") as string;
  const normalizedStatus = rawStatus.toString().toLowerCase();
  
  // Debug logging
  console.log("🔍 Status Debug:", {
    chargingDataStatus: chargingData?.status,
    statusStatus: status?.status,
    rawStatus,
    normalizedStatus,
    connectionState
  });
  
  const statusDisplayText =
    STATUS_TEXT_MAP[normalizedStatus] ??
    (rawStatus ? rawStatus.toString() : "-");
    
  console.log("📱 Display Text:", statusDisplayText);
  const isCharging = CONNECTOR_CHARGING_STATUSES.has(normalizedStatus);

  const isConnectorPlugged =
    CONNECTOR_READY_STATUSES.has(normalizedStatus) ||
    CONNECTOR_CHARGING_STATUSES.has(normalizedStatus);

  const canStartCharging =
    connectionState === "connected" &&
    CONNECTOR_READY_STATUSES.has(normalizedStatus);

  const canStopCharging =
    connectionState === "connected" &&
    (CONNECTOR_CHARGING_STATUSES.has(normalizedStatus) ||
      activeTransactionId !== null);

  useEffect(() => {
    if (isCharging) {
      if (!chargingAnimationRef.current) {
        chargingAnimationRef.current = Animated.loop(
          Animated.parallel([
            Animated.timing(chargingGlow, {
              toValue: 1,
              duration: 2000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(circleScale, {
                toValue: 1.05,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(circleScale, {
                toValue: 1,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ]),
        );
      }
      chargingAnimationRef.current.start();
    } else {
      if (chargingAnimationRef.current) {
        chargingAnimationRef.current.stop();
        chargingAnimationRef.current = null;
      }
      chargingGlow.setValue(0);
      circleScale.setValue(1);
    }

    return () => {
      if (chargingAnimationRef.current) {
        chargingAnimationRef.current.stop();
        chargingAnimationRef.current = null;
      }
      chargingGlow.setValue(0);
      circleScale.setValue(1);
    };
  }, [chargingGlow, circleScale, isCharging]);

  const glowTranslate = chargingGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 320],
  });

  if (!normalizedWsUrl) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Text style={styles.missingWsText}>
          ไม่พบข้อมูล WebSocket URL สำหรับเชื่อมต่อ
        </Text>
        <TouchableOpacity
          style={styles.missingWsButton}
          onPress={() => router.replace("/qr-scanner")}
        >
          <Text style={styles.missingWsButtonText}>กลับไปสแกนใหม่</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const energyDelivered = formatNumber(chargingData?.energyDelivered ?? 5.75, 2); // กำหนดค่าเริ่มต้นเป็น 5.75 kWh
  console.log("🔋 Energy Delivered:", energyDelivered, "Raw:", chargingData?.energyDelivered);
  const currentPower = formatNumber(chargingData?.currentPower ?? 0, 2);
  const estimatedTimeText = formatDuration(
    chargingData?.estimatedRemainingSeconds ?? chargingData?.duration,
  );
  const elapsedLabel = formatDuration(elapsedSeconds);
  const startTimeLabel = formatDateTime(
    sessionStartTime ?? chargingData?.startTime,
  );
  const costValue =
    chargingData?.cost ??
    (baseRate !== undefined && chargingData?.energyDelivered
      ? chargingData.energyDelivered * 4 // คูณด้วย 4 บาทตามที่กำหนด
      : undefined);

  const statusBadgeText =
    connectionState === "connected"
      ? "Connected"
      : connectionState === "connecting"
        ? "Connecting..."
        : "Disconnected";

  const statusBadgeStyle =
    connectionState === "connected"
      ? styles.badgeConnected
      : connectionState === "connecting"
        ? styles.badgeConnecting
        : styles.badgeDisconnected;

  const stationRows: { label: string; value: string }[] = [
    {
      label: "สถานีชาร์จ",
      value:
        params.stationName ??
        params.chargePointName ??
        params.chargePointIdentity ??
        "-",
    },
    {
      label: "ตำแหน่งสถานี",
      value: params.stationLocation ?? "-",
    },
  ];

  // เพิ่มข้อมูลพลังงานที่ได้รับเฉพาะเมื่อเริ่มชาร์จแล้ว
  if (isCharging || activeTransactionId) {
    stationRows.push({
      label: "พลังงานที่ได้รับ",
      value: `${energyDelivered} kWh`,
    });
  }

  if (params.chargePointBrand) {
    stationRows.splice(1, 0, {
      label: "อุปกรณ์",
      value: params.chargePointBrand,
    });
  }

  if (params.protocol) {
    stationRows.splice(
      params.chargePointBrand ? 2 : 1,
      0,
      {
        label: "โปรโตคอล",
        value: params.protocol,
      },
    );
  }

  const powerLabel = useMemo(() => {
    if (!params.powerRating) return params.protocol ?? "ข้อมูลเครื่องชาร์จ";
    const powerValue = Number(params.powerRating);
    if (Number.isFinite(powerValue)) {
      return `${powerValue >= 50 ? "DC" : "AC"} ${powerValue.toFixed(0)} kW`;
    }
    return params.powerRating;
  }, [params.powerRating, params.protocol]);

  const rateLabel = baseRate
    ? `${baseRate.toFixed(2)} ${params.currency ?? "บาท"}/kWh`
    : "ไม่ระบุอัตราค่าบริการ";

  const headerSubtitle =
    params.pricingTierName ??
    `อัตราค่าบริการ ${rateLabel.replace("ไม่ระบุอัตราค่าบริการ", "-")}`;

  const helperText = (() => {
    if (connectionState !== "connected") {
      return "กำลังเชื่อมต่อกับสถานี...";
    }
    if (CONNECTOR_AVAILABLE_STATUSES.has(normalizedStatus) || !isConnectorPlugged) {
      return "กรุณาเสียบปลั๊กเพื่อชาร์จ";
    }
    if (CONNECTOR_CHARGING_STATUSES.has(normalizedStatus)) {
      return "กำลังชาร์จอยู่ในขณะนี้";
    }
    if (normalizedStatus === "faulted") {
      return "หัวชาร์จมีปัญหา กรุณาติดต่อเจ้าหน้าที่";
    }
    return null;
  })();

  const primaryButtonLabel = canStartCharging
    ? "เริ่มชาร์จ"
    : CONNECTOR_AVAILABLE_STATUSES.has(normalizedStatus) || !isConnectorPlugged
      ? "กรุณาเสียบปลั๊กเพื่อสั่งชาร์จ"
      : "ไม่พร้อมใช้งาน";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เริ่มชาร์จ</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          {/* แสดงพลังงานเฉพาะเมื่อเริ่มชาร์จแล้ว */}
          {isCharging || activeTransactionId ? (
            <Text style={styles.energyText}>{energyDelivered} kWh</Text>
          ) : (
            <Text style={styles.energyText}>-- kWh</Text>
          )}
          <Text style={styles.statusSubText}>
            {connectionState === "connected"
              ? statusDisplayText
              : connectionState === "connecting"
                ? "กำลังเชื่อมต่อ..."
                : "ยังไม่พร้อมใช้งาน"}
          </Text>

      

          {/* แสดงเปอร์เซ็นต์และ progress bar เฉพาะเมื่อเริ่มชาร์จแล้ว */}
          {(isCharging || activeTransactionId) && chargingData?.chargingPercentage != null && (
            <View style={styles.progressWrapper}>
              <Animated.View style={[styles.percentageCircle, { transform: [{ scale: circleScale }] }]}>
                <Text style={styles.percentageText}>
                  {chargingData.chargingPercentage.toFixed(1)}%
                </Text>
              </Animated.View>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        Math.max(chargingData.chargingPercentage, 0),
                        100,
                      )}%`,
                    },
                  ]}
                >
                  {isCharging && (
                    <Animated.View
                      style={[
                        styles.progressPulse,
                        {
                          opacity: chargingGlow,
                        },
                      ]}
                    />
                  )}
                </Animated.View>
              </View>
              <Text style={styles.progressLabel}>
                ระดับการชาร์จ
              </Text>
            </View>
          )}
        </View>

        <View style={styles.illustrationCard}>
          <LinearGradient
            colors={["rgba(28, 34, 68, 0.95)", "rgba(12, 196, 108, 0.7)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.illustrationGradient}
          >
            <Ionicons name="car-sport-outline" size={80} color="#FFFFFF" />
            <Ionicons name="flash" size={36} color="#FFFFFF" />
            <Ionicons name="hardware-chip-outline" size={34} color="white" />
            {isCharging && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.chargingGlow,
                  {
                    transform: [{ translateX: glowTranslate }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0)",
                    "rgba(12,196,108,0.8)",
                    "rgba(255,255,255,0)",
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.chargingGlowGradient}
                />
              </Animated.View>
            )}
          </LinearGradient>
        </View>

        <View style={styles.stationCard}>
          <View style={styles.stationHeader}>
            <View style={styles.stationHeaderIcon}>
              <Ionicons name="flash" size={20} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.stationHeaderTitle}>{powerLabel}</Text>
              <Text style={styles.stationHeaderSubtitle}>{headerSubtitle}</Text>
            </View>
            <View style={[styles.statusBadge, statusBadgeStyle]}>
              <Text style={styles.statusBadgeText}>{statusBadgeText}</Text>
            </View>
          </View>
          <View style={styles.stationBody}>
            {stationRows.map((row) => (
              <View key={row.label} style={styles.stationRow}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.controlsCard}>
          <Text style={styles.controlsTitle}>ควบคุมการชาร์จ</Text>
          <Text style={styles.helperBadge}>
            สถานะหัวชาร์จปัจจุบัน: {statusDisplayText}
          </Text>

          <Text style={styles.inputLabel}>ID Tag</Text>
          <TextInput
            value={idTag}
            onChangeText={setIdTag}
            placeholder="เช่น EV-USER-001"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.textInput}
          />

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              disabled={!canStartCharging}
              activeOpacity={0.8}
              onPress={handleStartCharging}
              style={[
                styles.primaryButtonWrapper,
                !canStartCharging && styles.primaryButtonDisabledWrapper,
              ]}
            >
              {canStartCharging ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.primaryButton, styles.primaryButtonDisabled]}>
                  <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
                </View>
              )}
            </TouchableOpacity>

            {canStopCharging && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleStopCharging}
              >
                <Text style={styles.secondaryButtonText}>หยุดชาร์จ</Text>
              </TouchableOpacity>
            )}
          </View>

          {helperText && (
            <Text style={styles.helperText}>{helperText}</Text>
          )}
        </View>

        {lastHeartbeat && (
          <Text style={styles.heartbeatText}>
            Heartbeat ล่าสุด: {formatDateTime(lastHeartbeat)}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  missingWsText: {
    color: COLORS.primary,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  missingWsButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  missingWsButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(29,33,68,0.15)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.primary,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  energyText: {
    fontSize: 32,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statusSubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    width: "100%",
    marginVertical: 12,
  },
  subStatsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  subStat: {
    flex: 1,
  },
  subStatLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  subStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 4,
  },
  progressWrapper: {
    width: "100%",
    marginTop: 18,
    alignItems: "center",
  },
  percentageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(12, 196, 108, 0.1)",
    borderWidth: 3,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    position: "relative",
  },
  percentageText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressTrack: {
    width: "100%",
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(29,33,68,0.1)",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    position: "relative",
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  progressPulse: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 8,
    shadowColor: "rgba(255, 255, 255, 0.8)",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  illustrationCard: {
    marginTop: 24,
    marginHorizontal: 8, // ลดระยะห่างจากขอบ
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  illustrationGradient: {
    width: "100%",
    maxHeight: 200,
    aspectRatio: 2.2, // เพิ่มอัตราส่วนให้กว้างขึ้น
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "space-evenly",
    flexDirection: "row",
    paddingHorizontal: 32, // เพิ่ม padding แนวนอน
    paddingVertical: 24,
  },
  chargingGlow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 140,
    opacity: 0.7,
  },
  chargingGlowGradient: {
    flex: 1,
  },
  stationCard: {
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: "hidden",
  },
  stationHeader: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  stationHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stationHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  stationHeaderSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  statusBadge: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeConnected: {
    backgroundColor: "rgba(12,196,108,0.18)",
  },
  badgeConnecting: {
    backgroundColor: "rgba(255,193,7,0.22)",
  },
  badgeDisconnected: {
    backgroundColor: "rgba(220,53,69,0.18)",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  stationBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stationRow: {
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rowValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  controlsCard: {
    marginTop: 24,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  helperBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(29,33,68,0.06)",
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  fieldSpacing: {
    marginTop: 16,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(29,33,68,0.1)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  buttonsRow: {
    marginTop: 24,
  },
  primaryButtonWrapper: {
    width: "100%",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonDisabledWrapper: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(29,33,68,0.15)",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  helperText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.primary,
  },
  heartbeatText: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
