import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactScreen() {
    const handleCall = () => {
        Linking.openURL('tel:082-436-0444');
    };

    const handleWebsite = () => {
        Linking.openURL('https://ponix.co.th');
    };

    const handleFacebook = () => {
        Linking.openURL('https://www.facebook.com/PONIX');
    };

    const handleEmail = () => {
        Linking.openURL('mailto:info@ponix.co.th');
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="flex-row items-center px-6 pt-4 pb-2">
                <TouchableOpacity className="w-11 h-11 rounded-full items-center justify-center" onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-xl font-semibold text-[#111827] mr-11">ติดต่อเรา</Text>
            </View>

            <ScrollView className="flex-1 px-8 pt-6" showsVerticalScrollIndicator={false}>
                {/* Logo */}
                <View className="items-center ">
                    <Image
                        source={require('../../../assets/img/logo.png')}
                        className="w-84 h-48"
                        resizeMode="contain"
                    />
                </View>

                {/* Header Text */}
                <View className="mb-6">
                    <Text className="text-center text-sm font-semibold text-gray-800 mb-1">
                        PONIX TRANSFORMING THE WORLD
                    </Text>
                    <Text className="text-center text-sm font-semibold text-gray-800 mb-1">
                        WITH RENEWABLE ENERGY
                    </Text>
                    <Text className="text-center text-xs text-gray-600">
                        โพนิกซ์ เปลี่ยนโลกด้วย พลังงานสะอาด
                    </Text>
                </View>

                {/* Contact Cards */}
                <View className="space-y-3">
                    {/* Phone Card */}
                    <TouchableOpacity
                        onPress={handleCall}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-xl items-center justify-center mr-4">
                                <Ionicons name="call" size={24} color="green" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">เบอร์ครศัพท์</Text>
                                <Text className="text-base font-semibold text-gray-800">082-436-0444</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Website Card */}
                    <TouchableOpacity
                        onPress={handleWebsite}
                        className="bg-white rounded-2xl mt-2 p-5 shadow-sm border border-gray-100"
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-xl items-center justify-center mr-4">
                                <Ionicons name="globe-outline" size={24} color="green" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">เว็บไซต์</Text>
                                <Text className="text-base font-semibold text-gray-800">ponix.co.th</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Facebook Card */}
                    <TouchableOpacity
                        onPress={handleFacebook}
                        className="bg-white rounded-2xl mt-2 p-5 shadow-sm border border-gray-100"
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-xl items-center justify-center mr-4">
                                <Ionicons name="logo-facebook" size={24} color="blue" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">เพจ</Text>
                                <Text className="text-base font-semibold text-gray-800">PONIX</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Email Card */}
                    <TouchableOpacity
                        onPress={handleEmail}
                        className="bg-white rounded-2xl mt-2 p-5 shadow-sm border border-gray-100"
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-xl items-center justify-center mr-4">
                                <Ionicons name="mail" size={24} color="green" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs text-gray-500 mb-1">อีเมล</Text>
                                <Text className="text-base font-semibold text-gray-800">info@ponix.co.th</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacing */}
                <View className="h-8" />
            </ScrollView>
        </SafeAreaView>
    );
}
