import env from "@/config/env";
import {
  normalizeUrlToDevice,
  normalizeWebSocketUrlToDevice,
} from "@/utils/network";
import { Ionicons } from "@expo/vector-icons";
import { BarcodeScanningResult, Camera, CameraView } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ResolvedPayload = {
  requestUrl: string;
  chargePointIdentity?: string;
  connectorId?: number;
};

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setIsProcessing(false);
      return () => setIsProcessing(false);
    }, []),
  );

  const resolveScannedPayload = (raw: string): ResolvedPayload => {
    const value = raw.trim();

    try {
      const parsed = JSON.parse(value);
      const identity =
        parsed.chargePointIdentity ||
        parsed.charge_point_identity ||
        parsed.cpIdentity;
      const connector =
        parsed.connectorId ||
        parsed.connector_id ||
        parsed.connector ||
        parsed.connectorNumber;
      const baseUrl =
        parsed.apiBaseUrl || parsed.api_base_url || parsed.baseUrl || parsed.url;

      if (identity && connector != null) {
        const connectorId = Number(connector);
        if (!Number.isFinite(connectorId)) {
          throw new Error("Connector ID ใน QR Code ไม่ถูกต้อง");
        }

        const apiBase = (baseUrl ?? env.apiUrl).replace(/\/$/, "");
        const requestUrl = `${apiBase}/api/chargepoints/${encodeURIComponent(
          identity,
        )}/${connectorId}/websocket-url`;

        return {
          requestUrl: normalizeUrlToDevice(requestUrl, env.apiUrl),
          chargePointIdentity: identity,
          connectorId,
        };
      }

      if (parsed.endpoint || parsed.apiUrl) {
        return {
          requestUrl: normalizeUrlToDevice(
            (parsed.endpoint || parsed.apiUrl) as string,
            env.apiUrl,
          ),
        };
      }
    } catch {
      // continue to handle as URL/path
    }

    try {
      const fullUrl = new URL(value);
      return {
        requestUrl: normalizeUrlToDevice(fullUrl.toString(), env.apiUrl),
      };
    } catch {
      // not an absolute URL
    }

    if (!value) {
      throw new Error("QR Code ไม่มีข้อมูลสำหรับเรียก API");
    }

    const path = value.startsWith("/") ? value : `/${value}`;
    const requestUrl = `${env.apiUrl.replace(/\/$/, "")}${path}`;

    return {
      requestUrl: normalizeUrlToDevice(requestUrl, env.apiUrl),
    };
  };

  const handleBarCodeScanned = async ({
    data,
  }: BarcodeScanningResult | { data: string }) => {
    if (scanned || isProcessing) {
      return;
    }

    setScanned(true);
    setIsProcessing(true);

    try {
      const payload = resolveScannedPayload(String(data));
      const response = await fetch(payload.requestUrl);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.message ||
          errorBody?.error ||
          `เรียก API ไม่สำเร็จ (${response.status})`;
        throw new Error(message);
      }

      const body = await response.json().catch(() => null);

      const websocketUrl =
        body?.data?.websocketUrl ||
        body?.data?.websocketURL ||
        body?.websocketUrl ||
        body?.websocketURL;

      if (!websocketUrl) {
        throw new Error("ไม่พบ WebSocket URL ในข้อมูลที่ได้รับ");
      }

      const normalizedWs = normalizeWebSocketUrlToDevice(
        websocketUrl,
        env.apiUrl,
      );

      const identity =
        body?.data?.chargePoint?.chargePointIdentity ||
        payload.chargePointIdentity;
      const connectorId =
        body?.data?.connector?.connectorId || payload.connectorId;
      const chargePointData = body?.data?.chargePoint ?? {};
      const pricingTier = body?.data?.pricingTier ?? null;
      const chargePointName = chargePointData?.name;

      const params: Record<string, string> = {
        websocketUrl: normalizedWs,
      };

      if (identity) params.chargePointIdentity = identity;
      if (connectorId != null) params.connectorId = String(connectorId);
      if (chargePointName) params.chargePointName = chargePointName;
      if (chargePointData?.stationName) params.stationName = chargePointData.stationName;
      if (chargePointData?.location) params.stationLocation = chargePointData.location;
      if (chargePointData?.powerRating != null) params.powerRating = String(chargePointData.powerRating);
      if (chargePointData?.brand) params.chargePointBrand = chargePointData.brand;
      if (chargePointData?.protocol) params.protocol = chargePointData.protocol;
      if (pricingTier?.baseRate != null) params.baseRate = String(pricingTier.baseRate);
      if (pricingTier?.currency) params.currency = pricingTier.currency;
      if (pricingTier?.name) params.pricingTierName = pricingTier.name;

      setIsProcessing(false);
      router.push({
        pathname: "/charge-session",
        params,
      });
    } catch (error) {
      console.error("QR scan handling failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "ไม่สามารถประมวลผล QR Code ได้";

      setIsProcessing(false);
      setScanned(false);

      Alert.alert("เชื่อมต่อไม่สำเร็จ", message, [
        {
          text: "ลองใหม่",
          onPress: () => setScanned(false),
        },
        {
          text: "ปิด",
          onPress: () => router.back(),
          style: "cancel",
        },
      ]);
    }
  };

  const toggleTorch = () => setTorchEnabled((prev) => !prev);

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-lg">กำลังขออนุญาตใช้กล้อง...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-6">
        <Ionicons name="camera-off" size={64} color="white" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          ไม่สามารถเข้าถึงกล้องได้
        </Text>
        <Text className="text-white/70 text-center mt-2 mb-6">
          กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่า
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-[#51BC8E] rounded-xl py-4 px-8"
        >
          <Text className="text-white text-lg font-semibold">กลับ</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center justify-between p-6 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
        >
          <Ionicons name="close-outline" size={24} color="white" />
        </TouchableOpacity>

        <Text className="text-white text-lg font-semibold">สแกน QR Code</Text>

        <TouchableOpacity
          onPress={toggleTorch}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
        >
          <Ionicons
            name={torchEnabled ? "flash" : "flash-outline"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          enableTorch={torchEnabled}
        >
          <View className="flex-1 items-center justify-center">
            <View className="relative">
              <View className="w-64 h-64 border-2 border-white/50 rounded-2xl">
                <View className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-[#51BC8E] rounded-tl-lg" />
                <View className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-[#51BC8E] rounded-tr-lg" />
                <View className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-[#51BC8E] rounded-bl-lg" />
                <View className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-[#51BC8E] rounded-br-lg" />
              </View>
            </View>

            <View className="mt-8 items-center bg-black/50 px-6 py-4 rounded-2xl">
              <Text className="text-white text-lg font-semibold mb-2">
                วาง QR Code ในกรอบ
              </Text>
              <Text className="text-white/90 text-center leading-6">
                สแกน QR Code เพื่อเริ่มชาร์จ EV{"\n"}
                หรือทำธุรกรรมอื่นๆ
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      <View className="px-6 pb-6 z-10">
        <Text className="text-white/70 text-sm mb-4">การดำเนินการด่วน</Text>
        <View className="flex-row justify-between">
          {[
            { icon: "flash", title: "ชาร์จ EV", color: "#51BC8E" },
            { icon: "card", title: "จ่ายเงิน", color: "#3B82F6" },
            { icon: "gift", title: "รับโปรโมชั่น", color: "#F59E0B" },
          ].map((action, index) => (
            <TouchableOpacity
              key={index}
              className="bg-white/10 rounded-xl p-4 items-center flex-1 mx-1"
            >
              <Ionicons
                name={action.icon as any}
                size={24}
                color={action.color}
              />
              <Text className="text-white text-xs mt-2 text-center">
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isProcessing && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <ActivityIndicator size="large" color="#51BC8E" />
          <Text className="text-white mt-4">กำลังเตรียมการเชื่อมต่อ...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
