import { API_CONFIG } from "@/config/api.config";
import { useChargingWebSocket } from "@/hooks/useChargingWebSocket";
import { chargepointService, transactionService } from "@/services/api";
import type { ChargingInitiateResponse } from "@/services/api/chargepoint.service";
import { http } from "@/services/api/client";
import { ChargingWebSocketClient } from "@/services/websocket/ChargingWebSocketClient";
import { getCredentials } from "@/utils/keychain";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
    return "0 นาที 00 วินาที";
  }
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours} ชม. ${minutes.toString().padStart(2, "0")} นาที ${secs
      .toString()
      .padStart(2, "0")} วินาที`;
  }
  return `${minutes} นาที ${secs.toString().padStart(2, "0")} วินาที`;
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
  currencyLabel: string = "บาท"
) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return `0.00 ${currencyLabel}`;
  }
  return `${value.toFixed(2)} ${currencyLabel}`;
};

export default function ChargeSessionScreen() {
  const params = useLocalSearchParams<{
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
    startTime?: string;
  }>();

  const connectorId = useMemo(() => {
    if (!params.connectorId) return undefined;
    const parsed = Number(params.connectorId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [params.connectorId]);

  // คำนวณข้อความกำลังไฟด้วย useMemo เพื่อป้องกันการคำนวณซ้ำในทุกการ render
  // จะใช้ข้อมูลจาก displayConnectorInfo ที่ประกาศหลัง initiateData
  const powerLabel = useMemo(() => {
    // Fallback to params for now, will be updated after displayConnectorInfo is available
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

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSummaryAttemptRef = useRef<{
    id: string | null;
    timestamp: number;
  }>({
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
  const buttonSpinAnim = useRef(new Animated.Value(0)).current;

  const [connectionState] = useState<ConnectionState>("connected"); // เริ่มที่ connected เพราะไม่ใช้ websocket
  const [status, setStatus] = useState<StatusMessagePayload | null>(null);
  const [chargingData, setChargingData] = useState<ChargingDataPayload | null>(
    null
  );
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const initialStartTime = params.startTime ? String(params.startTime) : null;

  useEffect(() => {
    if (initialStartTime) {
      setSessionStartTime((prev) => prev ?? initialStartTime);
    }
  }, [initialStartTime]);
  const [activeTransactionId] = useState<number | null>(null);
  const [backendTransactionId, setBackendTransactionId] = useState<
    string | null
  >(null);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [isStartingCharge, setIsStartingCharge] = useState(false);
  const [isStoppingCharge, setIsStoppingCharge] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [stationRate, setStationRate] = useState<number | null>(null);
  const [hasAttemptedStationFetch, setHasAttemptedStationFetch] =
    useState(false);

  // WebSocket Hook สำหรับ Real-time updates
  const {
    connectionStatus: wsConnectionStatus,
    connectionMessage: wsConnectionMessage,
    transactionData: wsTransactionData,
    meterValues: wsMeterValues,
    isConnected: wsIsConnected,
    connect: wsConnect,
    disconnect: wsDisconnect
  } = useChargingWebSocket(userId || undefined);

  // State สำหรับเก็บข้อมูลจาก initiate response
  const [initiateData, setInitiateData] =
    useState<ChargingInitiateResponse | null>(null);

  const baseRate = useMemo(() => {
    // ลำดับความสำคัญ: ข้อมูลจาก initiate > station rate > params
    if (initiateData?.pricing?.pricePerKwh != null)
      return initiateData.pricing.pricePerKwh;
    if (stationRate != null) return stationRate;
    if (!params.baseRate) return undefined;
    const parsed = Number(params.baseRate);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [initiateData?.pricing?.pricePerKwh, stationRate, params.baseRate]);
  const [transactionSummary, setTransactionSummary] =
    useState<TransactionSummaryPayload | null>(null);
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

  // Polling function to get charge point status
  const pollChargePointStatus = useCallback(async () => {
    if (!params.chargePointIdentity || !userId) return;

    try {
      const connectorToUse = connectorId || 1;
      console.log(
        "🔍 [STATUS] Using connectorId:",
        connectorToUse,
        "from params:",
        params.connectorId
      );
      const response = await chargepointService.getStatus(
        params.chargePointIdentity,
        connectorToUse,
        { userId }
      );

      if (response.success && response.data) {
        const data = response.data;

        // ใช้ connectorStatus หากมี ไม่งั้นใช้ status เป็น fallback
        const connectorStatus = data.connectorStatus || data.status || "available";
        const displayStatus =
          connectorStatus === "unknown" ? "available" : connectorStatus;
          
        setStatus({
          chargePointId: params.chargePointIdentity,
          connectorId: connectorId || 1,
          status: displayStatus,
          isOnline: data.isOnline !== false,
          message: data.message || undefined,
        });

        // Update charging data if available
        if (data.chargingData) {
          setChargingData((prev) => ({
            ...prev,
            ...data.chargingData,
          }));
        }

        // Check for charging completion
        const normalizedStatus = displayStatus
          .toLowerCase()
          .replace("suspendedevse", "suspended_evse")
          .replace("suspendedev", "suspended_ev");

        if (
          normalizedStatus === "suspended_ev" ||
          normalizedStatus === "suspended_evse" ||
          normalizedStatus === "finishing" ||
          normalizedStatus === "available"
        ) {
          setHasReceivedStopEvent(true);
        }

        appendLog("info", `อัปเดตสถานะสถานีชาร์จ: ${data.status || "unknown"}`);
      }
    } catch (error) {
      console.error("Error polling charge point status:", error);
      appendLog("error", "ไม่สามารถดึงสถานะสถานีชาร์จล่าสุดได้");
    }
  }, [
    params.chargePointIdentity,
    params.connectorId,
    connectorId,
    userId,
    appendLog,
  ]);

  // Set up polling when we have charge point info and user ID
  useEffect(() => {
    if (!params.chargePointIdentity || !userId) return;

    appendLog("info", "เริ่มตรวจสอบสถานะสถานีชาร์จ");

    // Initial poll only if WebSocket not connected
    if (!wsIsConnected) {
      pollChargePointStatus();
    }

    // ถ้า WebSocket connected ให้หยุด polling เลย, ใช้ WebSocket เป็นหลัก
    // ถ้า WebSocket ไม่เชื่อมต่อให้ poll บ่อยขึ้น
    if (wsIsConnected) {
      console.log('🔄 [POLLING] WebSocket connected - stopping API polling');
      // ไม่ต้อง poll เลยเพราะมี WebSocket real-time
      return;
    } else {
      console.log('🔄 [POLLING] WebSocket not connected - using API polling every 3s');
      pollingIntervalRef.current = setInterval(pollChargePointStatus, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [params.chargePointIdentity, userId, wsIsConnected, pollChargePointStatus, appendLog]);

  // Update charging data from WebSocket real-time updates
  useEffect(() => {
    if (wsMeterValues && wsIsConnected) {
      console.log('🔌 [WEBSOCKET] Updating charging data from real-time values:', wsMeterValues);
      
      setChargingData(prev => ({
        ...(prev || { connectorId: 1 }),
        energyDelivered: wsMeterValues.energyDelivered,
        currentPower: wsMeterValues.powerDelivered,
        // Map SoC to chargingPercentage if available  
        chargingPercentage: wsMeterValues.currentSoC || prev?.chargingPercentage || 0,
      }));

      console.log('🔋 [WEBSOCKET] Energy Delivered from WebSocket:', wsMeterValues.energyDelivered, 'kWh');
      console.log('⚡ [WEBSOCKET] Power Delivered:', wsMeterValues.powerDelivered, 'kW');
      console.log('📊 [WEBSOCKET] Current SoC:', wsMeterValues.currentSoC, '%');
    }
  }, [wsMeterValues, wsIsConnected]);

  // Update transaction data from WebSocket
  useEffect(() => {
    if (wsTransactionData && wsIsConnected) {
      console.log('🔌 [WEBSOCKET] Updating transaction data:', wsTransactionData);
      
      if (wsTransactionData.transactionId) {
        setBackendTransactionId(wsTransactionData.transactionId);
      }

      if (wsTransactionData.status === 'ACTIVE' && wsTransactionData.startTime) {
        setSessionStartTime(wsTransactionData.startTime);
      }

      // Update charging data with transaction info
      setChargingData(prev => ({
        ...(prev || { connectorId: 1 }),
        energyDelivered: wsTransactionData.energyDelivered || prev?.energyDelivered,
        currentPower: wsTransactionData.powerDelivered || prev?.currentPower,
        chargingPercentage: wsTransactionData.currentSoC || prev?.chargingPercentage || 0,
      }));
    }
  }, [wsTransactionData, wsIsConnected]);

  // Log WebSocket connection status
  useEffect(() => {
    console.log('🔌 [WEBSOCKET] Connection Status:', wsConnectionStatus, '-', wsConnectionMessage);
  }, [wsConnectionStatus, wsConnectionMessage]);

  // Auto-connect WebSocket when we have transaction ID
  useEffect(() => {
    if (backendTransactionId && !wsIsConnected) {
      console.log('🔌 [WEBSOCKET] Auto-connecting to WebSocket for transaction:', backendTransactionId);
      wsConnect(backendTransactionId).catch(error => {
        console.error('❌ [WEBSOCKET] Failed to connect:', error);
        
        // ถ้า WebSocket ไม่สามารถเชื่อมต่อได้ (เช่น token หมดอายุ)
        // ให้ใช้ API polling แทน
        if (error.message.includes('Authentication required')) {
          console.log('🔄 [WEBSOCKET] Falling back to API polling due to auth issues');
          appendLog("info", "กำลังใช้ระบบตรวจสอบสถานะผ่าน API เนื่องจากปัญหาการยืนยันตัวตน");
        }
      });
    }
  }, [backendTransactionId, wsIsConnected, wsConnect, appendLog]);

  // Cleanup WebSocket on unmount  
  useEffect(() => {
    return () => {
      if (wsIsConnected) {
        console.log('🔌 [WEBSOCKET] Cleaning up WebSocket connection on unmount');
        wsDisconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initiate charging session when first entering the page (after QR scan)
  useEffect(() => {
    console.log("🚀 [INITIATE DEBUG] useEffect triggered", {
      chargePointIdentity: params.chargePointIdentity,
      connectorId,
      hasChargePointId: !!params.chargePointIdentity,
      userId,
      hasUserId: !!userId,
    });

    const initiateChargingSession = async () => {
      console.log("🚀 [INITIATE DEBUG] Function called", {
        chargePointIdentity: params.chargePointIdentity,
        connectorId,
        userId,
      });

      if (!params.chargePointIdentity) {
        console.log(
          "🚀 [INITIATE DEBUG] No chargePointIdentity, returning early"
        );
        return;
      }

      // ไม่จำเป็นต้องรอ userId เพราะ initiate ใช้แค่ Bearer token

      const connectorToUse = connectorId || 1;

      try {
        console.log("🚀 [INITIATE DEBUG] Starting initiate call...");
        appendLog("info", "กำลังเตรียมเซสชันการชาร์จ...");

        const response = await chargepointService.initiateCharging(
          params.chargePointIdentity,
          connectorToUse
        );

        console.log("🚀 [INITIATE DEBUG] Response received:", response);

        if (response.success) {
          console.log(
            "🚀 [INITIATE DEBUG] Success response data:",
            response.data
          );

          // เก็บข้อมูลจาก response
          if (response.data) {
            setInitiateData(response.data);

            // อัปเดต station rate จาก pricing ที่ได้มา
            if (response.data.pricing?.basicRate) {
              setStationRate(response.data.pricing.basicRate);
              console.log(
                "💰 [INITIATE] Updated station rate from response:",
                response.data.pricing.basicRate
              );
            }

            // แสดงข้อมูล charge point ที่ได้มา (รูปแบบ nested)
            console.log("🔌 [INITIATE] Charge Point Info:", {
              name: response.data.chargePoint?.chargePointName,
              brand: response.data.chargePoint?.brand,
              model: response.data.chargePoint?.model,
              identity: response.data.chargePoint?.chargePointIdentity,
            });

            // แสดงข้อมูล connector ที่ได้มา (รูปแบบ nested)
            console.log("🔌 [INITIATE] Connector Info:", {
              type: response.data.connector?.type,
              maxPower: response.data.connector?.maxPower,
              maxCurrent: response.data.connector?.maxCurrent,
              connectorId: response.data.connector?.connectorId,
            });

            // แสดงข้อมูล station ที่ได้มา
            if (response.data.station) {
              console.log("🏢 [INITIATE] Station Info:", response.data.station);
            }
          }

          appendLog("success", "เตรียมเซสชันการชาร์จเรียบร้อย");
          appendLog(
            "info",
            response.message || "พร้อมเริ่มชาร์จ กดปุ่มเริ่มชาร์จเพื่อดำเนินการ"
          );

          // Poll to get current status after initiate - call directly without dependency
          setTimeout(() => {
            if (params.chargePointIdentity && userId) {
              pollChargePointStatus();
            }
          }, 1000); // Small delay to ensure initiate is processed
        } else {
          appendLog("error", response.message ?? "ไม่สามารถเตรียมเซสชันได้");
        }
      } catch (error: any) {
        console.error("🚀 [INITIATE DEBUG] Error:", error);
        console.error("Initiate charging session error:", error);
        
        // Check for specific error types
        if (error?.data?.error?.message?.includes("already have an active charging session")) {
          const errorMessage = error.data.error.message;
          
          Alert.alert(
            "มีเซสชันการชาร์จอยู่แล้ว", 
            `${errorMessage}\n\nคุณต้องการไปยังเซสชันปัจจุบันหรือพยายามหยุดเซสชันเดิม?`,
            [
              {
                text: "ยกเลิก",
                style: "cancel"
              },
              {
                text: "ไปยังเซสชันปัจจุบัน",
                onPress: () => {
                  // Try to navigate to current active session
                  appendLog("info", "กำลังค้นหาเซสชันที่ใช้งานอยู่...");
                  // Could add navigation logic here if we have current session info
                }
              },
              {
                text: "หยุดเซสชันเดิม",
                style: "destructive",
                onPress: () => {
                  Alert.alert(
                    "ยืนยันการหยุดเซสชัน",
                    "คุณแน่ใจหรือไม่ที่จะหยุดเซสชันการชาร์จเดิม?",
                    [
                      {
                        text: "ยกเลิก",
                        style: "cancel"
                      },
                      {
                        text: "หยุดเซสชัน",
                        style: "destructive",
                        onPress: async () => {
                          appendLog("info", "กำลังพยายามหยุดเซสชันเดิม...");
                          
                          try {
                            // Try to get active transactions
                            if (userId) {
                              console.log('🔍 [STOP] Attempting to find active sessions for user:', userId);
                              
                              // Try the correct active charging endpoint
                              let activeTransactionId = null;
                              
                              try {
                                console.log('🔍 [STOP] Calling /api/v1/user/charging/active');
                                const activeResponse = await http.get(`/api/v1/user/charging/active`);
                                console.log('🔍 [STOP] Active response:', activeResponse);
                                
                                if (activeResponse.data?.transactionId) {
                                  activeTransactionId = activeResponse.data.transactionId;
                                  appendLog("info", `พบเซสชันที่ใช้งานอยู่: ${activeTransactionId}`);
                                } else if (activeResponse.data?.data?.transactionId) {
                                  // Try nested data structure
                                  activeTransactionId = activeResponse.data.data.transactionId;
                                  appendLog("info", `พบเซสชันที่ใช้งานอยู่: ${activeTransactionId}`);
                                }
                              } catch (activeError: any) {
                                console.log('🔍 [STOP] Active API error:', activeError);
                                appendLog("info", "ไม่พบเซสชันที่ใช้งานอยู่ผ่าน active API");
                              }
                              
                              if (activeTransactionId) {
                                // Found active transaction, try to stop it
                                try {
                                  appendLog("info", `กำลังหยุดเซสชัน: ${activeTransactionId}`);
                                  console.log('🛑 [STOP] Calling stopCharging with:', activeTransactionId);
                                  
                                  const stopResult = await chargepointService.stopCharging(
                                    activeTransactionId, 
                                    "Stop for new session"
                                  );
                                  
                                  console.log('🛑 [STOP] Stop result:', stopResult);
                                  appendLog("success", "หยุดเซสชันเดิมเรียบร้อยแล้ว");
                                  appendLog("info", "กรุณาลองเริ่มชาร์จใหม่อีกครั้ง");
                                  
                                  // Optionally restart the initiate process
                                  setTimeout(() => {
                                    appendLog("info", "กำลังเตรียมเซสชันใหม่...");
                                    // Could restart the whole initiate process here if needed
                                  }, 2000);
                                  
                                } catch (stopError: any) {
                                  console.error('🛑 [STOP] Error stopping session:', stopError);
                                  let errorMsg = "ไม่สามารถหยุดเซสชันเดิมได้";
                                  if (stopError?.data?.error?.message) {
                                    errorMsg = stopError.data.error.message;
                                  } else if (stopError?.message) {
                                    errorMsg = stopError.message;
                                  }
                                  appendLog("error", errorMsg);
                                }
                              } else {
                                // No active transaction found via API
                                appendLog("error", "ไม่พบเซสชันที่ใช้งานอยู่ผ่าน API");
                                appendLog("info", "อาจจะเป็นปัญหาข้อมูลไม่ตรงกัน กรุณาติดต่อเจ้าหน้าที่");
                              }
                            } else {
                              appendLog("error", "ไม่สามารถระบุตัวผู้ใช้งานได้");
                            }
                          } catch (error: any) {
                            console.error('Error finding active sessions:', error);
                            appendLog("error", "เกิดข้อผิดพลาดในการค้นหาเซสชันที่ใช้งานอยู่");
                          }
                        }
                      }
                    ]
                  );
                }
              }
            ]
          );
        } else {
          // Handle other error types
          let message = "เกิดข้อผิดพลาดในการเตรียมเซสชัน";
          if (error?.data?.error?.message) {
            message = error.data.error.message;
          } else if (error?.message) {
            message = error.message;
          }
          
          Alert.alert("ไม่สามารถเตรียมเซสชันได้", message);
          appendLog("error", message);
        }
      }
    };

    initiateChargingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.chargePointIdentity, connectorId]); // ใช้แค่ params หลักที่จำเป็น เพื่อไม่ให้เรียกซ้ำ

  // ดึงข้อมูลสถานีชาร์จเพื่อเอาราคาแค่ครั้งเดียว
  useEffect(() => {
    const fetchStationRate = async () => {
      const chargePointIdentity = params.chargePointIdentity;

      // เรียกครั้งเดียวเท่านั้น
      if (!chargePointIdentity || hasAttemptedStationFetch) {
        return;
      }

      setHasAttemptedStationFetch(true);

      try {
        console.log(
          "💰 [STATION] Fetching station rate for:",
          chargePointIdentity
        );

        const response = await http.get<any>(
          API_CONFIG.ENDPOINTS.STATIONS.LIST
        );
        console.log("💰 [STATION] Response:", response);

        // Find the charge point from stations array
        const stations = response?.data || [];
        let rate = null;

        // Search for charge point with matching identity
        for (const stationData of stations) {
          const chargePoints = stationData.charge_points || [];
          const foundChargePoint = chargePoints.find(
            (cp: any) => cp.chargePointIdentity === chargePointIdentity
          );

          if (foundChargePoint) {
            const station = foundChargePoint.Station ?? stationData;
            rate = station?.onPeakRate ?? station?.offPeakRate ?? null;
            break;
          }
        }

        if (rate != null) {
          console.log("✅ [STATION] Got rate:", rate);
          setStationRate(rate);
        } else {
          console.log("❌ [STATION] No rate found in station data");
        }
      } catch (error: any) {
        console.log(
          "❌ [STATION] Failed to fetch rate:",
          error?.status || error?.message
        );
      }
    };

    fetchStationRate();
  }, [params.chargePointIdentity, hasAttemptedStationFetch]);

  useEffect(() => {
    // ดึงเวลาเริ่มจาก transaction startTime (จาก backend หรือ WebSocket)
    const startTimeValue =
      transactionSummary?.startTime ??
      sessionStartTime ??
      chargingData?.startTime;

    console.log("⏱️ [ELAPSED TIME] startTimeValue:", startTimeValue, {
      fromSummary: transactionSummary?.startTime,
      fromSession: sessionStartTime,
      fromChargingData: chargingData?.startTime,
    });

    if (!startTimeValue) {
      setElapsedSeconds(0);
      return;
    }

    const start = new Date(startTimeValue as string).getTime();
    if (Number.isNaN(start)) {
      console.log("❌ [ELAPSED TIME] Invalid start time:", startTimeValue);
      setElapsedSeconds(0);
      return;
    }

    console.log(
      "✅ [ELAPSED TIME] Starting timer with start time:",
      new Date(start).toISOString()
    );

    // คำนวณเวลาที่ผ่านไปโดยการลบเวลาปัจจุบันกับเวลาเริ่มต้น
    const update = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsedSeconds(elapsed);
    };

    // อัพเดททันทีและทุกๆ 1 วินาทีอย่างเนียนๆ
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [
    transactionSummary?.startTime,
    sessionStartTime,
    chargingData?.startTime,
  ]);

  const fetchTransactionSummary = useCallback(
    async (
      transactionId: string | null | undefined,
      force: boolean = false
    ) => {
      if (
        !transactionId ||
        (!force && (hasFetchedSummary || isFetchingSummary))
      ) {
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

        const response = await transactionService.getTransactionSummary(
          transactionId
        );
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
          const energy =
            summary.totalEnergy ?? previous?.energyDelivered ?? null;

          let computedCost: number | undefined | null =
            summary.totalCost ?? null;
          if (computedCost == null) {
            if (previous?.cost != null) {
              computedCost = previous.cost;
            } else if (energy != null && baseRate !== undefined) {
              computedCost = energy * baseRate;
            }
          }

          const parsedTransactionIdCandidate = Number(summary.transactionId);
          const parsedTransactionId = Number.isFinite(
            parsedTransactionIdCandidate
          )
            ? parsedTransactionIdCandidate
            : previous?.transactionId;

          if (!previous) {
            return {
              connectorId: connectorId ?? summary.connectorNumber ?? 1,
              status: "Finishing",
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
            status: previous.status ?? "Finishing",
          };
        });
      } catch (error: any) {
        console.error("ไม่สามารถดึงสรุปธุรกรรมได้:", error);
        // ถ้า force = true (real-time fetch) ไม่แสดง error เพราะ transaction อาจยังไม่พร้อม
        if (!force) {
          appendLog(
            "error",
            error?.message ??
              "ไม่สามารถดึงข้อมูลสรุปธุรกรรมได้ กรุณาลองอีกครั้ง"
          );
        } else {
          console.log(
            "💰 [REAL-TIME] Transaction not ready yet, will retry in next interval"
          );
        }
        setHasFetchedSummary(false);
        setHasNavigatedToSummary(false);
      } finally {
        setIsFetchingSummary(false);
      }
    },
    [appendLog, baseRate, connectorId, hasFetchedSummary, isFetchingSummary]
  );

  const handleStartCharging = async () => {
    if (isCreatingTransaction || isStartingCharge) {
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
        `หัวชาร์จอยู่ในสถานะ ${status?.status ?? "-"}`
      );
      return;
    }

    const chargePointIdentity = params.chargePointIdentity;
    if (!chargePointIdentity) {
      Alert.alert(
        "ข้อมูลไม่ครบ",
        "ไม่สามารถระบุรหัสเครื่องชาร์จได้ กรุณากลับไปหน้าเดิมแล้วลองใหม่"
      );
      return;
    }

    const connectorToUse = connectorId ?? chargingData?.connectorId ?? 1;

    try {
      setIsCreatingTransaction(true);
      setIsStartingCharge(true);
      setHasReceivedStopEvent(false);

      setHasNavigatedToSummary(false);
      setTransactionSummary(null);
      setHasFetchedSummary(false);
      setIsFetchingSummary(false);

      // ตั้งค่าเวลาเริ่มชาร์จทันที
      const startTimestamp = new Date().toISOString();
      setSessionStartTime(startTimestamp);

      // Use new charging API to start charging (no need to create transaction first)
      const chargeResponse = await chargepointService.startCharging(
        chargePointIdentity,
        connectorToUse
      );

      if (chargeResponse.success) {
        // อาจจะได้ transactionId จาก response
        if (chargeResponse.data?.transactionId) {
          setBackendTransactionId(String(chargeResponse.data.transactionId));
          appendLog("info", `ได้รหัสธุรกรรม: ${chargeResponse.data.transactionId}`);
        }

        appendLog(
          "success",
          `เริ่มชาร์จสำเร็จ (Connector ${connectorToUse})`
        );
        // Poll immediately to get updated status
        await pollChargePointStatus();
      } else {
        throw new Error(chargeResponse.message ?? "ไม่สามารถเริ่มชาร์จได้");
      }
    } catch (error: any) {
      console.error("ไม่สามารถเริ่มชาร์จได้:", error);
      
      let message = "ไม่สามารถเริ่มชาร์จได้ กรุณาลองใหม่อีกครั้ง";
      
      // Check for specific error types
      if (error?.data?.error?.message?.includes("already have an active charging session")) {
        message = error.data.error.message;
        Alert.alert(
          "มีเซสชันการชาร์จอยู่แล้ว", 
          `${message}\n\nคุณต้องการหยุดเซสชันเดิมและเริ่มใหม่หรือไม่?`,
          [
            {
              text: "ยกเลิก",
              style: "cancel"
            },
            {
              text: "หยุดเซสชันเดิม",
              onPress: async () => {
                // Try to find and stop existing session
                try {
                  // Use any available transaction ID to try stopping
                  if (backendTransactionId) {
                    await chargepointService.stopCharging(backendTransactionId, "Stop for new session");
                    appendLog("info", "หยุดเซสชันเดิมแล้ว กรุณาลองเริ่มชาร์จใหม่");
                  } else {
                    appendLog("info", "กรุณาหยุดเซสชันเดิมด้วยตนเองก่อนเริ่มใหม่");
                  }
                } catch (stopError) {
                  console.error("Error stopping existing session:", stopError);
                  appendLog("error", "ไม่สามารถหยุดเซสชันเดิมได้ กรุณาติดต่อเจ้าหน้าที่");
                }
              }
            }
          ]
        );
      } else {
        // Handle other error types
        if (typeof error?.message === "string") {
          message = error.message;
        } else if (typeof error?.data?.error?.message === "string") {
          message = error.data.error.message;
        }
        Alert.alert("ไม่สามารถเริ่มชาร์จได้", message);
      }
      
      appendLog("error", message);
      setIsStartingCharge(false);
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handleStopCharging = async () => {
    console.log('🛑 [STOP] handleStopCharging called');
    
    if (isStoppingCharge) {
      console.log('🛑 [STOP] Already stopping, returning');
      appendLog("info", "ระบบกำลังดำเนินการหยุดชาร์จอยู่แล้ว");
      return;
    }

    console.log('🛑 [STOP] Proceeding with stop charging');
    const chargePointIdentity = params.chargePointIdentity;
    if (!chargePointIdentity) {
      Alert.alert("ข้อมูลไม่ครบ", "ไม่สามารถระบุรหัสเครื่องชาร์จได้");
      return;
    }

    const connectorToUse = connectorId ?? chargingData?.connectorId ?? 1;

    setIsStoppingCharge(true);

    try {
      // Get transaction ID from all possible sources
      const transactionId = activeTransactionId || 
                          chargingData?.transactionId || 
                          backendTransactionId ||
                          wsTransactionData?.transactionId;

      console.log('🛑 [STOP DEBUG] Transaction data:', {
        activeTransactionId,
        chargingDataTransactionId: chargingData?.transactionId,
        backendTransactionId,
        wsTransactionId: wsTransactionData?.transactionId,
        finalTransactionId: transactionId,
        chargingData: chargingData,
        wsTransactionData: wsTransactionData
      });

      if (!transactionId) {
        console.error('❌ [STOP DEBUG] Missing transaction data:', {
          activeTransactionId,
          chargingData,
          backendTransactionId,
          wsTransactionData,
          websocketConnected: wsConnectionStatus
        });
        throw new Error("ไม่พบข้อมูลธุรกรรมการชาร์จ ไม่สามารถหยุดชาร์จได้");
      }

      // Convert to string for API
      const transactionIdStr = String(transactionId);

      // Use REST API to stop charging
      const stopResponse = await chargepointService.stopCharging(
        transactionIdStr,
        "User requested"
      );

      if (stopResponse.success) {
        appendLog("success", `หยุดชาร์จสำเร็จ (Connector ${connectorToUse})`);

        // Update local state immediately
        setChargingData((prev) =>
          prev
            ? {
                ...prev,
                currentPower: 0,
              }
            : {
                connectorId: connectorToUse,
                currentPower: 0,
              }
        );

        setStatus((previous) =>
          previous
            ? { ...previous, status: "Finishing" }
            : {
                chargePointId: chargePointIdentity,
                connectorId: connectorToUse,
                status: "Finishing",
                isOnline: true,
              }
        );

        setHasReceivedStopEvent(true);

        // Poll immediately to get updated status
        await pollChargePointStatus();

        // Try to fetch transaction summary if we have a transaction ID
        if (backendTransactionId) {
          void fetchTransactionSummary(backendTransactionId, true);
        }
      } else {
        throw new Error(stopResponse.message ?? "ไม่สามารถหยุดชาร์จได้");
      }
    } catch (error: any) {
      console.error("ไม่สามารถหยุดชาร์จได้:", error);
      const message =
        typeof error?.message === "string"
          ? error.message
          : "ไม่สามารถหยุดชาร์จได้ กรุณาลองใหม่อีกครั้ง";
      Alert.alert("ไม่สามารถหยุดชาร์จได้", message);
      appendLog("error", message);
    } finally {
      setIsStoppingCharge(false);
    }
  };

  // ใช้ WebSocket chargingData?.status เป็นหลักถ้าเชื่อมต่อแล้ว
  // fallback ไปที่ status?.status (จาก API polling) ถ้าไม่มี WebSocket data
  const rawStatus = (connectionState === 'connected' && chargingData?.status 
    ? chargingData?.status 
    : status?.status ?? chargingData?.status ?? "") as string;
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
    connectionState,
  });

  const statusDisplayText =
    STATUS_TEXT_MAP[normalizedStatus] ??
    (rawStatus ? rawStatus.toString() : "-");

  console.log("📱 Display Text:", statusDisplayText);

  // Computed values สำหรับการแสดงผลโดยใช้ข้อมูลจาก initiate response เป็นหลัก
  const displayChargePointName = useMemo(() => {
    return (
      initiateData?.chargePoint?.chargePointName ?? // nested: Charge Point name
      initiateData?.station?.stationName ?? // nested: Station name
      params.stationName ??
      params.chargePointName ??
      params.chargePointIdentity ??
      "-"
    );
  }, [
    initiateData?.chargePoint?.chargePointName,
    initiateData?.station?.stationName,
    params.stationName,
    params.chargePointName,
    params.chargePointIdentity,
  ]);

  const displayChargePointBrand = useMemo(() => {
    // nested: ใช้ brand จาก chargePoint object
    if (initiateData?.chargePoint?.brand) {
      return initiateData.chargePoint.brand;
    }
    return params.chargePointBrand || null;
  }, [initiateData?.chargePoint?.brand, params.chargePointBrand]);

  // Handle payment processing for completed charging
  const handlePaymentProcess = useCallback(async () => {
    if (!transactionSummary?.totalCost) {
      Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลค่าใช้จ่าย");
      return;
    }

    if (!backendTransactionId) {
      Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลธุรกรรม");
      return;
    }

    try {
      appendLog("info", "กำลังไปยังหน้าเลือกบัตรเครดิต...");

      // Navigate to payment screen with transaction details
      router.push({
        pathname: "/charge-session/select-credit-card",
        params: {
          transactionId: backendTransactionId,
          amount: String(transactionSummary.totalCost),
          energy: String(transactionSummary.totalEnergy || 0),
          duration: String(transactionSummary.durationSeconds || 0),
          chargePointName: displayChargePointName,
          stationLocation: params.stationLocation || "-",
        },
      });

      appendLog("success", "เปิดหน้าเลือกบัตรเครดิต");
    } catch (error: any) {
      const errorMsg = error?.message || "ไม่สามารถดำเนินการชำระเงิน";
      appendLog("error", errorMsg);
      Alert.alert("ข้อผิดพลาด", errorMsg);
    }
  }, [
    transactionSummary?.totalCost,
    transactionSummary?.totalEnergy,
    transactionSummary?.durationSeconds,
    backendTransactionId,
    displayChargePointName,
    params.stationLocation,
    appendLog,
  ]);

  // Navigate to transaction history
  const handleViewHistory = useCallback(() => {
    appendLog("info", "ไปยังประวัติการชาร์จ");
    router.push({
      pathname: "/charging-history/[transactionId]",
      params: {
        transactionId: backendTransactionId || "history",
      },
    });
  }, [appendLog, backendTransactionId]);

  const displayConnectorInfo = useMemo(() => {
    // ใช้ nested structure จาก connector object
    if (initiateData?.connector) {
      const { type, maxPower, maxCurrent } = initiateData.connector;
      return {
        type: type || null,
        power: maxPower ? `${maxPower} kW` : params.powerRating,
        current: maxCurrent ? `${maxCurrent} A` : null,
      };
    }
    return {
      type: null,
      power: params.powerRating,
      current: null,
    };
  }, [initiateData?.connector, params.powerRating]);

  // ปรับปรุง powerLabel ให้ใช้ข้อมูลจาก displayConnectorInfo
  const enhancedPowerLabel = useMemo(() => {
    // ใช้ข้อมูลจาก initiate response เป็นหลัก
    if (
      displayConnectorInfo.power &&
      displayConnectorInfo.power !== params.powerRating
    ) {
      if (displayConnectorInfo.power.includes("kW")) {
        const powerValue = Number(
          displayConnectorInfo.power.replace(" kW", "")
        );
        if (Number.isFinite(powerValue)) {
          const powerType = powerValue >= 50 ? "DC" : "AC";
          return `${powerType} ${powerValue.toFixed(0)} kW`;
        }
        return displayConnectorInfo.power;
      }
    }

    // Fallback ไปใช้ powerLabel เดิม
    return powerLabel;
  }, [displayConnectorInfo.power, params.powerRating, powerLabel]);

  const isCharging = CONNECTOR_CHARGING_STATUSES.has(normalizedStatus);

  const isConnectorPlugged =
    CONNECTOR_READY_STATUSES.has(normalizedStatus) ||
    CONNECTOR_CHARGING_STATUSES.has(normalizedStatus);

  const canStartCharging = 
    CONNECTOR_READY_STATUSES.has(normalizedStatus) ||
    (initiateData && CONNECTOR_AVAILABLE_STATUSES.has(normalizedStatus));

  const canStopCharging =
    CONNECTOR_CHARGING_STATUSES.has(normalizedStatus) ||
    activeTransactionId !== null ||
    backendTransactionId !== null;

  // คำนวณค่าพลังงานและค่าใช้จ่าย (ย้ายมาไว้ก่อน useEffect เพื่อใช้ใน navigation)
  const energyKWh =
    transactionSummary?.totalEnergy ?? chargingData?.energyDelivered;

  const costEstimate = useMemo(() => {
    // ใช้ appliedRate จาก backend เป็น fallback ถ้า baseRate ไม่มี
    const effectiveRate = baseRate ?? transactionSummary?.appliedRate;

    console.log("💰 [COST DEBUG]", {
      summaryTotalCost: transactionSummary?.totalCost,
      chargingDataCost: chargingData?.cost,
      energyKWh,
      stationRate,
      baseRate,
      appliedRate: transactionSummary?.appliedRate,
      effectiveRate,
    });

    // ลำดับความสำคัญในการหาค่า cost:
    // 1. ใช้ totalCost จาก backend (ถ้ามี)
    if (transactionSummary?.totalCost != null) {
      console.log(
        "💰 Using transactionSummary.totalCost:",
        transactionSummary.totalCost
      );
      return transactionSummary.totalCost;
    }

    // 2. ใช้ cost จาก WebSocket (ถ้ามี)
    if (chargingData?.cost != null) {
      console.log("💰 Using chargingData.cost:", chargingData.cost);
      return chargingData.cost;
    }

    // 3. คำนวณจาก energyKWh * rate (ใช้ effectiveRate ที่อาจมาจาก baseRate หรือ appliedRate)
    if (
      energyKWh != null &&
      effectiveRate !== undefined &&
      effectiveRate !== null
    ) {
      const calculated = energyKWh * effectiveRate;
      const rateSource = baseRate !== undefined ? "baseRate" : "appliedRate";
      console.log(
        `💰 Calculated cost: ${calculated} = ${energyKWh} * ${effectiveRate} (from ${rateSource})`
      );
      return calculated;
    }

    console.log("💰 No cost available, returning undefined");
    return undefined;
  }, [
    transactionSummary?.totalCost,
    transactionSummary?.appliedRate,
    chargingData?.cost,
    energyKWh,
    baseRate,
    stationRate,
  ]);

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

    // เพิ่มการตรวจสอบสำหรับสถานะที่ควร fetch summary ทันที (เฉพาะเมื่อได้รับ stop event)
    const shouldFetchSummaryByStatus =
      hasReceivedStopEvent &&
      !!summaryCandidateId &&
      (normalizedStatus === "suspended_ev" ||
        normalizedStatus === "suspended_evse" ||
        normalizedStatus === "finishing" ||
        normalizedStatus === "available") &&
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
        normalizedStatus,
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
    // รวม "available" ด้วยเพราะบางเครื่องชาร์จข้ามจาก "charging" ไปเป็น "available" เลยหลังกดหยุด
    const shouldNavigateStatuses = [
      "finishing",
      "suspended_ev",
      "suspended_evse",
      "available",
    ];

    const shouldNavigateByStatus =
      shouldNavigateStatuses.includes(normalizedStatus);

    console.log("🚀 Navigation Debug:", {
      transactionSummary: !!transactionSummary,
      hasFetchedSummary,
      isFetchingSummary,
      activeTransactionId,
      hasNavigatedToSummary,
      hasReceivedStopEvent,
      normalizedStatus,
      shouldNavigateByStatus,
      shouldNavigate:
        hasReceivedStopEvent &&
        transactionSummary &&
        hasFetchedSummary &&
        !isFetchingSummary &&
        shouldNavigateByStatus &&
        !hasNavigatedToSummary,
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
      const durationParam =
        transactionSummary.durationSeconds != null
          ? String(transactionSummary.durationSeconds)
          : "";
      const meterStartParam =
        transactionSummary.meterStart != null
          ? String(transactionSummary.meterStart)
          : "";
      const meterStopParam =
        transactionSummary.meterStop != null
          ? String(transactionSummary.meterStop)
          : "";
      const rateParam =
        transactionSummary.appliedRate != null
          ? String(transactionSummary.appliedRate)
          : baseRate != null
          ? String(baseRate)
          : "";
      const connectorParam =
        transactionSummary.connectorNumber != null
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
            transactionSummary.chargePointIdentity ??
            params.chargePointIdentity ??
            "",
          chargePointName:
            params.stationName ??
            params.chargePointName ??
            params.chargePointIdentity ??
            "",
          currency: params.currency ?? "บาท",
          rate: rateParam,
        },
      });
      setHasNavigatedToSummary(true);
      console.log("🎯 [NAVIGATION] Navigating to summary page with params:", {
        transactionId: transactionSummary.transactionId,
        energy: energyParam,
        cost: costParam,
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
    normalizedStatus,
    params.chargePointIdentity,
    params.chargePointName,
    params.currency,
    params.stationName,
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
          ])
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
  }, [
    chargingGlow,
    circleScale,
    isCharging,
    particleAnim,
    pulseAnim,
    rotateAnim,
    glowIntensity,
    floatAnim,
  ]);

  // Animation สำหรับปุ่ม loading
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isStartingCharge || isStoppingCharge) {
      buttonSpinAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(buttonSpinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      buttonSpinAnim.setValue(0);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
      buttonSpinAnim.setValue(0);
    };
  }, [isStartingCharge, isStoppingCharge, buttonSpinAnim]);

  // Check if we have required parameters
  if (!params.chargePointIdentity) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "เริ่มชาร์จ",
            headerTitleAlign: "center",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: "#EEF0F6" },
            headerTintColor: "#1F274B",
          }}
        />
        <View className="flex-1 bg-[#EEF0F6] justify-center items-center pt-12">
          <Text className="text-[#1F274B] text-center text-base leading-6">
            ไม่พบข้อมูลสถานีชาร์จ
          </Text>
          <TouchableOpacity
            className="mt-6 px-6 py-3 rounded-xl bg-[#1F274B]"
            onPress={() => router.replace("/qr-scanner")}
          >
            <Text className="text-white font-semibold text-[15px]">
              กลับไปสแกนใหม่
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // energyKWh และ costEstimate ถูกประกาศไว้ด้านบนแล้ว (บรรทัด 836-861)
  const energyDeliveredDisplay = formatNumber(energyKWh, 2);
  console.log(
    "🔋 Energy Delivered:",
    energyDeliveredDisplay,
    "Raw:",
    energyKWh
  );
  const currentPower = formatNumber(chargingData?.currentPower ?? 0, 2);
  
  // ⏰ ใช้ข้อมูลเวลาคาดการณ์จาก WebSocket หากมี, ถ้าไม่มีใช้ข้อมูลเดิม
  const estimatedTimeSeconds = wsMeterValues?.estimatedTimeToFull ?? 
                               chargingData?.estimatedRemainingSeconds ?? 
                               chargingData?.duration;
  
  const estimatedTimeText = estimatedTimeSeconds 
    ? (wsMeterValues?.estimatedTimeToFull 
        ? ChargingWebSocketClient.formatEstimatedTimeToFull(estimatedTimeSeconds)
        : formatDuration(estimatedTimeSeconds))
    : "กำลังคำนวณ...";
    
  console.log('⏰ [TIME DISPLAY] estimatedTimeSeconds:', estimatedTimeSeconds, {
    fromWebSocket: wsMeterValues?.estimatedTimeToFull,
    fromChargingData: chargingData?.estimatedRemainingSeconds,
    fallback: chargingData?.duration,
    formattedText: estimatedTimeText
  });
  const elapsedLabel = formatDuration(elapsedSeconds);
  // ดึงเวลาเริ่มชาร์จจาก transaction (จาก backend หรือ WebSocket)
  const startTimeLabel = formatDateTime(
    transactionSummary?.startTime ?? sessionStartTime ?? chargingData?.startTime
  );
  const costDisplay =
    costEstimate != null
      ? formatCurrency(costEstimate, params.currency ?? "บาท")
      : null;
  const summaryStartTimeText = transactionSummary?.startTime
    ? formatDateTime(transactionSummary.startTime)
    : null;
  const summaryEndTimeText = transactionSummary?.endTime
    ? formatDateTime(transactionSummary.endTime)
    : null;
  const summaryDurationText =
    transactionSummary?.durationSeconds != null
      ? formatDuration(transactionSummary.durationSeconds)
      : null;

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

  if (
    energyKWh != null &&
    (isCharging || activeTransactionId || transactionSummary)
  ) {
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

  if (displayChargePointBrand) {
    stationRows.splice(1, 0, {
      label: "อุปกรณ์",
      value: displayChargePointBrand,
    });
  }

  if (initiateData?.chargePoint?.protocol || params.protocol) {
    stationRows.splice(displayChargePointBrand ? 2 : 1, 0, {
      label: "โปรโตคอล",
      value:
        initiateData?.chargePoint?.protocol || params.protocol || "ไม่ระบุ",
    });
  }

  // เพิ่มข้อมูลจาก initiate response
  if (displayConnectorInfo.type) {
    stationRows.push({
      label: "ประเภทหัวชาร์จ",
      value: displayConnectorInfo.type,
    });
  }

  if (displayConnectorInfo.current) {
    stationRows.push({
      label: "กระแสไฟสูงสุด",
      value: displayConnectorInfo.current,
    });
  }

  // แสดง powerRating จาก initiate response ถ้ามี
  if (
    initiateData?.powerRating &&
    initiateData.powerRating !== Number(params.powerRating)
  ) {
    stationRows.push({
      label: "กำลังไฟสูงสุด",
      value: `${initiateData.powerRating} kW`,
    });
  }

  // แสดงข้อมูล station location จาก initiate response
  if (initiateData?.station?.location) {
    stationRows.push({
      label: "ที่อยู่สถานี",
      value: initiateData.station.location,
    });
  }

  if (initiateData?.paymentCard) {
    stationRows.push({
      label: "บัตรเครดิต",
      value: `**** ${initiateData.paymentCard.lastDigits} (${initiateData.paymentCard.brand})`,
    });
  }

  const rateLabel = baseRate
    ? `${baseRate.toFixed(2)} ${params.currency ?? "บาท"}/kWh`
    : "ไม่ระบุอัตราค่าบริการ";

  const headerSubtitle =
    params.pricingTierName ??
    `อัตราค่าบริการ ${rateLabel.replace("ไม่ระบุอัตราค่าบริการ", "-")}`;

  const helperText = (() => {
    // ถ้ามี initiate response แสดงข้อความจาก API
    if (initiateData && CONNECTOR_AVAILABLE_STATUSES.has(normalizedStatus)) {
      // แสดงสถานะ WebSocket สำหรับ debugging
      const wsStatus = wsIsConnected ? '🟢 Real-time' : '� API Mode';
      return `พร้อมเริ่มชาร์จ กดปุ่มเพื่อยืนยัน ${wsStatus}`;
    }

    // Helper text based on charging status instead of connection state
    if (
      CONNECTOR_AVAILABLE_STATUSES.has(normalizedStatus) ||
      !isConnectorPlugged
    ) {
      return "กรุณาเสียบปลั๊กเพื่อชาร์จ";
    }
    if (CONNECTOR_CHARGING_STATUSES.has(normalizedStatus)) {
      const wsStatus = wsIsConnected ? '🟢 Live Updates' : '� Checking Status';
      return `กำลังชาร์จอยู่ในขณะนี้ ${wsStatus}`;
    }
    if (normalizedStatus === "finishing") {
      return transactionSummary
        ? "การชาร์จเสร็จสิ้นแล้ว"
        : "กำลังสรุปข้อมูลการชาร์จ...";
    }
    if (
      normalizedStatus === "suspended_ev" ||
      normalizedStatus === "suspended_evse"
    ) {
      return transactionSummary ? "รถชาร์จเต็มแล้ว" : "กำลังเตรียมหยุดการชาร์จ";
    }
    if (normalizedStatus === "faulted") {
      return "หัวชาร์จมีปัญหา กรุณาติดต่อเจ้าหน้าที่";
    }
    return null;
  })();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "เริ่มชาร์จ",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#EEF0F6" },
          headerTintColor: "#1F274B",
        }}
      />
      <View className="flex-1 bg-[#EEF0F6] ">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Container with top alignment and padding */}
          <View className="flex flex-col items-center">
            {/* Status Card */}
            <View className="rounded-2xl flex-col w-full max-w-sm self-center">
              {/* Top section: Status and Power */}
              <View className="flex-row items-center justify-center w-full pb-4">
                <Ionicons name="flash" size={32} color="black" />
                <View className="ml-4">
                  <Text className="text-xl font-bold text-[#1F274B]">
                    {currentPower} KW
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {statusDisplayText || "กำลังตรวจสอบสถานะ..."}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View className="w-full border-b border-gray-200" />

              {/* Middle section: Current Charge and Time */}
              <View className="flex-row justify-around w-full py-2">
                <View className="items-center">
                  <Text className="text-xs text-gray-500 mb-1">
                    การชาร์จปัจจุบัน
                  </Text>
                  <Text className="text-lg font-semibold text-[#1F274B]">
                    {energyDeliveredDisplay} kWh
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-xs text-gray-500 mb-1">
                    เวลาที่คาดว่าจะเต็ม
                  </Text>
                  <Text className="text-lg font-semibold text-[#1F274B]">
                    {estimatedTimeText}
                  </Text>
                </View>
              </View>
            </View>

            <View className="items-center w-full">
              <Image
                source={
                  isConnectorPlugged
                    ? require("../../assets/images/imagcarvhageging.png")
                    : require("../../assets/images/image.png")
                }
                style={{ width: 350, height: 200 }}
                resizeMode="contain"
              />
            </View>

            {/* Station Details Card */}
            <View className="w-full max-w-sm bg-white rounded-2xl p-6 self-center">
              {/* Card Header: Dark blue section with charger info */}
              <View className="bg-[#1D2144] rounded-t-2xl p-4 flex-row items-center justify-between -mt-6 -mx-6 mb-6">
                <View className="bg-white p-2 rounded-lg mr-4">
                  <Ionicons name="flash" size={24} color="green" />
                </View>
                <View className="flex flex-col items-end">
                  <Text className="text-white font-bold text-lg">
                    {enhancedPowerLabel}
                  </Text>
                  <Text className="text-white text-[13px] mt-0.5">
                    {headerSubtitle}
                  </Text>
                </View>
              </View>

              {/* Session Details Section */}
              <View className="flex-col gap-6">
                {/* Station Name */}
                <View className="flex-row justify-between">
                  <Text className="text-[#1F274B] text-[14px] font-[400]">
                    สถานีชาร์จ
                  </Text>
                  <Text className="text-[#1F274B] text-[14px] font-[300]">
                    {displayChargePointName}
                  </Text>
                </View>
                {/* Start Time */}
                <View className="flex-row justify-between">
                  <Text className="text-[#1F274B] text-[14px] font-[400]">
                    เริ่มชาร์จ
                  </Text>
                  <Text className="text-[#1F274B] text-[14px] font-[300]">
                    {startTimeLabel}
                  </Text>
                </View>
                {/* Duration */}
                <View className="flex-row justify-between">
                  <Text className="text-[#1F274B] text-[14px] font-[400]">
                    เวลาผ่านไป
                  </Text>
                  <Text className="text-[#1F274B] text-[14px] font-[300]">
                    {elapsedLabel}
                  </Text>
                </View>
                {/* Energy Delivered */}
                <View className="flex-row justify-between">
                  <Text className="text-[#1F274B] text-[14px] font-[400]">
                    พลังงานที่ได้รับ
                  </Text>
                  <Text className="text-[#1F274B] text-[14px] font-[300]">
                    {energyDeliveredDisplay} kWh
                  </Text>
                </View>
                {/* Cost */}
                <View className="flex-row justify-between">
                  <Text className="text-[#1F274B] text-[14px] font-[400]">
                    ค่าบริการ
                  </Text>
                  <Text className="text-[#1F274B] text-[14px] font-[300]">
                    {costDisplay ?? "0.00 บาท"}
                  </Text>
                </View>
                {/* Cost */}
                <View className="flex-row justify-between">
                  <Text className="text-[#1F274B] text-[14px] font-[400]">
                    ระดับการชาร์จ
                  </Text>
                  <Text className="text-[#1F274B] text-[14px] font-[300]">
                    {formatNumber(chargingData?.chargingPercentage, 1)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="w-full max-w-sm self-center mt-10">
              {canStartCharging && (
                <TouchableOpacity
                  className="rounded-lg overflow-hidden mb-3"
                  onPress={handleStartCharging}
                  disabled={isCreatingTransaction || isStartingCharge}
                  activeOpacity={0.8}
                  style={{ opacity: isStartingCharge ? 0.6 : 1 }}
                >
                  {/* @ts-ignore */}
                  <LinearGradient
                    colors={[
                      "#5EC1A0",
                      "#67C1A5",
                      "#589FAF",
                      "#395F85",
                      "#1F274B",
                    ]}
                    start={{ x: 1, y: 0.5 }}
                    end={{ x: 0, y: 0.5 }}
                  >
                    <View className="bg-transparent p-4 items-center justify-center flex-row">
                      {isStartingCharge && (
                        <Animated.View
                          style={{
                            marginRight: 8,
                            transform: [
                              {
                                rotate: buttonSpinAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ["0deg", "360deg"],
                                }),
                              },
                            ],
                          }}
                        >
                          <Ionicons name="reload" size={20} color="white" />
                        </Animated.View>
                      )}
                      <Text className="text-white text-xl font-bold">
                        {isStartingCharge ? "กำลังเริ่มชาร์จ..." : "เริ่มชาร์จ"}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {canStopCharging && (
                <TouchableOpacity
                  className="bg-[#DC3545] py-4 rounded-lg items-center justify-center"
                  onPress={handleStopCharging}
                  disabled={isStoppingCharge}
                  activeOpacity={0.8}
                  style={{ opacity: isStoppingCharge ? 0.6 : 1 }}
                >
                  <View className="flex-row items-center justify-center">
                    {isStoppingCharge && (
                      <Animated.View
                        style={{
                          marginRight: 8,
                          transform: [
                            {
                              rotate: buttonSpinAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0deg", "360deg"],
                              }),
                            },
                          ],
                        }}
                      >
                        <Ionicons name="reload" size={20} color="white" />
                      </Animated.View>
                    )}
                    <Text className="text-white text-base font-bold">
                      {isStoppingCharge ? "กำลังหยุดชาร์จ..." : "หยุดชาร์จ"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {transactionSummary && (
              <View className="mt-4 rounded-2xl p-5 bg-white shadow-sm">
                <Text className="text-base font-bold text-[#1F274B] mb-3">
                  สรุปการชาร์จ
                </Text>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[13px] text-gray-500">เริ่ม</Text>
                  <Text className="text-[15px] font-semibold text-[#1F274B]">
                    {summaryStartTimeText ?? "-"}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[13px] text-gray-500">สิ้นสุด</Text>
                  <Text className="text-[15px] font-semibold text-[#1F274B]">
                    {summaryEndTimeText ?? "-"}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[13px] text-gray-500">ระยะเวลา</Text>
                  <Text className="text-[15px] font-semibold text-[#1F274B]">
                    {summaryDurationText ?? "-"}
                  </Text>
                </View>
                <View className="h-[1px] bg-gray-200 my-3" />
                {transactionSummary.appliedRate != null && (
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-[13px] text-gray-500">
                      อัตราค่าบริการ
                    </Text>
                    <Text className="text-[15px] font-semibold text-[#1F274B]">
                      {formatCurrency(
                        transactionSummary.appliedRate,
                        params.currency ?? "บาท"
                      )}
                      /kWh
                    </Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[13px] text-gray-500">พลังงานรวม</Text>
                  <Text className="text-[15px] font-semibold text-[#1F274B]">
                    {energyKWh != null
                      ? `${formatNumber(energyKWh, 2)} kWh`
                      : "-"}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-[13px] text-gray-500">
                    ค่าใช้จ่ายโดยประมาณ
                  </Text>
                  <Text className="text-[15px] font-semibold text-[#1F274B]">
                    {costDisplay ?? "-"}
                  </Text>
                </View>

                {/* Payment and History Action Buttons */}
                <View className="flex-col gap-3 mt-4">
                  <TouchableOpacity
                    className="rounded-lg overflow-hidden bg-[#5EC1A0] py-4"
                    onPress={handlePaymentProcess}
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="card" size={18} color="white" />
                      <Text className="text-white text-base font-bold ml-2">
                        ดำเนินการชำระเงิน
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="rounded-lg overflow-hidden bg-[#395F85] py-4"
                    onPress={handleViewHistory}
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="list" size={18} color="white" />
                      <Text className="text-white text-base font-bold ml-2">
                        ประวัติการชาร์จ
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {helperText && (
              <View className="mt-4 flex-row items-start p-3.5 rounded-xl bg-[#1F274B]/5">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#1F274B"
                />
                <Text className="flex-1 ml-2.5 text-[13px] leading-5 text-[#1F274B]">
                  {helperText}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
