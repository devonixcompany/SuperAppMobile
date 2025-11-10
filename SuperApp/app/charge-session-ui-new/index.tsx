import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

const ChargeSessionUINew = () => {
  const handleStartCharging = () => {
    router.push({
      pathname: "/charge-session-ui-new/summary",
      params: {
        transactionId: "12345678",
        energy: "15.75",
        cost: "126.00",
        durationSeconds: "1800",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        meterStart: "1000.000",
        meterStop: "1015.750",
        stopReason: "Local",
        connectorId: "1",
        chargePointIdentity: "CP001",
        chargePointName: "สเตชั่น สาขาบางเขน",
        currency: "THB",
        rate: "8.00",
      },
    });
  };

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
      {/* Use SafeAreaView to avoid OS UI */}
      <View className="flex-1 bg-[#EEF0F6] pt-12">
        {/* Container with top alignment and padding */}
        <View className=" flex flex-col items-center  ">
          {/* New status card */}
          <View className="rounded-2xl  flex-col  w-full max-w-sm self-center">
            {/* Top section: Status and Power */}
            <View className="flex-row items-center justify-center  w-full pb-4">
              <Ionicons name="flash" size={32} color="black" />
              <View className="ml-4">
                <Text className="text-xl font-bold">0.00 KW</Text>
                <Text className="text-gray-600">เชื่อมต่อเเล้ว</Text>
              </View>
            </View>

            {/* Divider */}
            <View className="w-full border-b border-gray-200 " />

            {/* Middle section: Current Charge and Time */}
            <View className="flex-row justify-around w-full py-2">
              <View className="items-center">
                <Text className="text-gray-500">การชาร์จปัจจุบัน</Text>
                <Text className="font-semibold text-lg">0.00 kWh</Text>
              </View>
              <View className="items-center">
                <Text className="text-gray-500">เวลาที่คาดว่าจะเต็ม</Text>
                <Text className="font-semibold text-lg">0 ชม 00 นาที</Text>
              </View>
            </View>
          </View>
          {/* Car Image */}
          <View className="items-center  ">
            <Image
              source={require("../../assets/images/image.png")}
              style={{ width: 350, height: 200 }}
              resizeMode="contain"
            />
          </View>
          {/* Original details card */}
          <View className="w-full max-w-sm bg-white rounded-2xl  p-6 self-center">
            {/* Card Header: Dark blue section with charger info */}
            <View className="bg-[#1D2144] rounded-t-2xl p-4 flex-row items-center justify-between -mt-6 -mx-6 mb-6">
              {/* Charger Icon */}
              <View className="bg-white p-2 rounded-lg mr-4">
                <Ionicons name="flash" size={24} color="green" />
              </View>
              {/* Charger Details: Power and Rate */}
              <View className=" flex">
                <View className="   flex-col items-end">
                  <Text className="text-white font-bold text-lg">
                    DC 150 kW
                  </Text>
                  <Text className="text-white">
                    อัตราค่าบริการ 8.00 บาท/kWh
                  </Text>
                </View>
              </View>
            </View>

            {/* Session Details Section */}
            <View className=" flex-col gap-6">
              {/* Row for Station Name */}
              <View className="flex-row justify-between">
                <Text className="text-black text-[14px] font-[400]">
                  สถานีชาร์จ
                </Text>
                <Text className="text-[14px] font-[300]">
                  สเตชั่น สาขาบางเขน
                </Text>
              </View>
              {/* Row for Start Time */}
              <View className="flex-row justify-between">
                <Text className="text-blacktext-[14px] font-[400]">
                  เริ่มชาร์จ
                </Text>
                <Text className="font-[300] text-[14px]">00:00:00 น.</Text>
              </View>
              {/* Row for Duration */}
              <View className="flex-row justify-between">
                <Text className="text-black text-[14px] font-[400]">
                  เวลาผ่านไป
                </Text>
                <Text className="font-[300] text-[14px]">00:00:00 น.</Text>
              </View>
              {/* Row for Energy Delivered */}
              <View className="flex-row justify-between">
                <Text className="text-black  text-[14px] font-[400]">
                  พลังงานที่ได้รับ
                </Text>
                <Text className="font-[300] text-[14px]">0.00 kWh</Text>
              </View>
              {/* Row for Cost */}
              <View className="flex-row justify-between">
                <Text className="text-black text-[14px] font-[400]">
                  ค่าบริการ
                </Text>
                <Text className="font-[300] text-[14px]">0.00 บาท</Text>
              </View>
            </View>
          </View>

          {/* Action Button: Start Charging */}
          <TouchableOpacity
            className="w-full max-w-sm self-center mt-10 rounded-lg overflow-hidden"
            onPress={handleStartCharging}
          >
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
              <View className="bg-transparent p-4 items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  เริ่มชาร์จ
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default ChargeSessionUINew;