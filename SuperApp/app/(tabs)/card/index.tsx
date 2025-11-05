// นำเข้า Ionicons สำหรับแสดงไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
// นำเข้า components พื้นฐานจาก React Native
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ฟังก์ชันหลักของหน้า Card (บัตรและกระเป๋าเงิน)
export default function CardScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + 180;

  // ข้อมูลธุรกรรมทั้งหมด (ในโปรเจคจริงจะดึงจาก API)
  const transactions = [
    {
      id: 1, // รหัสธุรกรรม
      type: "charge", // ประเภท: การชาร์จ
      title: "ชาร์จ EV - Central World", // รายละเอียด
      date: "15 ม.ค. 2024", // วันที่
      amount: -120.0, // จำนวนเงิน (ติดลบคือจ่ายออก)
      status: "completed", // สถานะ: สำเร็จ
    },
    {
      id: 2,
      type: "topup", // ประเภท: เติมเงิน
      title: "เติมเงินผ่านบัตรเครดิต",
      date: "14 ม.ค. 2024",
      amount: +500.0, // บวกคือรับเข้า
      status: "completed",
    },
    {
      id: 3,
      type: "charge",
      title: "ชาร์จ EV - Siam Paragon",
      date: "12 ม.ค. 2024",
      amount: -85.5,
      status: "completed",
    },
    {
      id: 4,
      type: "refund", // ประเภท: คืนเงิน
      title: "คืนเงิน - ยกเลิกการชาร์จ",
      date: "10 ม.ค. 2024",
      amount: +45.0,
      status: "completed",
    },
  ];

  // ฟังก์ชันคืนค่าไอคอนตามประเภทธุรกรรม
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "charge":
        return "flash"; // ไอคอนฟ้าผ่า: การชาร์จ
      case "topup":
        return "add-circle"; // ไอคอนบวก: เติมเงิน
      case "refund":
        return "return-up-back"; // ไอคอนคืน: คืนเงิน
      default:
        return "card"; // ไอคอนบัตร: อื่นๆ
    }
  };

  // ฟังก์ชันคืนค่าสีตามจำนวนเงิน (บวก=เขียว, ลบ=แดง)
  const getTransactionColor = (amount: number) => {
    return amount > 0 ? "#10B981" : "#EF4444";
  };

  return (
    // SafeAreaView: ป้องกันเนื้อหาทับกับ notch/status bar
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* === HEADER SECTION === */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-[#1F2937]">
            บัตรและกระเป๋าเงิน
          </Text>
          {/* ปุ่มเพิ่ม (เพิ่มบัตรใหม่) */}
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
            <Ionicons name="add-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ScrollView: ทำให้เนื้อหาเลื่อนได้ */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      >
        <View className="px-6">
          {/* === BALANCE CARD SECTION === */}
          {/* การ์ดแสดงยอดเงินคงเหลือ */}
          <View className="mb-6">
            {/* พื้นหลังไล่สีจากน้ำเงินเข้มไปเขียว */}
            <LinearGradient
              colors={["#1F274B", "#5EC1A0"]}
              start={{ x: 0, y: 0 }} // เริ่มต้นซ้าย
              end={{ x: 1, y: 0 }} // สิ้นสุดขวา
              className="rounded-xl p-6"
            >
              {/* แสดงยอดเงิน */}
              <View className="mb-4">
                <Text className="text-white/80 text-sm">ยอดเงินคงเหลือ</Text>
                <Text className="text-white text-3xl font-bold mt-1">
                  ฿ 1,250.00
                </Text>
              </View>

              {/* ปุ่มเติมเงินและโอนเงิน */}
              <View className="flex-row justify-between">
                {/* ปุ่มเติมเงิน: ขยายเต็มพื้นที่ 1 ส่วน */}
                <TouchableOpacity className="bg-white/20 rounded-lg px-6 py-3 flex-1 mr-2">
                  <Text className="text-white font-semibold text-center">
                    เติมเงิน
                  </Text>
                </TouchableOpacity>
                {/* ปุ่มโอนเงิน: ขยายเต็มพื้นที่ 1 ส่วน */}
                <TouchableOpacity className="bg-white/20 rounded-lg px-6 py-3 flex-1 ml-2">
                  <Text className="text-white font-semibold text-center">
                    โอนเงิน
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* === QUICK ACTIONS SECTION === */}
          {/* ปุ่มด่วนสำหรับการดำเนินการต่างๆ */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">
              การดำเนินการ
            </Text>
            <View className="flex-row justify-between">
              {/* Array ของ actions ทั้งหมด */}
              {[
                { icon: "card-outline", title: "จัดการบัตร", color: "#3B82F6" },
                { icon: "receipt-outline", title: "ประวัติ", color: "#10B981" },
                { icon: "gift-outline", title: "โปรโมชั่น", color: "#F59E0B" },
                {
                  icon: "settings-outline",
                  title: "ตั้งค่า",
                  color: "#6B7280",
                },
              ].map((action, index) => (
                // วนลูปสร้างปุ่มแต่ละอัน
                // กว้าง 22% (4 อันต่อแถว)
                <TouchableOpacity
                  key={index}
                  className="bg-white rounded-xl p-4 items-center shadow-sm"
                  style={{ width: "22%" }}
                >
                  {/* วงกลมไอคอน */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={24}
                      color={action.color}
                    />
                  </View>
                  {/* ชื่อ action */}
                  <Text className="text-xs font-medium text-[#1F2937] text-center">
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* === PAYMENT METHODS SECTION === */}
          {/* แสดงวิธีการชำระเงินที่เชื่อมโยง */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">
              วิธีการชำระเงิน
            </Text>

            {/* บัตรเครดิต */}
            <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {/* ไอคอนบัตร */}
                  <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="card" size={24} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">
                      บัตรเครดิต
                    </Text>
                    {/* แสดงเลขบัตรแบบปิดบางส่วน */}
                    <Text className="text-sm text-[#6B7280]">
                      **** **** **** 1234
                    </Text>
                  </View>
                </View>
                {/* แสดงว่าเป็นบัตรหลัก */}
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  <Text className="text-sm text-[#6B7280]">หลัก</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* บัญชีธนาคาร */}
            <TouchableOpacity className="bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {/* ไอคอนธนาคาร */}
                  <View className="w-12 h-12 bg-green-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="business" size={24} color="#10B981" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">
                      บัญชีธนาคาร
                    </Text>
                    <Text className="text-sm text-[#6B7280]">
                      ธนาคารกสิกรไทย
                    </Text>
                  </View>
                </View>
                {/* ลูกศรชี้ขวา (บ่งบอกว่ากดได้) */}
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#9CA3AF"
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* === RECENT TRANSACTIONS SECTION === */}
          {/* แสดงธุรกรรมล่าสุด */}
          <View className="mb-6">
            {/* หัวข้อและปุ่มดูทั้งหมด */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-[#1F2937]">
                ธุรกรรมล่าสุด
              </Text>
              <TouchableOpacity>
                <Text className="text-sm text-[#51BC8E] font-medium">
                  ดูทั้งหมด
                </Text>
              </TouchableOpacity>
            </View>

            {/* กล่องรายการธุรกรรม */}
            <View className="bg-white rounded-xl shadow-sm">
              {/* วนลูปแสดงแต่ละธุรกรรม */}
              {transactions.map((transaction, index) => (
                <TouchableOpacity
                  key={transaction.id}
                  // ถ้าไม่ใช่รายการสุดท้ายจะมีเส้นขอบด้านล่าง
                  className={`p-4 ${index !== transactions.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      {/* ไอคอนธุรกรรม */}
                      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                        <Ionicons
                          name={getTransactionIcon(transaction.type) as any}
                          size={20}
                          color="#6B7280"
                        />
                      </View>
                      {/* รายละเอียดธุรกรรม */}
                      <View className="flex-1">
                        <Text className="font-medium text-[#1F2937]">
                          {transaction.title}
                        </Text>
                        <Text className="text-sm text-[#6B7280]">
                          {transaction.date}
                        </Text>
                      </View>
                    </View>
                    {/* จำนวนเงิน: สีเขียว(+) หรือ สีแดง(-) */}
                    <Text
                      className="font-semibold"
                      style={{ color: getTransactionColor(transaction.amount) }}
                    >
                      {/* ถ้าบวกให้ใส่ + ข้างหน้า */}
                      {transaction.amount > 0 ? "+" : ""}฿{" "}
                      {Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
