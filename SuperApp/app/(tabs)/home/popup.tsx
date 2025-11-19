import { http } from "@/services/api";
import { getCredentials } from "@/utils/keychain";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_TRANSACTION_STATUS = "CHARGING";
const ACTIVE_STATUSES = ["CHARGING", "ACTIVE", "PREPARING"];

type RawTransaction = {
  status?: string;
  transactionStatus?: string;
  state?: string;
  [key: string]: any;
};

type ChargingDataPayload = {
  currentPower?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  energyDelivered?: number;
  sessionDuration?: number;
  estimatedCost?: number;
  [key: string]: any;
};

const getStatusString = (transaction: RawTransaction) => {
  // Check common status field names
  const candidates = [
    transaction.status,
    transaction.transactionStatus,
    transaction.state,
    transaction.connector?.status, // API returns status in connector.status
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return undefined;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    if (!normalized.length) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const extractActiveTransaction = (payload: unknown): RawTransaction | null => {
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractActiveTransaction(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof payload === "object") {
    const candidate = payload as RawTransaction;
    const status = getStatusString(candidate);

    if (status && ACTIVE_STATUSES.includes(status.toUpperCase())) {
      return candidate;
    }

    for (const key of [
      "data",
      "transaction",
      "transactions",
      "result",
      "payload",
      "items",
    ]) {
      if (key in candidate) {
        const nested = extractActiveTransaction(candidate[key]);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return null;
};

const derivePowerKw = (transaction: RawTransaction): number | null => {
  const candidates = [
    "currentPowerKw",
    "currentPower",
    "power",
    "chargingPower",
    "chargingPowerKw",
    "powerKw",
    "kw",
    "kW",
    "current_kw",
    "currentPower_kW",
  ];

  for (const key of candidates) {
    const parsed = toNumberOrNull(transaction[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const deriveEnergyDelivered = (transaction: RawTransaction): number | null => {
  const candidates = [
    "energyDelivered",
    "energyDeliveredKwh",
    "energyDeliveredKWh",
    "energy_delivered",
    "totalEnergy",
    "totalEnergyKwh",
    "totalEnergyKWh",
    "energy",
    "energyKwh",
    "energyKWh",
    "energy_kwh",
    "meterValue",
    "meter_value",
  ];

  for (const key of candidates) {
    const parsed = toNumberOrNull(transaction[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const deriveRemainingTime = (transaction: RawTransaction) => {
  const secondKeys = [
    "estimatedRemainingSeconds",
    "estimatedTimeSeconds",
    "remainingSeconds",
    "remainingTimeSeconds",
    "timeRemainingSeconds",
    "durationSeconds",
  ];

  for (const key of secondKeys) {
    const parsed = toNumberOrNull(transaction[key]);
    if (parsed !== null) {
      return { seconds: parsed, minutes: null };
    }
  }

  const minuteKeys = [
    "estimatedRemainingMinutes",
    "estimatedTimeMinutes",
    "estimatedTime",
    "remainingMinutes",
    "remainingTimeMinutes",
    "timeRemainingMinutes",
    "durationMinutes",
  ];

  for (const key of minuteKeys) {
    const parsed = toNumberOrNull(transaction[key]);
    if (parsed !== null) {
      return { seconds: null, minutes: parsed };
    }
  }

  const millisecondKeys = [
    "estimatedRemainingMilliseconds",
    "remainingMilliseconds",
    "durationMilliseconds",
    "estimatedTimeMs",
  ];

  for (const key of millisecondKeys) {
    const parsed = toNumberOrNull(transaction[key]);
    if (parsed !== null) {
      return { seconds: parsed / 1000, minutes: null };
    }
  }

  return { seconds: null, minutes: null };
};

const deriveChargePointName = (transaction: RawTransaction): string | null => {
  const directCandidates = [
    transaction.chargePointName,
    transaction.stationName,
    transaction.locationName,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const chargePoint = transaction.chargePoint;
  if (chargePoint) {
    if (
      typeof chargePoint.name === "string" &&
      chargePoint.name.trim().length > 0
    ) {
      return chargePoint.name.trim();
    }
    if (
      typeof chargePoint.stationName === "string" &&
      chargePoint.stationName.trim().length > 0
    ) {
      return chargePoint.stationName.trim();
    }
  }

  return null;
};

const deriveConnectorName = (transaction: RawTransaction): string | null => {
  if (
    typeof transaction.connectorName === "string" &&
    transaction.connectorName.trim().length > 0
  ) {
    return transaction.connectorName.trim();
  }

  const connector = transaction.connector;
  if (connector) {
    if (typeof connector.name === "string" && connector.name.trim().length > 0) {
      return connector.name.trim();
    }

    const connectorIdentifier =
      connector.connectorId ??
      connector.id ??
      connector.connector ??
      connector.connectorNumber;

    if (
      connectorIdentifier !== undefined &&
      connectorIdentifier !== null &&
      `${connectorIdentifier}`.length > 0
    ) {
      return `Connector ${connectorIdentifier}`;
    }
  }

  const fallbackIdentifier =
    transaction.connectorId ??
    transaction.connectorNumber ??
    transaction.connectorID;

  if (
    fallbackIdentifier !== undefined &&
    fallbackIdentifier !== null &&
    `${fallbackIdentifier}`.length > 0
  ) {
    return `Connector ${fallbackIdentifier}`;
  }

  return null;
};

export type ChargingStatusPopupData = {
  status?: string;
  currentPowerKw?: number | null;
  estimatedRemainingSeconds?: number | null;
  estimatedRemainingMinutes?: number | null;
  chargePointName?: string | null;
  connectorName?: string | null;
  transactionId?: number | string | null;
  websocketUrl?: string | null;
  chargePointIdentity?: string | null;
  connectorId?: number | null;
  stationName?: string | null;
  stationLocation?: string | null;
  powerRating?: number | null;
  baseRate?: number | null;
  currency?: string | null;
  pricingTierName?: string | null;
  chargePointBrand?: string | null;
  protocol?: string | null;
  energyDelivered?: number | null;
  startTime?: string | null;
};

type ChargingStatusPopupProps = {
  visible: boolean;
  data?: ChargingStatusPopupData | null;
  onClose?: () => void;
  onNavigateToCharging?: () => void;
  bottomOffset?: number;
};

type ChargingStatusResult = {
  data: ChargingStatusPopupData | null;
  hadError: boolean;
};

const loadActiveTransaction = async (): Promise<ChargingStatusResult> => {
  try {
    const credentials = await getCredentials();
    if (!credentials?.id) {
      console.warn("ไม่พบ userId สำหรับตรวจสอบสถานะการชาร์จ");
      return { data: null, hadError: false };
    }

    const endpoint = `/api/v1/user/charging/active`;
    console.log('🔍 [POPUP] Fetching active transaction from:', endpoint);
    
    // Create a shorter timeout (8 seconds) for this specific request to avoid long hangs
    let response;
    try {
      response = await Promise.race([
        http.get<any>(endpoint),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 8 seconds')), 8000)
        )
      ]);
    } catch (err: any) {
      if (err.message?.includes('timeout')) {
        console.warn('⏱️ [POPUP] Request timeout - will retry on next poll');
        return { data: null, hadError: false };
      }
      throw err;
    }

    console.log('📦 [POPUP] Raw API response:', response);
    const payload = response?.data ?? response;
    console.log('📦 [POPUP] Payload:', payload);
    
    // The response format is { success, data: [] } where data is an array
    let activeTransaction = null;
    if (Array.isArray(payload)) {
      // If payload is the array directly
      activeTransaction = payload.length > 0 ? payload[0] : null;
    } else if (Array.isArray(payload?.data)) {
      // If payload has data array
      activeTransaction = payload.data.length > 0 ? payload.data[0] : null;
    } else {
      // Try to extract from payload
      activeTransaction = extractActiveTransaction(payload);
    }
    
    console.log('🎯 [POPUP] Active transaction:', activeTransaction);

    if (!activeTransaction) {
      console.log('❌ [POPUP] No active transaction found');
      return { data: null, hadError: false };
    }

    // Check if transaction has valid ID - if it does, it's an active transaction
    const hasValidTransactionId = !!(
      activeTransaction.id ||
      activeTransaction.transactionId ||
      activeTransaction.transactionID
    );

    if (!hasValidTransactionId) {
      console.log('❌ [POPUP] No valid transaction ID found');
      return { data: null, hadError: false };
    }

    const status = getStatusString(activeTransaction);
    console.log('📊 [POPUP] Transaction status:', status);
    
    // Accept transaction if:
    // 1. Status is one of the active statuses, OR
    // 2. Status is AVAILABLE but transaction has a valid ID (means charging was/is active)
    const isValidStatus = status && (
      ACTIVE_STATUSES.includes(status.toUpperCase()) ||
      status.toUpperCase() === 'AVAILABLE'
    );
    
    if (!isValidStatus) {
      console.log('❌ [POPUP] Status is not one of:', ACTIVE_STATUSES, 'and status is:', status);
      return { data: null, hadError: false };
    }

    const { seconds, minutes } = deriveRemainingTime(activeTransaction);

    // Extract chargePoint data
    const chargePoint = activeTransaction.chargePoint;
    const connector = activeTransaction.connector;
    const station = chargePoint?.station ?? chargePoint?.Station;

    console.log('🔌 [POPUP] ChargePoint:', chargePoint);
    console.log('🔌 [POPUP] Connector:', connector);
    console.log('🏢 [POPUP] Station:', station);

    const popupData = {
      status,
      currentPowerKw: derivePowerKw(activeTransaction),
      estimatedRemainingSeconds: seconds,
      estimatedRemainingMinutes: minutes,
      chargePointName: deriveChargePointName(activeTransaction),
      connectorName: deriveConnectorName(activeTransaction),
      energyDelivered: deriveEnergyDelivered(activeTransaction),
      transactionId:
        activeTransaction.transactionId ??
        activeTransaction.id ??
        activeTransaction.transactionID ??
        null,
      startTime: activeTransaction.startTime ?? null,
      // Use identity field from chargePoint instead of chargePointIdentity
      websocketUrl: activeTransaction.websocketUrl ?? chargePoint?.urlwebSocket ?? chargePoint?.websocketUrl ?? station?.websocketUrl ?? null,
      chargePointIdentity: chargePoint?.identity ?? chargePoint?.chargePointIdentity ?? activeTransaction.chargePointIdentity ?? null,
      connectorId: connector?.connectorId ?? activeTransaction.connectorId ?? null,
      stationName: station?.stationName ?? station?.stationname ?? station?.name ?? chargePoint?.stationName ?? chargePoint?.name ?? null,
      stationLocation: station?.location ?? chargePoint?.location ?? null,
      powerRating: chargePoint?.powerRating ?? chargePoint?.maxPower ?? null,
      baseRate: station?.onPeakRate ?? station?.offPeakRate ?? null,
      currency: 'บาท',
      pricingTierName: station?.pricingTierName ?? null,
      chargePointBrand: chargePoint?.brand ?? null,
      protocol: chargePoint?.protocol ?? chargePoint?.ocppProtocolRaw ?? null,
    };

    console.log('✅ [POPUP] Final popup data:', popupData);

    return {
      data: popupData,
      hadError: false,
    };
  } catch (error: any) {
    // Check if it's a timeout error
    const isTimeout = error?.message?.includes('timeout');
    const errorCode = error?.code;
    const errorMessage = error?.message || 'Unknown error';
    
    console.error("❌ [POPUP] Failed to load active transaction:", {
      message: errorMessage,
      code: errorCode,
      isTimeout,
      status: error?.response?.status,
    });

    // For timeout errors, return false for hadError so we can retry
    // For other errors, also return false to avoid blocking the UI
    return { data: null, hadError: false };
  }
};

export const useChargingStatusPopup = (options?: {
  pollInterval?: number;
}) => {
  const pollInterval = options?.pollInterval ?? 20000;
  const [data, setData] = useState<ChargingStatusPopupData | null>(null);
  const [visible, setVisible] = useState(false);

  const applyResult = useCallback((result: ChargingStatusResult) => {
    if (!result.data) {
      setData(null);
      setVisible(false);
    } else {
      setData(result.data);
      setVisible(true);
    }
  }, []);

  const refresh = useCallback(async () => {
    const result = await loadActiveTransaction();
    applyResult(result);
    return result;
  }, [applyResult]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let intervalId: ReturnType<typeof setInterval> | null = null;

      const start = async () => {
        const initialResult = await refresh();

        if (!initialResult || cancelled) {
          return;
        }

        if (initialResult.hadError || !initialResult.data) {
          console.log('⏸️ [POPUP] No active transaction, stopping polling');
          return;
        }

        console.log('▶️ [POPUP] Active transaction found, starting polling every', pollInterval / 1000, 'seconds');
        intervalId = setInterval(async () => {
          const next = await loadActiveTransaction();
          if (cancelled || next.hadError) {
            return;
          }

          // ถ้าไม่เจอ transaction แล้ว ให้หยุด polling
          if (!next.data) {
            console.log('⏹️ [POPUP] Transaction ended, stopping polling');
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }

          applyResult(next);
        }, pollInterval);
      };

      start();

      return () => {
        cancelled = true;
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [applyResult, pollInterval, refresh]),
  );

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const show = useCallback(() => {
    if (data) {
      setVisible(true);
    }
  }, [data]);

  return {
    data,
    visible,
    hide,
    show,
    refresh,
  };
};

const formatPower = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0.00";
  }
  return value.toFixed(2);
};

const formatEnergy = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  return value.toFixed(2);
};

const formatDuration = (
  seconds?: number | null,
  minutes?: number | null,
) => {
  if (
    seconds === undefined ||
    seconds === null ||
    Number.isNaN(seconds)
  ) {
    if (
      minutes === undefined ||
      minutes === null ||
      Number.isNaN(minutes)
    ) {
      return "0 ชม. 00 นาที";
    }
    const safeMinutes = Math.max(0, Math.round(minutes));
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;
    return `${hours} ชม. ${remainingMinutes.toString().padStart(2, "0")} นาที`;
  }

  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const remainingMinutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours} ชม. ${remainingMinutes.toString().padStart(2, "0")} นาที`;
};

type ChargingStatusCardContentProps = {
  data?: ChargingStatusPopupData | null;
  onClose?: () => void;
  onNavigateToCharging?: () => void;
};

const ChargingStatusCardContent: React.FC<ChargingStatusCardContentProps> = ({
  data,
  onClose,
  onNavigateToCharging,
}) => {
  const [realtimeData, setRealtimeData] = useState<ChargingDataPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket when websocketUrl is available
  useEffect(() => {
    if (!data?.websocketUrl) {
      console.log('🔌 [POPUP WS] No websocketUrl, skipping connection');
      return;
    }

    // Fix WebSocket URL - replace 0.0.0.0 with localhost or actual IP
    let websocketUrl = data.websocketUrl;
    if (websocketUrl.includes('0.0.0.0')) {
      // For development, use localhost. In production, this should be the actual server IP
      websocketUrl = websocketUrl.replace('0.0.0.0', '192.168.1.100'); // Replace with your actual server IP
      console.log('🔧 [POPUP WS] Fixed URL from', data.websocketUrl, 'to', websocketUrl);
    }

    console.log('🔌 [POPUP WS] Connecting to:', websocketUrl);

    let connectionTimeout: ReturnType<typeof setTimeout>;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;
    const maxRetries = 3;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(websocketUrl);
        wsRef.current = ws;

        // Set connection timeout
        connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.warn('⏱️ [POPUP WS] Connection timeout, closing...');
            ws.close();
          }
        }, 10000); // 10 second timeout

        ws.onopen = () => {
          console.log('✅ [POPUP WS] Connected successfully');
          clearTimeout(connectionTimeout);
          retryCount = 0; // Reset retry count on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 [POPUP WS] Received:', message);

            if (message.type === 'charging_data' && message.data) {
              console.log('⚡ [POPUP WS] Charging data update:', message.data);
              setRealtimeData(message.data);
            }
          } catch (error) {
            console.error('❌ [POPUP WS] Parse error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ [POPUP WS] WebSocket error:', error);
          clearTimeout(connectionTimeout);
        };

        ws.onclose = (event) => {
          console.log('🔌 [POPUP WS] Connection closed. Code:', event.code, 'Reason:', event.reason);
          clearTimeout(connectionTimeout);

          // Retry logic for unexpected closures
          if (event.code !== 1000 && retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 [POPUP WS] Retrying connection (${retryCount}/${maxRetries}) in 5 seconds...`);
            retryTimeout = setTimeout(connectWebSocket, 5000);
          }
        };
      } catch (error) {
        console.error('❌ [POPUP WS] Connection error:', error);
        clearTimeout(connectionTimeout);

        // Retry on connection errors
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 [POPUP WS] Retrying connection (${retryCount}/${maxRetries}) in 5 seconds...`);
          retryTimeout = setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(connectionTimeout);
      clearTimeout(retryTimeout);
      if (wsRef.current) {
        console.log('🔌 [POPUP WS] Cleaning up connection');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [data?.websocketUrl]);

  // Use real-time data if available, otherwise fall back to data from API
  const currentPower = realtimeData?.currentPower ?? data?.currentPowerKw ?? 0;
  const energyValue = realtimeData?.energyDelivered ?? data?.energyDelivered ?? null;
  const sessionDuration = realtimeData?.sessionDuration ?? data?.estimatedRemainingSeconds ?? 0;

  const powerText = formatPower(currentPower);
  const energyText = formatEnergy(energyValue);
  const durationText = formatDuration(
    sessionDuration,
    data?.estimatedRemainingMinutes,
  );

  const handleNavigate = () => {
    console.log('🚀 [POPUP NAV] handleNavigate called');
    console.log('🚀 [POPUP NAV] onNavigateToCharging:', onNavigateToCharging);
    console.log('🚀 [POPUP NAV] data:', data);

    if (onNavigateToCharging) {
      console.log('🚀 [POPUP NAV] Using custom onNavigateToCharging');
      onNavigateToCharging();
      return;
    }

    // Navigate to charge session with all available parameters
    console.log('🚀 [POPUP NAV] Checking required fields...');
    console.log('🚀 [POPUP NAV] chargePointIdentity:', data?.chargePointIdentity);
    console.log('🚀 [POPUP NAV] connectorId:', data?.connectorId);
    console.log('🚀 [POPUP NAV] stationName:', data?.stationName);

    // Only require chargePointIdentity and connectorId - websocketUrl is optional
    if (data?.chargePointIdentity && data?.connectorId != null) {
      const navParams = {
        chargePointIdentity: data.chargePointIdentity,
        chargePointName: data.chargePointName ?? '',
        connectorId: String(data.connectorId),
        stationName: data.stationName ?? data.chargePointName ?? '',
        stationLocation: data.stationLocation ?? '',
        powerRating: data.powerRating ? String(data.powerRating) : '',
        baseRate: data.baseRate ? String(data.baseRate) : '',
        currency: data.currency ?? 'บาท',
        pricingTierName: data.pricingTierName ?? '',
        chargePointBrand: data.chargePointBrand ?? '',
        protocol: data.protocol ?? '',
        startTime: data.startTime ?? undefined,
        transactionId: data.transactionId ? String(data.transactionId) : undefined,
      };

      console.log('✅ [POPUP NAV] Required fields present, navigating to charge-session...');
      console.log('✅ [POPUP NAV] Navigation params:', navParams);

      try {
        router.push({
          pathname: '/charge-session',
          params: navParams,
        });
        console.log('✅ [POPUP NAV] Navigation successful');
        onClose?.();
      } catch (error) {
        console.error('❌ [POPUP NAV] Navigation error:', error);
      }
    } else {
      console.warn('❌ [POPUP NAV] Missing required data for navigation:', {
        chargePointIdentity: data?.chargePointIdentity,
        connectorId: data?.connectorId,
      });
      onClose?.();
    }
  };

  const hasRealTimeData = currentPower > 0;

  return (
    <>
      <View className="flex-row items-start">
        <LinearGradient
          colors={["#2D6BAA", "#48B59E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="items-center justify-center rounded-full w-14 h-14"
        >
          <Ionicons name="flash" size={28} color="#FFFFFF" />
        </LinearGradient>
        <View className="flex-1 ml-4">
          <View className="flex-1 pr-2">
            <Text className="text-xl font-semibold text-[#1D2144]">
              กำลังชาร์จอยู่
            </Text>
            {data?.chargePointName ? (
              <Text className="mt-1 text-xs text-[#6B7280]">
                {data.chargePointName}
                {data.connectorName ? ` • ${data.connectorName}` : ""}
              </Text>
            ) : null}
            {data?.stationLocation ? (
              <Text className="mt-0.5 text-xs text-[#9CA3AF]">
                📍 {data.stationLocation}
              </Text>
            ) : null}
          </View>

          {/* Show real-time data if available */}
          {hasRealTimeData ? (
            <View className="mt-4 space-y-2">
              {/* Current Power */}
              <View className="flex-row items-center justify-between px-3 py-2 bg-gradient-to-r from-[#2D6BAA]/10 to-[#48B59E]/10 rounded-lg">
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={16} color="#2D6BAA" />
                  <Text className="ml-2 text-sm text-[#6B7280]">กำลังไฟฟ้า</Text>
                </View>
                <Text className="text-base font-bold text-[#2D6BAA]">{powerText} kW</Text>
              </View>

              {/* Energy Delivered */}
              {energyText && (
                <View className="flex-row items-center justify-between px-3 py-2 bg-[#F3F4F6] rounded-lg">
                  <View className="flex-row items-center">
                    <Ionicons name="battery-charging" size={16} color="#48B59E" />
                    <Text className="ml-2 text-sm text-[#6B7280]">พลังงานที่ได้รับ</Text>
                  </View>
                  <Text className="text-base font-semibold text-[#1D2144]">
                    {energyText} kWh
                  </Text>
                </View>
              )}

              {/* Voltage and Current */}
              {(realtimeData?.voltage != null || realtimeData?.current != null) && (
                <View className="flex-row gap-2">
                  {realtimeData?.voltage != null && (
                    <View className="flex-1 px-3 py-2 bg-[#F3F4F6] rounded-lg">
                      <Text className="text-xs text-[#9CA3AF]">แรงดัน</Text>
                      <Text className="text-sm font-semibold text-[#1D2144] mt-0.5">
                        {realtimeData.voltage.toFixed(1)} V
                      </Text>
                    </View>
                  )}
                  {realtimeData?.current != null && (
                    <View className="flex-1 px-3 py-2 bg-[#F3F4F6] rounded-lg">
                      <Text className="text-xs text-[#9CA3AF]">กระแส</Text>
                      <Text className="text-sm font-semibold text-[#1D2144] mt-0.5">
                        {realtimeData.current.toFixed(1)} A
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Session Duration */}
              {sessionDuration > 0 && (
                <View className="flex-row items-center justify-between px-3 py-2 bg-[#F3F4F6] rounded-lg">
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text className="ml-2 text-sm text-[#6B7280]">เวลาที่ใช้</Text>
                  </View>
                  <Text className="text-base font-semibold text-[#1D2144]">{durationText}</Text>
                </View>
              )}
            </View>
          ) : (
            <>
              {energyText ? (
                <View className="mt-3 px-3 py-2 bg-[#F3F4F6] rounded-lg">
                  <Text className="text-xs text-[#6B7280]">
                    พลังงานที่ได้รับ
                  </Text>
                  <Text className="text-base font-semibold text-[#1D2144] mt-0.5">
                    {energyText} kWh
                  </Text>
                </View>
              ) : data?.powerRating ? (
                <View className="mt-3 px-3 py-2 bg-[#F3F4F6] rounded-lg">
                  <Text className="text-xs text-[#6B7280]">
                    กำลังไฟสูงสุด
                  </Text>
                  <Text className="text-base font-semibold text-[#1D2144] mt-0.5">
                    {data.powerRating} kW
                  </Text>
                </View>
              ) : null}
              <View className="mt-4 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <View className="flex-row items-center">
                  <Ionicons name="sync" size={14} color="#2D6BAA" />
                  <Text className="ml-2 text-xs text-[#2D6BAA] italic">
                    กำลังเชื่อมต่อเพื่อรับข้อมูล Real-time...
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={handleNavigate} className="self-end mt-6">
        <Text className="text-base font-semibold text-[#36B18F]">
          ดูรายละเอียดการชาร์จ →
        </Text>
      </TouchableOpacity>
    </>
  );
};

type ChargingStatusInlineCardProps = {
  data: ChargingStatusPopupData;
  onClose?: () => void;
  onNavigateToCharging?: () => void;
};

export const ChargingStatusInlineCard: React.FC<
  ChargingStatusInlineCardProps
> = ({ data, onClose, onNavigateToCharging }) => (
  <View className="mb-6">
    <View
      className="w-full rounded-[28px] bg-white px-6 py-6"
      style={{
        shadowColor: "#1B2344",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <ChargingStatusCardContent
        data={data}
        onClose={onClose}
        onNavigateToCharging={onNavigateToCharging}
      />
    </View>
  </View>
);

const ChargingStatusPopup: React.FC<ChargingStatusPopupProps> = ({
  visible,
  data,
  onClose,
  onNavigateToCharging,
  bottomOffset,
}) => {
  const insets = useSafeAreaInsets();

  const containerPaddingBottom = (bottomOffset ?? 120) + insets.bottom;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="items-center justify-end flex-1 px-6 bg-black/40"
        style={{ paddingBottom: containerPaddingBottom }}
      >
        <Pressable className="w-full rounded-[28px] bg-white px-6 py-6">
          <ChargingStatusCardContent
            data={data}
            onClose={onClose}
            onNavigateToCharging={onNavigateToCharging}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ChargingStatusPopup;
