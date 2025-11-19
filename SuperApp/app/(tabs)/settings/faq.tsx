import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const faqItems = [
    {
        id: 'info',
        question: 'สามารถดูข้อมูลสถิติการใช้งานในไทยได้ไหม?',
        answer:
            'ได้เลย! ใน Ponix App คุณสามารถติดตามประวัติการใช้งาน ตารางการชาร์จ และรายละเอียดค่าใช้จ่ายทั้งหมดได้ทันที รวมถึงดูการอัปเดตแบบเรียลไทม์จากสถานีที่คุณเคยใช้งานไว้แล้วอีกด้วย',
    },
    {
        id: 'alert',
        question: 'ถ้ารถของฉันมีปัญหา จะได้รับการแจ้งเตือนอย่างไร?',
        answer:
            'ระบบจะส่งการแจ้งเตือนแบบเรียลไทม์ผ่านแอป พร้อมสรุปปัญหาและวิธีแก้ไขเบื้องต้น ขณะเดียวกันทีมซัพพอร์ตจะติดต่อกลับเพื่อช่วยเหลือทันทีเพื่อให้การใช้งานไม่สะดุด',
    },
    {
        id: 'payment',
        question: 'สามารถชำระค่าบริการหรือทำรายการผ่านแอปพลิเคชันได้หรือไม่?',
        answer:
            'ได้ครับ! Ponix App รองรับการชำระเงินทั้งผ่านบัตรเครดิต, QR Code และ e-Wallet ผู้ใช้งานสามารถเลือกช่องทางที่สะดวกที่สุด และจะมีประวัติการชำระย้อนหลังให้ตรวจสอบได้เสมอ',
    },
    {
        id: 'ev',
        question: 'สามารถเชื่อมต่อกับระบบ EV Charger หรืออุปกรณ์สั่งงานอื่นได้หรือไม่?',
        answer:
            'ตัวแอปออกแบบมาให้เชื่อมต่อกับ EV Charger ที่ได้มาตรฐาน รองรับการสั่งเริ่ม/หยุดการชาร์จผ่านมือถือ พร้อมแสดงสถานะการเชื่อมต่อแบบเรียลไทม์อย่างปลอดภัย',
    },
];

const introCardShadow = {
    shadowColor: '#2D488C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
};

const faqCardShadow = {
    shadowColor: '#2D488C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
};

export default function FAQScreen() {
    const [activeItem, setActiveItem] = useState<string | null>(faqItems[0].id);

    const handleToggle = (id: string) => {
        setActiveItem((prev) => (prev === id ? null : id));
    };

    return (
        <SafeAreaView className="flex-1 pb-32" edges={['top', 'left', 'right']}>


            <View className="flex-row items-center px-6 pt-4 pb-2">
                <TouchableOpacity className="w-11 h-11 rounded-full  items-center justify-center" onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-xl font-semibold text-[#111827] mr-11">คำถามที่พบบ่อย</Text>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
            >
                <View className="rounded-2xl p-6 mt-4 border border-[#E5E9F2]" style={introCardShadow}>
                    <Text className="text-base font-semibold text-[#111827]">“คำถามที่พบบ่อย”</Text>
                    <Text className="text-sm text-[#6B7280] leading-6 mt-3">
                        {`คือศูนย์รวมคำถามและคำตอบที่ผู้ใช้งานมักสอบถามบ่อยเกี่ยวกับการใช้งานแอป Ponix App ไม่ว่าจะเป็นการตรวจสอบสถานะระบบโซล่า การใช้งานฟีเจอร์ การชำระเงิน ไปจนถึงการเชื่อมต่อกับ EV Charger หรืออุปกรณ์สมาร์ทโฮม

เมนูนี้ช่วยให้ผู้ใช้งานค้นหาข้อมูลได้อย่างรวดเร็ว โดยไม่ต้องติดต่อเจ้าหน้าที่ เหมาะสำหรับผู้ใช้งานใหม่ที่ต้องการทำความเข้าใจระบบ และผู้ใช้งานปัจจุบันที่ต้องการแก้ปัญหาเบื้องต้นด้วยตนเอง

เมื่อต้องการคำแนะนำหรือการใช้งานอย่างรวดเร็ว โดยไม่ต้องรอแอดมิน ก็สามารถหาคำตอบได้ในหน้ารวมนี้ เพื่อให้คุณใช้งานแอป และเชื่อมั่นในบริการได้อย่างมั่นใจตลอดเวลา`}
                    </Text>
                </View>

                <View className="mt-6">
                    {faqItems.map((item) => {
                        const isActive = activeItem === item.id;

                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.95}
                                onPress={() => handleToggle(item.id)}
                                className="bg-white rounded-2xl p-4 border border-[#E5E9F2] mb-4"
                                style={faqCardShadow}
                            >
                                <View className="flex-row items-center">
                                    <Text className="flex-1 text-base font-semibold text-[#111827] pr-3">{item.question}</Text>
                                    <Ionicons name={isActive ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
                                </View>
                                {isActive && <Text className="text-sm text-[#6B7280] leading-6 mt-3">{item.answer}</Text>}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
