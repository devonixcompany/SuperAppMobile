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
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  glowPurple: "#B84FFF",
  glowGreen: "#0CC46C",
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

  // เพิ่ม animations ใหม่สำหรับ effects
  const particleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowIntensity = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

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
        const payload = (data ?? {}) as Partial<StatusMessagePayload>;
        setStatus((prev) => {
          if (prev) {
            const statusValue =
              typeof payload.status === "string"
                ? payload.status
                : prev.status;
            const updated: StatusMessagePayload = {
              ...prev,
              status: statusValue,
              message: payload.message ?? prev.message,
              isOnline: payload.isOnline ?? prev.isOnline,
            };
            return updated;
          }

          if (typeof payload.status !== "string") {
            return prev;
          }

          const resolvedConnectorId =
            payload.connectorId ??
            connectorId ??
            (params.connectorId ? Number(params.connectorId) : 0);

          const created: StatusMessagePayload = {
            chargePointId:
              payload.chargePointId ??
              params.chargePointIdentity ??
              "unknown-chargepoint",
            connectorId: resolvedConnectorId,
            status: payload.status,
            isOnline: payload.isOnline ?? true,
            message: payload.message,
          };

          return created;
        });
        appendLog("info", `หัวชาร์จอยู่ในสถานะ ${payload.status ?? "-"}`);
        break;
      }
      case "charging_data": {
        const payload = data as ChargingDataPayload;
        setChargingData(payload);

        if (payload.startTime) {
          setSessionStartTime(String(payload.startTime));
        }

        if (payload.status) {
          const statusValue = payload.status;
          setStatus((prev) =>
            prev
              ? { ...prev, status: statusValue }
              : {
                  chargePointId:
                    params.chargePointIdentity ?? "unknown-chargepoint",
                  connectorId: payload.connectorId,
                  status: statusValue,
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

      // เริ่ม animations พิเศษ
      Animated.loop(
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowIntensity, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowIntensity, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

    } else {
      if (chargingAnimationRef.current) {
        chargingAnimationRef.current.stop();
        chargingAnimationRef.current = null;
      }
      chargingGlow.setValue(0);
      circleScale.setValue(1);
      particleAnim.setValue(0);
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
      glowIntensity.setValue(0);
      floatAnim.setValue(0);
    }

    return () => {
      if (chargingAnimationRef.current) {
        chargingAnimationRef.current.stop();
        chargingAnimationRef.current = null;
      }
      chargingGlow.setValue(0);
      circleScale.setValue(1);
    };
  }, [chargingGlow, circleScale, isCharging, particleAnim, pulseAnim, rotateAnim, glowIntensity, floatAnim]);

  const glowTranslate = chargingGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 320],
  });

  const particleY = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const particleOpacity = particleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
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
      {/* Background with animated gradients */}
      <LinearGradient
        colors={['#0A0E27', '#1a1f3a', '#0A0E27']}
        style={styles.backgroundGradient}
      >
        {/* Animated background particles */}
        {isCharging && (
          <>
            {[...Array(6)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.backgroundParticle,
                  {
                    left: `${(i * 20 + 10)}%`,
                    opacity: particleOpacity,
                    transform: [
                      { translateY: particleY },
                      { scale: pulseAnim }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={[COLORS.glow, COLORS.glowPurple, COLORS.glowGreen]}
                  style={styles.particleGradient}
                />
              </Animated.View>
            ))}
          </>
        )}
      </LinearGradient>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เริ่มชาร์จ</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main charging display card */}
        <Animated.View style={[
          styles.statusCard,
          isCharging && {
            transform: [{ translateY: floatY }]
          }
        ]}>
          <LinearGradient
            colors={isCharging
              ? ['rgba(0, 229, 255, 0.15)', 'rgba(184, 79, 255, 0.15)', 'rgba(12, 196, 108, 0.15)']
              : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusCardGradient}
          >
            {isCharging && (
              <Animated.View style={[styles.glowRing, {
                opacity: glowIntensity,
                transform: [{ scale: pulseAnim }]
              }]}>
                <LinearGradient
                  colors={[COLORS.glow, 'transparent']}
                  style={styles.glowRingGradient}
                />
              </Animated.View>
            )}

            {/* Energy display with enhanced styling */}
            <View style={styles.energyDisplayContainer}>
              {isCharging || activeTransactionId ? (
                <Animated.Text style={[
                  styles.energyText,
                  isCharging && {
                    textShadowColor: COLORS.glow,
                    textShadowRadius: 20,
                    textShadowOffset: { width: 0, height: 0 }
                  }
                ]}>
                  {energyDelivered}
                  <Text style={styles.energyUnit}> kWh</Text>
                </Animated.Text>
              ) : (
                <Text style={styles.energyText}>
                  --
                  <Text style={styles.energyUnit}> kWh</Text>
                </Text>
              )}
            </View>

            <Text style={styles.statusSubText}>
              {connectionState === "connected"
                ? statusDisplayText
                : connectionState === "connecting"
                  ? "กำลังเชื่อมต่อ..."
                  : "ยังไม่พร้อมใช้งาน"}
            </Text>

            {/* Enhanced progress display */}
            {(isCharging || activeTransactionId) && chargingData?.chargingPercentage != null && (
              <View style={styles.progressWrapper}>
                <Animated.View style={[
                  styles.percentageCircle,
                  { transform: [{ scale: circleScale }, { rotate: rotateInterpolate }] }
                ]}>
                  {isCharging && (
                    <Animated.View style={[styles.circleGlow, {
                      opacity: glowIntensity
                    }]}>
                      <LinearGradient
                        colors={[COLORS.glow, COLORS.glowPurple, COLORS.glowGreen]}
                        style={styles.circleGlowGradient}
                      />
                    </Animated.View>
                  )}
                  <View style={styles.percentageInner}>
                    <Ionicons name="flash" size={32} color={COLORS.glowGreen} />
                    <Text style={styles.percentageText}>
                      {chargingData.chargingPercentage.toFixed(1)}%
                    </Text>
                  </View>
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
                    <LinearGradient
                      colors={[COLORS.glow, COLORS.glowGreen]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.progressGradient}
                    />
                    {isCharging && (
                      <Animated.View
                        style={[
                          styles.progressPulse,
                          {
                            opacity: chargingGlow,
                            transform: [{ translateX: glowTranslate }]
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
          </LinearGradient>
        </Animated.View>

        {/* Enhanced illustration card */}
        <Animated.View style={[
          styles.illustrationCard,
          isCharging && {
            transform: [{ scale: pulseAnim }]
          }
        ]}>
          <LinearGradient
            colors={isCharging
              ? ['rgba(0, 229, 255, 0.25)', 'rgba(184, 79, 255, 0.25)', 'rgba(12, 196, 108, 0.25)']
              : ['rgba(28, 34, 68, 0.95)', 'rgba(12, 196, 108, 0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.illustrationGradient}
          >
            {/* Rotating ring effect */}
            {isCharging && (
              <Animated.View style={[
                styles.rotatingRing,
                { transform: [{ rotate: rotateInterpolate }] }
              ]}>
                <LinearGradient
                  colors={['transparent', COLORS.glow, 'transparent']}
                  style={styles.rotatingRingGradient}
                />
              </Animated.View>
            )}

            <Animated.View style={[
              styles.illustrationContent,
              isCharging && {
                transform: [{ translateY: floatY }]
              }
            ]}>
              <Ionicons name="car-sport-outline" size={80} color="#FFFFFF" />
              <Animated.View style={[
                styles.flashIcon,
                isCharging && {
                  opacity: glowIntensity,
                  transform: [{ scale: pulseAnim }]
                }
              ]}>
                <Ionicons name="flash" size={36} color={COLORS.glowGreen} />
              </Animated.View>
              <Ionicons name="hardware-chip-outline" size={34} color="white" />
            </Animated.View>

            {isCharging && (
              <>
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
                      "rgba(0, 229, 255, 0.8)",
                      "rgba(255,255,255,0)",
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.chargingGlowGradient}
                  />
                </Animated.View>

                {/* Energy sparks */}
                {[...Array(3)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.energySpark,
                      {
                        left: `${30 + i * 20}%`,
                        opacity: particleOpacity,
                        transform: [{ translateY: particleY }]
                      }
                    ]}
                  >
                    <Ionicons name="flash" size={16} color={COLORS.glow} />
                  </Animated.View>
                ))}
              </>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Enhanced station card */}
        <View style={styles.stationCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
            style={styles.stationCardGradient}
          >
            <View style={styles.stationHeader}>
              <LinearGradient
                colors={[COLORS.glow, COLORS.glowGreen]}
                style={styles.stationHeaderIcon}
              >
                <Ionicons name="flash" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.stationHeaderTextContainer}>
                <Text style={styles.stationHeaderTitle}>{powerLabel}</Text>
                <Text style={styles.stationHeaderSubtitle}>{headerSubtitle}</Text>
              </View>
              <View style={[styles.statusBadge, statusBadgeStyle]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>{statusBadgeText}</Text>
              </View>
            </View>
            <View style={styles.stationBody}>
              {stationRows.map((row, index) => (
                <View key={row.label} style={styles.stationRow}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                  {index < stationRows.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Enhanced controls card */}
        <View style={styles.controlsCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
            style={styles.controlsCardGradient}
          >
            <Text style={styles.controlsTitle}>ควบคุมการชาร์จ</Text>
            <View style={styles.helperBadge}>
              <Ionicons name="information-circle" size={16} color={COLORS.glow} />
              <Text style={styles.helperBadgeText}>
                สถานะ: {statusDisplayText}
              </Text>
            </View>

            <Text style={styles.inputLabel}>ID Tag</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-circle-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                value={idTag}
                onChangeText={setIdTag}
                placeholder="เช่น EV-USER-001"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.textInput}
              />
            </View>

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
                    colors={[COLORS.glow, COLORS.glowGreen]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.primaryButton}
                  >
                    <Ionicons name="flash" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.primaryButton, styles.primaryButtonDisabled]}>
                    <Ionicons name="flash-off" size={20} color="rgba(255, 255, 255, 0.5)" />
                    <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {canStopCharging && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleStopCharging}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(220, 53, 69, 0.2)', 'rgba(220, 53, 69, 0.1)']}
                    style={styles.secondaryButtonGradient}
                  >
                    <Ionicons name="stop-circle-outline" size={20} color="#DC3545" />
                    <Text style={styles.secondaryButtonText}>หยุดชาร์จ</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {helperText && (
              <View style={styles.helperTextContainer}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.glow} />
                <Text style={styles.helperText}>{helperText}</Text>
              </View>
            )}
          </LinearGradient>
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    bottom: '20%',
  },
  particleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  missingWsText: {
    color: COLORS.textPrimary,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  missingWsButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.glow,
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
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textPrimary,
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
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.glow,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  statusCardGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  glowRingGradient: {
    flex: 1,
    borderRadius: 24,
  },
  energyDisplayContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  energyText: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  energyUnit: {
    fontSize: 24,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  statusSubText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    width: "100%",
    marginVertical: 12,
  },
  progressWrapper: {
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  percentageCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
    overflow: 'visible',
  },
  circleGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -10,
    left: -10,
  },
  circleGlowGradient: {
    flex: 1,
    borderRadius: 80,
  },
  percentageInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 3,
    borderColor: COLORS.glowGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.glowGreen,
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  percentageText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  progressTrack: {
    width: "100%",
    height: 18,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: "100%",
    borderRadius: 12,
    position: "relative",
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  progressPulse: {
    position: "absolute",
    top: 0,
    width: 100,
    height: '100%',
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  illustrationCard: {
    marginTop: 24,
    marginHorizontal: 0,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: COLORS.glowPurple,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  illustrationGradient: {
    width: "100%",
    minHeight: 200,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 32,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rotatingRing: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rotatingRingGradient: {
    flex: 1,
    borderRadius: 999,
  },
  illustrationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    width: '100%',
    zIndex: 1,
  },
  flashIcon: {
    padding: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(12, 196, 108, 0.2)',
  },
  chargingGlow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
    opacity: 0.8,
  },
  chargingGlowGradient: {
    flex: 1,
  },
  energySpark: {
    position: 'absolute',
    bottom: '30%',
  },
  stationCard: {
    marginTop: 24,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: COLORS.glow,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  stationCardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stationHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  stationHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: COLORS.glow,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  stationHeaderTextContainer: {
    flex: 1,
  },
  stationHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  stationHeaderSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  badgeConnected: {
    backgroundColor: "rgba(12,196,108,0.25)",
  },
  badgeConnecting: {
    backgroundColor: "rgba(255,193,7,0.25)",
  },
  badgeDisconnected: {
    backgroundColor: "rgba(220,53,69,0.25)",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stationBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stationRow: {
    marginBottom: 16,
    position: 'relative',
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
  },
  controlsCard: {
    marginTop: 24,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: COLORS.glowPurple,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  controlsCardGradient: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  helperBadge: {
    alignSelf: "flex-start",
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0, 229, 255, 0.1)",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  helperBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  buttonsRow: {
    marginTop: 24,
  },
  primaryButtonWrapper: {
    width: "100%",
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.glow,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryButtonDisabledWrapper: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 14,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: "rgba(220, 53, 69, 0.5)",
  },
  secondaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryButtonText: {
    color: "#DC3545",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  helperTextContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  heartbeatText: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
