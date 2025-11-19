import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
    return (
        <SafeAreaView className="flex-1 bg-[#F5F7FA] " edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="px-4 py-4 flex-row items-center shadow-sm z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 w-10 h-10 items-center justify-center rounded-full ">
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-xl font-semibold text-[#1F2937]">นโยบายความเป็นส่วนตัว</Text>
            </View>

            <ScrollView className="flex-1 p-4 pt-10">
                <View className=" p-6 rounded-xl shadow-sm">
                    <Text className="font-bold text-lg mb-4 text-gray-800">นโยบายความเป็นส่วนตัว</Text>
                    <Text className="text-gray-600 leading-6 mb-4">
                        เราให้ความสำคัญกับความเป็นส่วนตัวของคุณ...
                    </Text>
                    <Text className="text-gray-600 leading-6 mb-4">
                        1. การเก็บรวบรวมข้อมูล
                        {"\n"}
                        เราเก็บรวบรวมข้อมูลเพื่อให้บริการที่ดีที่สุดแก่คุณ...
                    </Text>
                    <Text className="text-gray-600 leading-6 mb-4">
                        2. การใช้ข้อมูล
                        {"\n"}
                        ข้อมูลของคุณจะถูกใช้เพื่อปรับปรุงประสบการณ์การใช้งาน...
                    </Text>
                    <Text className="text-gray-600 leading-6">
                        3. ความปลอดภัย
                        {"\n"}
                        เรามีมาตรการรักษาความปลอดภัยที่เข้มงวด...
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
