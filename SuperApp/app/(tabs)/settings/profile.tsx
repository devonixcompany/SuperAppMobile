import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    return (
        <SafeAreaView className="flex-1 bg-[#F0F2F5]" edges={['top', 'left', 'right']}>
            {/* Header */}
            <View className="px-4 py-4 flex-row items-center justify-between relative">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="z-10 w-10 h-10 items-center justify-center"
                >
                    <Ionicons name="chevron-back" size={28} color="#6B7280" />
                </TouchableOpacity>

                <View className="absolute left-0 right-0 items-center">
                    <Text className="text-lg font-medium text-[#4B5563]">แก้ไขโปรไฟล์</Text>
                </View>

                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-12 pt-4">
                {/* Profile Picture Section */}
                <View className="items-center mb-8">
                    <View className="w-24 h-24 bg-[#50C878] rounded-full items-center justify-center mb-[-16px] z-10">
                        <Text className="text-4xl text-white font-medium">P</Text>
                    </View>
                    <TouchableOpacity className="bg-white px-4 mt-8 py-2 rounded-full shadow-lg border border-gray-100  pb-2">
                        <Text className="text-gray-600 text-xs font-medium">เปลี่ยนรูปโปรไฟล์</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View className="space-y-5 mb-8 gap-4">
                    <View>
                        <Text className="text-gray-700 mb-2 font-medium">ชื่อบัญชีผู้ใช้</Text>
                        <View className="bg-white  rounded-2xl flex-row items-center px-4 py-3.5 border border-transparent focus:border-blue-500">
                            <TextInput
                                className="flex-1 text-gray-600 text-base"
                                value="User2025001"
                                editable={false}
                            />
                            <TouchableOpacity>
                                <Ionicons name="create-outline" size={22} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View>
                        <Text className="text-gray-700  mb-2 font-medium">ชื่อ-นามสกุล</Text>
                        <View className="bg-white  mrounded-2xl flex-row items-center px-4 py-3.5">
                            <TextInput
                                className="flex-1 text-gray-600 text-base"
                                value="สมชาย ใจดี"
                                editable={false}
                            />
                            <TouchableOpacity>
                                <Ionicons name="create-outline" size={22} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View>
                        <Text className="text-gray-700 mb-2 font-medium">เบอร์โทรศัพท์</Text>
                        <View className="bg-white  rounded-2xl flex-row items-center px-4 py-3.5">
                            <TextInput
                                className="flex-1 text-gray-600 text-base"
                                value="098-xxx-xxxx"
                                editable={false}
                            />
                            <TouchableOpacity>
                                <Ionicons name="create-outline" size={22} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View>
                        <Text className="text-gray-700 mb-2 font-medium">อีเมล</Text>
                        <View className="bg-white   rounded-2xl flex-row items-center px-4 py-3.5">
                            <TextInput
                                className="flex-1 text-gray-400 text-base"
                                placeholder="เพิ่มอีเมล"
                                placeholderTextColor="#9CA3AF"
                                editable={false}
                            />
                            <TouchableOpacity>
                                <Ionicons name="create-outline" size={22} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity className="mb-10 active:opacity-90 mt-20">
                    <LinearGradient
                        colors={[
                            "#1F274B",
                            "#395F85",
                            "#589FAF",
                            "#67C1A5",
                            "#5EC1A0",
                        ]}
                        locations={[0.1, 0.4, 0.7, 0.99, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{
                            borderRadius: 10,
                        }}
                        className="rounded-full py-1.5  items-center justify-center shadow-lg shadow-blue-900/20"
                    >
                        <Text className="text-white  py-4 text-2xl  text-center font-bold">บันทึก</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
