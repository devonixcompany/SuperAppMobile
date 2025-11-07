import env from "@/config/env";
import { transactionService } from "@/services/api";
import { getCredentials } from "@/utils/keychain";
import { normalizeWebSocketUrlToDevice } from "@/utils/network";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
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

type TransactionSummaryPayload = {
  transactionId: string;
  chargePointIdentity?: string | null;
  connectorNumber?: number | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  totalEnergy: number | null;
  meterStart: number | null;
  meterStop: number | null;
  totalCost: number | null;
  appliedRate: number | null;
  stopReason?: string | null;
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
  "suspended_ev",
  "suspended_evse",
  "occupied",
  "finishing",
]);
const CONNECTOR_CHARGING_STATUSES = new Set(["charging"]);
const CONNECTOR_AVAILABLE_STATUSES = new Set(["available"]);

const STATUS_TEXT_MAP: Record<string, string> = {
  available: "พร้อมใช้งาน",
  preparing: "กำลังเตรียม",
  suspended_ev: "ชาร์จเต็มเเล้ว",
  suspended_evse: "พักจากสถานี",
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

  // คำนวณข้อความกำลังไฟด้วย useMemo เพื่อป้องกันการคำนวณซ้ำในทุกการ render
  const powerLabel = useMemo(() => {
    if (!params.powerRating) {
      return params.protocol ?? "ข้อมูลเครื่องชาร์จ";
    }

    const powerValue = Number(params.powerRating);
    if (Number.isFinite(powerValue)) {
      const powerType = powerValue >= 50 ? "DC" : "AC";
      return `${powerType} ${powerValue.toFixed(0)} kW`;
    }

    return params.powerRating;
  }, [params.powerRating, params.protocol]);

  const wsRef = useRef<WebSocket | null>(null);
  const lastSummaryAttemptRef = useRef<{ id: string | null; timestamp: number }>({
    id: null,
    timestamp: 0,
  });
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
  const [activeTransactionId, setActiveTransactionId] = useState<number | null>(
    null,
  );
  const [idTag, setIdTag] = useState("");
  const [backendTransactionId, setBackendTransactionId] = useState<string | null>(null);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummaryPayload | null>(null);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const [hasFetchedSummary, setHasFetchedSummary] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasNavigatedToSummary, setHasNavigatedToSummary] = useState(false);
  const [hasReceivedStopEvent, setHasReceivedStopEvent] = useState(false);

  const appendLog = useCallback((level: LogLevel, message: string) => {
    const prefix =
      level === "error" ? "[ERROR]" : level === "success" ? "[OK]" : "[INFO]";
    console.log(`${prefix} ${message}`);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const credentials = await getCredentials();
        if (isMounted && credentials?.id) {
          setUserId(credentials.id);
        }
      } catch (error) {
        console.error("ไม่สามารถดึงข้อมูลผู้ใช้จาก Keychain:", error);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
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
      console.log("📦 Raw WS message:", event.data);
      try {
        const parsed = JSON.parse(event.data);
        console.log("🧾 Parsed WS message:", parsed);
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
      setActiveTransactionId(null);
      setBackendTransactionId(null);
      setIdTag("");
      setSessionStartTime(null);
      setIsCreatingTransaction(false);
      setTransactionSummary(null);
      setHasFetchedSummary(false);
      setIsFetchingSummary(false);
      setHasNavigatedToSummary(false);
      setHasReceivedStopEvent(false);
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

  const fetchTransactionSummary = useCallback(
    async (transactionId: string | null | undefined, force: boolean = false) => {
      if (!transactionId || (!force && (hasFetchedSummary || isFetchingSummary))) {
        return;
      }

      if (!force) {
        const lastAttempt = lastSummaryAttemptRef.current;
        if (
          lastAttempt.id === transactionId &&
          Date.now() - lastAttempt.timestamp < 5000
        ) {
          return;
        }
      }

      lastSummaryAttemptRef.current = {
        id: transactionId,
        timestamp: Date.now(),
      };
      setHasReceivedStopEvent(true);

      try {
        setIsFetchingSummary(true);
        appendLog("info", `กำลังดึงสรุปธุรกรรม ${transactionId}`);

        const response = await transactionService.getTransactionSummary(transactionId);
        console.log("📊 [FETCH SUMMARY] Raw response:", response);
        console.log("📊 [FETCH SUMMARY] Response data:", response.data);

        if (!response.success || !response.data) {
          appendLog("error", "ไม่สามารถดึงข้อมูลสรุปธุรกรรมได้");
          return;
        }

        const summary = response.data;
        console.log("📊 [FETCH SUMMARY] Summary object:", {
          transactionId: summary.transactionId,
          totalEnergy: summary.totalEnergy,
          totalCost: summary.totalCost,
          appliedRate: summary.appliedRate,
          meterStart: summary.meterStart,
          meterStop: summary.meterStop,
        });
        setTransactionSummary(summary);
        setHasFetchedSummary(true);
        appendLog("success", "ดึงข้อมูลสรุปธุรกรรมสำเร็จ");

        setChargingData((previous) => {
          const energy = summary.totalEnergy ?? previous?.energyDelivered ?? null;

          let computedCost: number | undefined | null = summary.totalCost ?? null;
          if (computedCost == null) {
            if (previous?.cost != null) {
              computedCost = previous.cost;
            } else if (energy != null && baseRate !== undefined) {
              computedCost = energy * baseRate;
            }
          }

          const parsedTransactionIdCandidate = Number(summary.transactionId);
          const parsedTransactionId = Number.isFinite(parsedTransactionIdCandidate)
            ? parsedTransactionIdCandidate
            : previous?.transactionId;

          if (!previous) {
            return {
              connectorId: connectorId ?? summary.connectorNumber ?? 1,
              status: 'Finishing',
              energyDelivered: energy ?? undefined,
              cost: computedCost ?? undefined,
              transactionId: parsedTransactionId ?? undefined,
            };
          }

          return {
            ...previous,
            energyDelivered: energy ?? previous.energyDelivered,
            cost: computedCost ?? previous.cost,
            transactionId: parsedTransactionId ?? previous.transactionId,
            status: previous.status ?? 'Finishing',
          };
        });
      } catch (error: any) {
        console.error("ไม่สามารถดึงสรุปธุรกรรมได้:", error);
        appendLog(
          "error",
          error?.message ?? "ไม่สามารถดึงข้อมูลสรุปธุรกรรมได้ กรุณาลองอีกครั้ง",
        );
        setHasFetchedSummary(false);
        setHasNavigatedToSummary(false);
      } finally {
        setIsFetchingSummary(false);
      }
    },
    [appendLog, baseRate, connectorId, hasFetchedSummary, isFetchingSummary],
  );

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
        
        // ตรวจสอบว่าการชาร์จเสร็จสิ้นแล้วหรือไม่
        if (data?.status) {
          const normalizedConnectorStatus = data.status.toLowerCase()
            .replace("suspendedevse", "suspended_evse")
            .replace("suspendedev", "suspended_ev");
          
          if (normalizedConnectorStatus === "suspended_ev" || 
              normalizedConnectorStatus === "suspended_evse" ||
              normalizedConnectorStatus === "finishing") {
            console.log("🏁 [CONNECTOR] Charging completed detected from connectorStatus:", normalizedConnectorStatus);
            setHasReceivedStopEvent(true);
          }
        }
        
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

        // ตรวจสอบว่าการชาร์จเสร็จสิ้นแล้วหรือไม่
        if (payload.status) {
          const normalizedPayloadStatus = payload.status.toLowerCase()
            .replace("suspendedevse", "suspended_evse")
            .replace("suspendedev", "suspended_ev");
          
          if (normalizedPayloadStatus === "suspended_ev" || 
              normalizedPayloadStatus === "suspended_evse" ||
              normalizedPayloadStatus === "finishing") {
            console.log("🏁 [CHARGING] Charging completed detected from charging_data:", normalizedPayloadStatus);
            setHasReceivedStopEvent(true);
          }
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
        if (data?.idTag) {
          const idTagValue = String(data.idTag);
          setBackendTransactionId(idTagValue);
          setIdTag(idTagValue);
        }
        setTransactionSummary(null);
        setHasFetchedSummary(false);
        setIsFetchingSummary(false);
        setIsCreatingTransaction(false);
        setHasReceivedStopEvent(false);
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
                status: "Finishing",
              }
            : {
                connectorId:
                  typeof data?.connectorId === "number"
                    ? data.connectorId
                    : connectorId ?? 1,
                status: "Finishing",
                currentPower: 0,
              },
        );
        setStatus((previous) =>
          previous
            ? { ...previous, status: "Finishing" }
            : {
                chargePointId: params.chargePointIdentity ?? "unknown-chargepoint",
                connectorId:
                  typeof data?.connectorId === "number"
                    ? data.connectorId
                    : connectorId ?? 1,
                status: "Finishing",
                isOnline: true,
              },
        );
        const stopIdTag = data?.idTag
          ? String(data.idTag)
          : backendTransactionId ?? (data?.transactionId ? String(data.transactionId) : null);

        if (stopIdTag) {
          setBackendTransactionId(stopIdTag);
          setIdTag(stopIdTag);
          setHasFetchedSummary(false);
          setTransactionSummary(null);
          setHasNavigatedToSummary(false);
          void fetchTransactionSummary(stopIdTag, true);
        } else {
          setHasFetchedSummary(false);
          setHasNavigatedToSummary(false);
        }
        setIsCreatingTransaction(false);
        setHasReceivedStopEvent(true);
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

  const handleStartCharging = async () => {
    if (isCreatingTransaction) {
      appendLog("info", "ระบบกำลังเตรียมคำสั่งเริ่มชาร์จอยู่แล้ว");
      return;
    }

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

    const chargePointIdentity = params.chargePointIdentity;
    if (!chargePointIdentity) {
      Alert.alert(
        "ข้อมูลไม่ครบ",
        "ไม่สามารถระบุรหัสเครื่องชาร์จได้ กรุณากลับไปหน้าเดิมแล้วลองใหม่",
      );
      return;
    }

    const connectorToUse =
      connectorId ?? chargingData?.connectorId ?? 1;

    try {
      setIsCreatingTransaction(true);
      setHasReceivedStopEvent(false);

      let transactionIdToUse = backendTransactionId;

      if (!transactionIdToUse) {
        let resolvedUserId = userId;

        if (!resolvedUserId) {
          const credentials = await getCredentials();
          resolvedUserId = credentials?.id ?? null;
          if (resolvedUserId) {
            setUserId(resolvedUserId);
          }
        }

        if (!resolvedUserId) {
          throw new Error("ไม่สามารถระบุผู้ใช้งานเพื่อสร้างธุรกรรมได้");
        }

        const response = await transactionService.createTransaction({
          chargePointIdentity,
          connectorId: connectorToUse,
          userId: resolvedUserId,
        });
        console.log("respone crate transaction", response.data);
        if (!response.success || !response.data?.transactionId) {
          throw new Error(
            response.message ?? "ไม่สามารถสร้างธุรกรรมใหม่ได้",
          );
        }

        transactionIdToUse = String(response.data.transactionId);
        setBackendTransactionId(transactionIdToUse);
        setIdTag(transactionIdToUse);
        appendLog(
          "info",
          `สร้างธุรกรรมใหม่จาก Backend: ${transactionIdToUse}`,
        );
      }

      if (!transactionIdToUse) {
        throw new Error("ระบบไม่พบรหัสธุรกรรมสำหรับเริ่มชาร์จ");
      }

      setHasNavigatedToSummary(false);
      setTransactionSummary(null);
      setHasFetchedSummary(false);
      setIsFetchingSummary(false);

      const payload = {
        type: "RemoteStartTransaction",
        data: {
          connectorId: connectorToUse,
          idTag: transactionIdToUse,
          timestamp: new Date().toISOString(),
        },
      };

      if (sendMessage(payload)) {
        appendLog(
          "info",
          `ส่งคำสั่งเริ่มชาร์จ (Connector ${connectorToUse}) ด้วย Transaction ${transactionIdToUse}`,
        );
      }
    } catch (error: any) {
      console.error("ไม่สามารถเริ่มชาร์จได้:", error);
      const message =
        typeof error?.message === "string"
          ? error.message
          : "ไม่สามารถเริ่มชาร์จได้ กรุณาลองใหม่อีกครั้ง";
      Alert.alert("ไม่สามารถเริ่มชาร์จได้", message);
      appendLog("error", message);
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handleStopCharging = () => {
    const backendTransactionNumeric =
      backendTransactionId !== null
        ? Number(backendTransactionId)
        : null;

    const normalizedBackendTransaction =
      typeof backendTransactionNumeric === "number" &&
      Number.isFinite(backendTransactionNumeric)
        ? backendTransactionNumeric
        : null;

    const transactionIdToUse =
      activeTransactionId ??
      chargingData?.transactionId ??
      normalizedBackendTransaction;

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
  const normalizedStatus = rawStatus
    .toString()
    .toLowerCase()
    .replace("suspendedevse", "suspended_evse")
    .replace("suspendedev", "suspended_ev");
  
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
      activeTransactionId !== null ||
      backendTransactionId !== null);

  // คำนวณค่าพลังงานและค่าใช้จ่าย (ย้ายมาไว้ก่อน useEffect เพื่อใช้ใน navigation)
  const energyKWh = transactionSummary?.totalEnergy ?? chargingData?.energyDelivered;

  const costEstimate = (() => {
    // ใช้ appliedRate จาก backend เป็น fallback ถ้า baseRate ไม่มี
    const effectiveRate = baseRate ?? transactionSummary?.appliedRate;

    console.log("💰 [COST DEBUG]", {
      summaryTotalCost: transactionSummary?.totalCost,
      chargingDataCost: chargingData?.cost,
      energyKWh,
      baseRate,
      appliedRate: transactionSummary?.appliedRate,
      effectiveRate,
    });

    // ลำดับความสำคัญในการหาค่า cost:
    // 1. ใช้ totalCost จาก backend (ถ้ามี)
    if (transactionSummary?.totalCost != null) {
      console.log("💰 Using transactionSummary.totalCost:", transactionSummary.totalCost);
      return transactionSummary.totalCost;
    }

    // 2. ใช้ cost จาก WebSocket (ถ้ามี)
    if (chargingData?.cost != null) {
      console.log("💰 Using chargingData.cost:", chargingData.cost);
      return chargingData.cost;
    }

    // 3. คำนวณจาก energyKWh * rate (ใช้ effectiveRate ที่อาจมาจาก baseRate หรือ appliedRate)
    if (energyKWh != null && effectiveRate !== undefined) {
      const calculated = energyKWh * effectiveRate;
      const rateSource = baseRate !== undefined ? "baseRate" : "appliedRate";
      console.log(`💰 Calculated cost: ${calculated} = ${energyKWh} * ${effectiveRate} (from ${rateSource})`);
      return calculated;
    }

    console.log("💰 No cost available, returning undefined");
    return undefined;
  })();

  useEffect(() => {
    const isFinalizedStatus =
      normalizedStatus === "finishing" ||
      normalizedStatus === "suspended_ev" ||
      normalizedStatus === "suspended_evse" ||
      normalizedStatus === "available";

    const summaryCandidateId =
      backendTransactionId ??
      (isFinalizedStatus && activeTransactionId != null
        ? String(activeTransactionId)
        : null);

    const shouldFetchSummary =
      hasReceivedStopEvent &&
      !!summaryCandidateId &&
      (!activeTransactionId || isFinalizedStatus) &&
      !transactionSummary &&
      !hasFetchedSummary &&
      !isFetchingSummary;

    // เพิ่มการตรวจสอบสำหรับสถานะที่ควร fetch summary ทันที
    const shouldFetchSummaryByStatus = 
      !!summaryCandidateId &&
      (normalizedStatus === "suspended_ev" || 
       normalizedStatus === "suspended_evse" || 
       normalizedStatus === "finishing") &&
      !transactionSummary &&
      !hasFetchedSummary &&
      !isFetchingSummary;

    console.log("🔍 Summary Fetch Debug:", {
      backendTransactionId,
      activeTransactionId,
      summaryCandidateId,
      transactionSummary: !!transactionSummary,
      hasFetchedSummary,
      isFetchingSummary,
      normalizedStatus,
      isFinalizedStatus,
      hasReceivedStopEvent,
      shouldFetchSummary,
    });

    if (shouldFetchSummary || shouldFetchSummaryByStatus) {
      console.log("📊 Fetching transaction summary for:", summaryCandidateId, {
        reason: shouldFetchSummary ? "stop event" : "status based",
        normalizedStatus
      });
      fetchTransactionSummary(summaryCandidateId);
    }
  }, [
    activeTransactionId,
    backendTransactionId,
    fetchTransactionSummary,
    hasFetchedSummary,
    isFetchingSummary,
    hasReceivedStopEvent,
    normalizedStatus,
    transactionSummary,
  ]);

  useEffect(() => {
    // เพิ่มเงื่อนไขสำหรับสถานะที่ควรนำทางไปหน้า summary
    const shouldNavigateStatuses = [
      "finishing", 
      "suspended_ev", 
      "suspended_evse", 
      "available"
    ];
    
    const shouldNavigateByStatus = shouldNavigateStatuses.includes(normalizedStatus);
    
    console.log("🚀 Navigation Debug:", {
      transactionSummary: !!transactionSummary,
      hasFetchedSummary,
      isFetchingSummary,
      activeTransactionId,
      hasNavigatedToSummary,
      hasReceivedStopEvent,
      normalizedStatus,
      shouldNavigateByStatus,
      shouldNavigate: hasReceivedStopEvent &&
        transactionSummary &&
        hasFetchedSummary &&
        !isFetchingSummary &&
        shouldNavigateByStatus &&
        !hasNavigatedToSummary
    });

    if (
      hasReceivedStopEvent &&
      transactionSummary &&
      hasFetchedSummary &&
      !isFetchingSummary &&
      shouldNavigateByStatus &&
      !hasNavigatedToSummary
    ) {
      const energyParam = energyKWh != null ? String(energyKWh) : "";
      const costParam = costEstimate != null ? String(costEstimate) : "";
      const durationParam = transactionSummary.durationSeconds != null
        ? String(transactionSummary.durationSeconds)
        : "";
      const meterStartParam = transactionSummary.meterStart != null
        ? String(transactionSummary.meterStart)
        : "";
      const meterStopParam = transactionSummary.meterStop != null
        ? String(transactionSummary.meterStop)
        : "";
      const rateParam = transactionSummary.appliedRate != null
        ? String(transactionSummary.appliedRate)
        : baseRate != null
          ? String(baseRate)
          : "";
      const connectorParam = transactionSummary.connectorNumber != null
        ? String(transactionSummary.connectorNumber)
        : connectorId != null
          ? String(connectorId)
          : chargingData?.connectorId != null
            ? String(chargingData.connectorId)
            : "1";

      router.replace({
        pathname: "/charge-session/summary",
        params: {
          transactionId: transactionSummary.transactionId,
          energy: energyParam,
          cost: costParam,
          durationSeconds: durationParam,
          startTime: transactionSummary.startTime,
          endTime: transactionSummary.endTime ?? "",
          meterStart: meterStartParam,
          meterStop: meterStopParam,
          stopReason: transactionSummary.stopReason ?? "",
          connectorId: connectorParam,
          chargePointIdentity:
            transactionSummary.chargePointIdentity ?? params.chargePointIdentity ?? "",
          chargePointName:
            params.stationName ?? params.chargePointName ?? params.chargePointIdentity ?? "",
          currency: params.currency ?? "บาท",
          rate: rateParam,
        },
      });
      setHasNavigatedToSummary(true);
      console.log("🎯 [NAVIGATION] Navigating to summary page with params:", {
        transactionId: transactionSummary.transactionId,
        energy: energyParam,
        cost: costParam
      });
    }
  }, [
    activeTransactionId,
    baseRate,
    chargingData?.connectorId,
    connectorId,
    costEstimate,
    energyKWh,
    hasFetchedSummary,
    hasNavigatedToSummary,
    hasReceivedStopEvent,
    isFetchingSummary,
    params.chargePointIdentity,
    params.chargePointName,
    params.currency,
    params.stationName,
    router,
    transactionSummary,
  ]);

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

  // energyKWh และ costEstimate ถูกประกาศไว้ด้านบนแล้ว (บรรทัด 836-861)
  const energyDeliveredDisplay = formatNumber(energyKWh, 2);
  console.log("🔋 Energy Delivered:", energyDeliveredDisplay, "Raw:", energyKWh);
  const currentPower = formatNumber(chargingData?.currentPower ?? 0, 2);
  const estimatedTimeText = formatDuration(
    chargingData?.estimatedRemainingSeconds ?? chargingData?.duration,
  );
  const elapsedLabel = formatDuration(elapsedSeconds);
  const startTimeLabel = formatDateTime(
    sessionStartTime ?? chargingData?.startTime,
  );
  const costDisplay = costEstimate != null
    ? formatCurrency(costEstimate, params.currency ?? "บาท")
    : null;
  const summaryStartTimeText = transactionSummary?.startTime
    ? formatDateTime(transactionSummary.startTime)
    : null;
  const summaryEndTimeText = transactionSummary?.endTime
    ? formatDateTime(transactionSummary.endTime)
    : null;
  const summaryDurationText = transactionSummary?.durationSeconds != null
    ? formatDuration(transactionSummary.durationSeconds)
    : null;

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

  if (energyKWh != null && (isCharging || activeTransactionId || transactionSummary)) {
    stationRows.push({
      label: "พลังงานที่ได้รับ",
      value: `${formatNumber(energyKWh, 2)} kWh`,
    });
  }

  if (costEstimate != null) {
    stationRows.push({
      label: "ค่าใช้จ่ายโดยประมาณ",
      value: formatCurrency(costEstimate, params.currency ?? "บาท"),
    });
  }

  if (transactionSummary?.durationSeconds != null) {
    stationRows.push({
      label: "เวลาที่ใช้",
      value: formatDuration(transactionSummary.durationSeconds),
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
    if (normalizedStatus === "finishing") {
      return transactionSummary
        ? "การชาร์จเสร็จสิ้นแล้ว"
        : "กำลังสรุปข้อมูลการชาร์จ...";
    }
    if (normalizedStatus === "suspended_ev" || normalizedStatus === "suspended_evse") {
      return transactionSummary
        ? "รถชาร์จเต็มแล้ว"
        : "กำลังเตรียมหยุดการชาร์จ";
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
              {energyKWh != null ? (
                <Animated.Text
                  style={[
                    styles.energyText,
                    isCharging && {
                      textShadowColor: COLORS.glow,
                      textShadowRadius: 20,
                      textShadowOffset: { width: 0, height: 0 }
                    }
                  ]}
                >
                  {energyDeliveredDisplay}
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
                editable={false}
                selectTextOnFocus={false}
                placeholder="ระบบจะสร้างให้อัตโนมัติ"
                placeholderTextColor={COLORS.textSecondary}
                style={[
                  styles.textInput,
                  !idTag && styles.textInputDisabled,
                ]}
              />
            </View>

            <View style={styles.buttonsRow}>
              <TouchableOpacity
                disabled={!canStartCharging || isCreatingTransaction}
                activeOpacity={0.8}
                onPress={handleStartCharging}
                style={[
                  styles.primaryButtonWrapper,
                  (!canStartCharging || isCreatingTransaction) &&
                    styles.primaryButtonDisabledWrapper,
                ]}
              >
                {(!canStartCharging || isCreatingTransaction) ? (
                  <View style={[styles.primaryButton, styles.primaryButtonDisabled]}>
                    <Ionicons
                      name={isCreatingTransaction ? "time-outline" : "flash-off"}
                      size={20}
                      color="rgba(255, 255, 255, 0.6)"
                    />
                    <Text style={styles.primaryButtonText}>
                      {isCreatingTransaction ? "กำลังเตรียม..." : primaryButtonLabel}
                    </Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={[COLORS.glow, COLORS.glowGreen]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.primaryButton}
                  >
                    <Ionicons name="flash" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
                  </LinearGradient>
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

        {transactionSummary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>สรุปการชาร์จ</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>เริ่ม</Text>
              <Text style={styles.summaryValue}>
                {summaryStartTimeText ?? '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>สิ้นสุด</Text>
              <Text style={styles.summaryValue}>
                {summaryEndTimeText ?? '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ระยะเวลา</Text>
              <Text style={styles.summaryValue}>
                {summaryDurationText ?? '-'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            {transactionSummary.appliedRate != null && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>อัตราค่าบริการ</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(transactionSummary.appliedRate, params.currency ?? "บาท")}/kWh
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>พลังงานรวม</Text>
              <Text style={styles.summaryValue}>
                {energyKWh != null ? `${formatNumber(energyKWh, 2)} kWh` : '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ค่าใช้จ่ายโดยประมาณ</Text>
              <Text style={styles.summaryValue}>
                {costDisplay ?? '-'}
              </Text>
            </View>
    
          </View>
        )}

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
  textInputDisabled: {
    color: COLORS.textSecondary,
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
  summaryCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
});
