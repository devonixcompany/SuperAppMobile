import React, { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";

export default function DebugEnvScreen() {
  const extras = Constants.expoConfig?.extra || {};

  const rows = useMemo(() => {
    const keys = [
      "appEnv",
      "apiUrl",
      "firebaseApiKey",
      "firebaseAuthDomain",
      "firebaseProjectId",
      "firebaseStorageBucket",
      "firebaseMessagingSenderId",
      "firebaseAppId",
      "firebaseMeasurementId",
      "recaptchaSiteKey",
      "omisePublicKey",
      "googleMapsApiKey",
    ];
    const mask = (v: any, reveal: boolean) => {
      if (typeof v !== "string") return String(v ?? "");
      if (reveal) return v;
      if (v.length <= 8) return "****";
      return `${v.slice(0, 6)}…${v.slice(-4)}`;
    };
    return keys.map((k) => {
      const v = (extras as any)[k];
      const isPublic = k === "appEnv" || k === "apiUrl";
      return { key: k, value: mask(v, isPublic), present: v != null };
    });
  }, [extras]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: "#E5E7EB", backgroundColor: "white" }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>Debug Environment</Text>
        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>ตรวจค่าจาก Constants.expoConfig.extra</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: "#374151" }}>Status: {Constants.expoConfig ? "Loaded" : "Unavailable"}</Text>
        </View>
        {rows.map((r) => (
          <View key={r.key} style={{ backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{r.key}</Text>
            <Text style={{ fontSize: 14, color: r.present ? "#111827" : "#EF4444", marginTop: 4 }}>
              {r.present ? r.value : "undefined"}
            </Text>
          </View>
        ))}
        <TouchableOpacity onPress={() => router.replace("/login")} style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: "#51BC8E", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 }}>
          <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>กลับไปหน้าเข้าสู่ระบบ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}