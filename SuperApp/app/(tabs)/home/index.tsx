// นำเข้า Ionicons สำหรับใช้ไอคอนต่างๆ
import { Ionicons } from "@expo/vector-icons";
// นำเข้า LinearGradient สำหรับสร้างพื้นหลังแบบไล่สี
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
// นำเข้า components พื้นฐานจาก React Native
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
// นำเข้า SafeAreaView เพื่อหลีกเลี่ยงพื้นที่ notch และ status bar
import { SafeAreaView } from "react-native-safe-area-context";

// ฟังก์ชันหลักของหน้า Home
export default function HomeScreen() {
  return (
    // SafeAreaView: ป้องกันเนื้อหาทับกับ notch/status bar, ตั้งพื้นหลังเป็นสีเทาอ่อน
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* ScrollView: ทำให้เนื้อหาสามารถเลื่อนได้, ซ่อน scrollbar */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ส่วนหลัก: padding ด้านข้าง 6, บนล่าง 4 และ 6 */}
        <View className="px-6 pt-4 pb-6">
          {/* === HEADER SECTION === */}
          {/* แสดงข้อความทักทายและปุ่มแจ้งเตือน */}
          <View className="flex-row items-center justify-between mb-6">
            <View>
              {/* ข้อความต้อนรับขนาดใหญ่ */}
              <Text className="text-2xl font-bold text-[#1F2937]">สวัสดี!</Text>
              {/* ข้อความรอง */}
              <Text className="text-base text-[#6B7280] mt-1">
                ยินดีต้อนรับสู่ SuperApp
              </Text>
            </View>
            {/* ปุ่มแจ้งเตือน: วงกลมขนาด 10x10 พื้นหลังขาว มีเงา */}
            <TouchableOpacity className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#1F2937"
              />
            </TouchableOpacity>
          </View>

          {/* === QUICK ACTIONS SECTION === */}
          {/* ปุ่มด่วนสำหรับ Charging และ QR Scanner */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">
              การดำเนินการด่วน
            </Text>
            {/* แสดง 2 ปุ่มในแนวนอน */}
            <View className="flex-row justify-between">
              {/* ปุ่ม Charging EV: ขยายเต็มพื้นที่ 1 ส่วน, มาร์จินขวา 2 */}
              <TouchableOpacity className="flex-1 mr-2">
                {/* พื้นหลังไล่สีเขียว */}
                <LinearGradient
                  colors={["#51BC8E", "#3B9F73"]}
                  className="rounded-xl p-4 items-center"
                >
                  <Ionicons name="flash" size={32} color="white" />
                  <Text className="text-white font-semibold mt-2">
                    ชาร์จ EV
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* ปุ่ม QR Scanner: ขยายเต็มพื้นที่ 1 ส่วน, มาร์จินซ้าย 2 */}
              <TouchableOpacity className="flex-1 ml-2">
                {/* พื้นหลังไล่สีน้ำเงินเข้ม */}
                <LinearGradient
                  colors={["#1F274B", "#2D3A5F"]}
                  className="rounded-xl p-4 items-center"
                >
                  <Ionicons name="qr-code" size={32} color="white" />
                  <Text className="text-white font-semibold mt-2">สแกน QR</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* === BALANCE CARD SECTION === */}
          {/* การ์ดแสดงยอดเงินคงเหลือ */}
          <View className="mb-6">
            {/* พื้นหลังไล่สีจากน้ำเงินเข้มไปเขียว (แนวนอน) */}
            <LinearGradient
              colors={["#1F274B", "#5EC1A0"]}
              start={{ x: 0, y: 0 }} // เริ่มต้นซ้าย
              end={{ x: 1, y: 0 }} // สิ้นสุดขวา
              className="rounded-xl p-6"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  {/* ข้อความ "ยอดเงินคงเหลือ" ความโปร่งใส 80% */}
                  <Text className="text-white/80 text-sm">ยอดเงินคงเหลือ</Text>
                  {/* แสดงจำนวนเงิน */}
                  <Text className="text-white text-2xl font-bold mt-1">
                    ฿ 1,250.00
                  </Text>
                </View>
                {/* ปุ่มเติมเงิน: พื้นหลังขาวโปร่งใส 20% */}
                <TouchableOpacity className="bg-white/20 rounded-lg px-4 py-2">
                  <Text className="text-white font-semibold">เติมเงิน</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* === RECENT ACTIVITIES SECTION === */}
          {/* แสดงรายการกิจกรรมล่าสุด */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">
              กิจกรรมล่าสุด
            </Text>
            {/* กล่องสีขาวมีเงา */}
            <View className="bg-white rounded-xl p-4 shadow-sm">
              {/* รายการที่ 1: ชาร์จ EV */}
              {/* มีเส้นขอบด้านล่าง */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                <View className="flex-row items-center">
                  {/* ไอคอนวงกลมพื้นหลังเขียวอ่อน */}
                  <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="flash" size={20} color="#51BC8E" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">
                      ชาร์จ EV สำเร็จ
                    </Text>
                    <Text className="text-sm text-[#6B7280]">
                      สถานี Central World
                    </Text>
                  </View>
                </View>
                {/* แสดงจำนวนเงินที่ใช้ (ติดลบ) */}
                <Text className="text-sm text-[#6B7280]">-฿ 120.00</Text>
              </View>

              {/* รายการที่ 2: เติมเงิน */}
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  {/* ไอคอนวงกลมพื้นหลังน้ำเงินอ่อน */}
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="add" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="font-semibold text-[#1F2937]">
                      เติมเงินเข้าบัญชี
                    </Text>
                    <Text className="text-sm text-[#6B7280]">
                      ผ่านบัตรเครดิต
                    </Text>
                  </View>
                </View>
                {/* แสดงจำนวนเงินที่เติม (สีเขียว) */}
                <Text className="text-sm text-green-600">+฿ 500.00</Text>
              </View>
            </View>
          </View>

          {/* === SERVICES GRID SECTION === */}
          {/* แสดงบริการทั้งหมดในรูปแบบตาราง */}
          <View>
            <Text className="text-lg font-semibold text-[#1F2937] mb-4">
              บริการทั้งหมด
            </Text>
            {/* flex-wrap: ทำให้ขึ้นบรรทัดใหม่เมื่อเต็ม */}
            <View className="flex-row flex-wrap justify-between">
              {/* Array ของบริการทั้งหมด: ไอคอน, ชื่อ, สี */}
              {[
                { icon: "car-outline", title: "จองที่จอด", color: "#3B82F6" },
                { icon: "map-outline", title: "แผนที่", color: "#10B981" },
                { icon: "receipt-outline", title: "ประวัติ", color: "#F59E0B" },
                {
                  icon: "help-circle-outline",
                  title: "ช่วยเหลือ",
                  color: "#EF4444",
                },
              ].map((service, index) => (
                // วนลูปสร้างปุ่มบริการแต่ละอัน
                // w-[48%]: กว้าง 48% (2 อันต่อแถว)
                <TouchableOpacity
                  key={index} // key สำหรับ React (ต้องมีตอนวนลูป)
                  className="w-[48%] bg-white rounded-xl p-4 items-center mb-4 shadow-sm"
                >
                  {/* วงกลมไอคอน: พื้นหลังใช้สีจาก service.color โปร่งใส 20% */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: `${service.color}20` }}
                  >
                    {/* แสดงไอคอนตาม service.icon */}
                    <Ionicons
                      name={service.icon as any}
                      size={24}
                      color={service.color}
                    />
                  </View>
                  {/* แสดงชื่อบริการ */}
                  <Text className="text-sm font-medium text-[#1F2937]">
                    {service.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
