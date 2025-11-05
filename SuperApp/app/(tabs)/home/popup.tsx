import { http } from "@/services/api";
import { getCredentials } from "@/utils/keychain";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_TRANSACTION_STATUS = "ACTIVE";

type RawTransaction = {
  status?: string;
  transactionStatus?: string;
  state?: string;
  [key: string]: any;
};

const getStatusString = (transaction: RawTransaction) => {
  const candidates = [
    transaction.status,
    transaction.transactionStatus,
    transaction.state,
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

    if (status && status.toUpperCase() === ACTIVE_TRANSACTION_STATUS) {
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

    const endpoint = `/api/transactions/user/${credentials.id}`;
    const response = await http.get<any>(endpoint);
    const payload = response?.data ?? response;
    const activeTransaction = extractActiveTransaction(payload);

    if (!activeTransaction) {
      return { data: null, hadError: false };
    }

    const status = getStatusString(activeTransaction);
    if (!status || status.toUpperCase() !== ACTIVE_TRANSACTION_STATUS) {
      return { data: null, hadError: false };
    }

    const { seconds, minutes } = deriveRemainingTime(activeTransaction);

    return {
      data: {
        status,
        currentPowerKw: derivePowerKw(activeTransaction),
        estimatedRemainingSeconds: seconds,
        estimatedRemainingMinutes: minutes,
        chargePointName: deriveChargePointName(activeTransaction),
        connectorName: deriveConnectorName(activeTransaction),
        transactionId:
          activeTransaction.transactionId ??
          activeTransaction.id ??
          activeTransaction.transactionID ??
          null,
      },
      hadError: false,
    };
  } catch (error) {
    console.error("โหลดข้อมูลธุรกรรมการชาร์จไม่สำเร็จ:", error);
    return { data: null, hadError: true };
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
          return;
        }

        intervalId = setInterval(async () => {
          const next = await loadActiveTransaction();
          if (cancelled || next.hadError) {
            return;
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

const ChargingStatusPopup: React.FC<ChargingStatusPopupProps> = ({
  visible,
  data,
  onClose,
  onNavigateToCharging,
  bottomOffset,
}) => {
  const insets = useSafeAreaInsets();
  const powerText = formatPower(data?.currentPowerKw);
  const durationText = formatDuration(
    data?.estimatedRemainingSeconds,
    data?.estimatedRemainingMinutes,
  );

  const handleNavigate = () => {
    if (onNavigateToCharging) {
      onNavigateToCharging();
      return;
    }
    onClose?.();
  };

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
              <View className="flex-row items-start justify-between">
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
                </View>
                {onClose ? (
                  <TouchableOpacity
                    onPress={onClose}
                    className="items-center justify-center w-8 h-8 rounded-full bg-[#F3F4F6]"
                  >
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text className="mt-4 text-sm text-[#1D2144]">
                การชาร์จปัจจุบัน{" "}
                <Text className="font-semibold">{powerText} kW</Text>
              </Text>
              <Text className="mt-1 text-sm text-[#1D2144]">
                เวลาที่คาดว่าจะเต็ม{" "}
                <Text className="font-semibold">{durationText}</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleNavigate}
            className="self-end mt-6"
          >
            <Text className="text-base font-semibold text-[#36B18F]">
              กลับสู่หน้าการชาร์จ
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ChargingStatusPopup;
