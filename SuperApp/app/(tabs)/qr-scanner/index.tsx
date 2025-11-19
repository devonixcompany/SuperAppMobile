import env from "@/config/env";
import { ApiError, chargepointService } from "@/services/api";
import {
  clearCredentials,
  clearTokens,
  getCredentials,
  getTokens,
} from "@/utils/keychain";
import {
  normalizeUrlToDevice,
  normalizeWebSocketUrlToDevice,
} from "@/utils/network";
import { Ionicons } from "@expo/vector-icons";
import { BarcodeScanningResult, Camera, CameraView } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

type ChargePointDetails = {
  name?: string;
  stationName?: string;
  location?: string;
  powerRating?: number;
  brand?: string;
  protocol?: string;
};

type PricingTierInfo = {
  baseRate?: number;
  currency?: string;
  name?: string;
};

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isHandlingScanRef = useRef(false);

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      isHandlingScanRef.current = false;
      setScanned(false);
      setIsProcessing(false);
      return () => {
        isHandlingScanRef.current = false;
        setIsProcessing(false);
      };
    }, []),
  );

  const resolveScannedPayload = (raw: string): ResolvedPayload => {
    const value = raw.trim();
    console.log('QR Scanner Debug - Raw input to resolveScannedPayload:', value);

    try {
      const parsed = JSON.parse(value);
      console.log('QR Scanner Debug - Parsed JSON:', parsed);
      
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
        const requestUrl = `${apiBase}/api/v1/user/chargepoints/${encodeURIComponent(
          identity,
        )}/${connectorId}/websocket-url`;

        console.log('QR Scanner Debug - Direct identity/connector found:', { identity, connectorId });
        return {
          requestUrl: normalizeUrlToDevice(requestUrl, env.apiUrl),
          chargePointIdentity: identity,
          connectorId,
        };
      }

      // Handle requestUrl field - extract chargePointIdentity and connectorId from URL
      if (parsed.requestUrl) {
        let urlString = parsed.requestUrl;
        
        // Clean up the URL string - remove spaces and backticks
        urlString = urlString.trim();
        urlString = urlString.replace(/^`+|`+$/g, ''); // Remove backticks from start and end
        urlString = urlString.trim(); // Trim again after removing backticks
        
        console.log('QR Scanner Debug - Cleaned URL:', urlString);
        
        try {
          const url = new URL(urlString);
          // Extract from path: /api/v1/user/chargepoints/{identity}/{connectorId}/websocket-url
          const pathParts = url.pathname.split('/');
          const chargepointsIndex = pathParts.indexOf('chargepoints');
          
          console.log('QR Scanner Debug - Path parts:', pathParts);
          console.log('QR Scanner Debug - Chargepoints index:', chargepointsIndex);
          
          if (chargepointsIndex !== -1 && pathParts.length > chargepointsIndex + 2) {
            const extractedIdentity = decodeURIComponent(pathParts[chargepointsIndex + 1]);
            const extractedConnectorId = Number(pathParts[chargepointsIndex + 2]);
            
            console.log('QR Scanner Debug - Extracted Identity:', extractedIdentity);
            console.log('QR Scanner Debug - Extracted Connector ID:', extractedConnectorId);
            
            if (extractedIdentity && Number.isFinite(extractedConnectorId)) {
              const result = {
                requestUrl: normalizeUrlToDevice(urlString, env.apiUrl),
                chargePointIdentity: extractedIdentity,
                connectorId: extractedConnectorId,
              };
              
              console.log('QR Scanner Debug - Final parsed result:', result);
              return result;
            }
          }
        } catch (urlError) {
          console.warn('QR Scanner Debug - Failed to parse requestUrl as URL:', urlError);
          console.warn('QR Scanner Debug - URL string was:', urlString);
        }
        
        // Fallback: return just the requestUrl
        console.log('QR Scanner Debug - Using fallback, returning requestUrl only');
        return {
          requestUrl: normalizeUrlToDevice(urlString, env.apiUrl),
        };
      }

      if (parsed.endpoint || parsed.apiUrl) {
        console.log('QR Scanner Debug - Using endpoint/apiUrl fallback');
        return {
          requestUrl: normalizeUrlToDevice(
            (parsed.endpoint || parsed.apiUrl) as string,
            env.apiUrl,
          ),
        };
      }
    } catch (parseError) {
      console.log('QR Scanner Debug - JSON parse failed:', parseError);
      // continue to handle as URL/path
    }

    try {
      // Clean up the value - remove backticks and trim spaces
      let cleanedValue = value.trim();
      cleanedValue = cleanedValue.replace(/^`+|`+$/g, ''); // Remove backticks from start and end
      cleanedValue = cleanedValue.trim(); // Trim again after removing backticks
      
      console.log('QR Scanner Debug - Cleaned direct URL:', cleanedValue);
      
      const fullUrl = new URL(cleanedValue);
      console.log('QR Scanner Debug - Treating as direct URL');
      
      // Try to extract chargePointIdentity and connectorId from the URL path
      const pathParts = fullUrl.pathname.split('/');
      const chargepointsIndex = pathParts.indexOf('chargepoints');
      
      console.log('QR Scanner Debug - Direct URL path parts:', pathParts);
      console.log('QR Scanner Debug - Direct URL chargepoints index:', chargepointsIndex);
      
      if (chargepointsIndex !== -1 && pathParts.length > chargepointsIndex + 2) {
        const extractedIdentity = decodeURIComponent(pathParts[chargepointsIndex + 1]);
        const extractedConnectorId = Number(pathParts[chargepointsIndex + 2]);
        
        console.log('QR Scanner Debug - Direct URL extracted Identity:', extractedIdentity);
        console.log('QR Scanner Debug - Direct URL extracted Connector ID:', extractedConnectorId);
        
        if (extractedIdentity && Number.isFinite(extractedConnectorId)) {
          const result = {
            requestUrl: normalizeUrlToDevice(cleanedValue, env.apiUrl),
            chargePointIdentity: extractedIdentity,
            connectorId: extractedConnectorId,
          };
          
          console.log('QR Scanner Debug - Direct URL final result:', result);
          return result;
        }
      }
      
      return {
        requestUrl: normalizeUrlToDevice(cleanedValue, env.apiUrl),
      };
    } catch {
      // continue to handle as path
    }

    if (!value) {
      throw new Error("QR Code ไม่มีข้อมูลสำหรับเรียก API");
    }

    console.log('QR Scanner Debug - Treating as path');
    const path = value.startsWith("/") ? value : `/${value}`;
    const requestUrl = `${env.apiUrl.replace(/\/$/, "")}${path}`;

    return {
      requestUrl: normalizeUrlToDevice(requestUrl, env.apiUrl),
    };
  };

  const handleBarCodeScanned = async ({
    data,
  }: BarcodeScanningResult | { data: string }) => {
    if (isHandlingScanRef.current || scanned || isProcessing) {
      return;
    }

    isHandlingScanRef.current = true;
    setScanned(true);
    setIsProcessing(true);

    try {
      // ดึง user credentials เพื่อเอา user ID
      const credentials = await getCredentials();
      if (!credentials?.id) {
        throw new Error("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
      }

      // ดึง authentication tokens
      const tokens = await getTokens();
      if (!tokens?.accessToken) {
        throw new Error("ไม่พบ access token กรุณาเข้าสู่ระบบใหม่");
      }

      console.log('QR Scanner Debug - Raw data:', String(data));

      const payload = resolveScannedPayload(String(data));

      console.log('QR Scanner Debug - Payload:', payload);
      console.log('QR Scanner Debug - User ID:', credentials.id);
      console.log('QR Scanner Debug - Access Token:', tokens.accessToken ? 'Present' : 'Missing');

      // Extract chargePointIdentity and connectorId from payload
      if (!payload.chargePointIdentity || !payload.connectorId) {
        throw new Error("QR Code ไม่มีข้อมูลเครื่องชาร์จหรือหัวชาร์จที่ถูกต้อง");
      }

      // Use chargepoint service to get WebSocket URL
      let response;
      try {
        response = await chargepointService.getWebSocketUrl(
          payload.chargePointIdentity,
          payload.connectorId,
          {
            userId: credentials.id,
          }
        );
      } catch (apiError: any) {
        // จัดการ error จาก API โดยเฉพาะ
        console.log('QR Scanner Debug - API Error caught:', apiError);

        // ตรวจสอบว่าเป็น error 402 (Payment Required)
        if (apiError?.status === 402 || apiError?.data?.code === 'NO_PAYMENT_CARDS') {
          console.log('🚫 [QR] User has no payment cards, redirecting to add card page');

          setIsProcessing(false);

          Alert.alert(
            "กรุณาเพิ่มบัตร",
            apiError?.data?.message || apiError?.message || "กรุณาเพิ่มบัตรเครดิตก่อนใช้งานเครื่องชาร์จ",
            [
              {
                text: "ยกเลิก",
                style: "cancel",
                onPress: () => {
                  setScanned(false);
                  isHandlingScanRef.current = false;
                }
              },
              {
                text: "เพิ่มบัตร",
                onPress: () => {
                  setScanned(false);
                  isHandlingScanRef.current = false;
                  router.push("/card" as never);
                }
              }
            ]
          );
          return;
        }

        // ถ้าไม่ใช่ error เรื่องบัตร ให้ throw ต่อไป
        throw apiError;
      }

      console.log('QR Scanner Debug - Service Response:', response);

      if (!response.success) {
        throw new Error(response.error || response.message || "ไม่สามารถเรียก API ได้");
      }

      if (!response.data) {
        throw new Error("ไม่พบข้อมูลในการตอบกลับจากเซิร์ฟเวอร์");
      }

      const body = response.data;

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
      const chargePointData =
        (body?.data?.chargePoint || body?.chargePoint || {}) as ChargePointDetails;
      const pricingTier =
        (body?.data?.pricingTier || body?.pricingTier || null) as PricingTierInfo | null;
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
        pathname: "/charge-session/loading",
        params,
      });
    } catch (error) {
      console.error("QR scan handling failed", error);

      setIsProcessing(false);
      setScanned(false);
      isHandlingScanRef.current = false;

      const apiError = error as ApiError | undefined;

      // ตรวจสอบว่าเป็น error 401 (Unauthorized)
      if (apiError?.status === 401) {
        await clearTokens();
        await clearCredentials();
        Alert.alert("เซสชันหมดอายุ", "กรุณาเข้าสู่ระบบใหม่", [
          {
            text: "ไปหน้าเข้าสู่ระบบ",
            onPress: () => router.replace("/login" as never),
          },
        ]);
        return;
      }

      // ตรวจสอบว่าเป็น error 402 (Payment Required) - กรณีที่ไม่ได้ถูกจัดการใน inner catch
      if (apiError?.status === 402) {
        Alert.alert(
          "กรุณาเพิ่มบัตร",
          apiError?.data?.message || apiError?.message || "กรุณาเพิ่มบัตรเครดิตก่อนใช้งานเครื่องชาร์จ",
          [
            {
              text: "ยกเลิก",
              style: "cancel",
              onPress: () => {
                setScanned(false);
                isHandlingScanRef.current = false;
              }
            },
            {
              text: "เพิ่มบัตร",
              onPress: () => {
                setScanned(false);
                isHandlingScanRef.current = false;
                router.push("/card" as never);
              }
            }
          ]
        );
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "ไม่สามารถประมวลผล QR Code ได้";

      Alert.alert("เชื่อมต่อไม่สำเร็จ", message, [
        {
          text: "ลองใหม่",
          onPress: () => {
            setScanned(false);
            isHandlingScanRef.current = false;
          },
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
        <Ionicons name="camera-outline" size={64} color="white" />
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
          {/* Camera Overlay Content */}
          <View style={StyleSheet.absoluteFillObject} className="flex-1">
            {/* Top Status Bar */}
    

            {/* Center Scanning Frame */}
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
                  สแกน QR Code เพื่อเริ่มชาร์จ EV
                </Text>
              </View>
            </View>

       
          </View>
        </CameraView>
      </View>

    {/*   <View className="px-6 pb-6 z-10">
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
 */}
      {isProcessing && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <ActivityIndicator size="large" color="#51BC8E" />
          <Text className="text-white mt-4">กำลังเตรียมการเชื่อมต่อ...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
