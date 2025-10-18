import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: () => {
            // Clear stored credentials and navigate to login
            router.replace('/login');
          },
        },
      ]
    );
  };

  const settingSections = [
    {
      title: 'บัญชีผู้ใช้',
      items: [
        {
          icon: 'person-outline',
          title: 'ข้อมูลส่วนตัว',
          subtitle: 'แก้ไขข้อมูลโปรไฟล์',
          onPress: () => console.log('Profile pressed'),
          showArrow: true,
        },
        {
          icon: 'shield-checkmark-outline',
          title: 'ความปลอดภัย',
          subtitle: 'เปลี่ยนรหัสผ่าน, PIN',
          onPress: () => console.log('Security pressed'),
          showArrow: true,
        },
        {
          icon: 'card-outline',
          title: 'วิธีการชำระเงิน',
          subtitle: 'จัดการบัตรและบัญชี',
          onPress: () => console.log('Payment methods pressed'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'การตั้งค่าแอป',
      items: [
        {
          icon: 'notifications-outline',
          title: 'การแจ้งเตือน',
          subtitle: 'รับการแจ้งเตือนจากแอป',
          onPress: () => setNotificationsEnabled(!notificationsEnabled),
          showSwitch: true,
          switchValue: notificationsEnabled,
        },
        {
          icon: 'finger-print-outline',
          title: 'ล็อกด้วยลายนิ้วมือ',
          subtitle: 'ใช้ลายนิ้วมือเพื่อเข้าแอป',
          onPress: () => setBiometricEnabled(!biometricEnabled),
          showSwitch: true,
          switchValue: biometricEnabled,
        },
        {
          icon: 'moon-outline',
          title: 'โหมดมืด',
          subtitle: 'เปลี่ยนธีมแอป',
          onPress: () => setDarkModeEnabled(!darkModeEnabled),
          showSwitch: true,
          switchValue: darkModeEnabled,
        },
        {
          icon: 'language-outline',
          title: 'ภาษา',
          subtitle: 'ไทย',
          onPress: () => console.log('Language pressed'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'ช่วยเหลือและสนับสนุน',
      items: [
        {
          icon: 'help-circle-outline',
          title: 'ศูนย์ช่วยเหลือ',
          subtitle: 'คำถามที่พบบ่อย',
          onPress: () => console.log('Help center pressed'),
          showArrow: true,
        },
        {
          icon: 'chatbubble-outline',
          title: 'ติดต่อเรา',
          subtitle: 'แชทกับทีมสนับสนุน',
          onPress: () => console.log('Contact us pressed'),
          showArrow: true,
        },
        {
          icon: 'star-outline',
          title: 'ให้คะแนนแอป',
          subtitle: 'ช่วยเราปรับปรุงแอป',
          onPress: () => console.log('Rate app pressed'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'เกี่ยวกับ',
      items: [
        {
          icon: 'document-text-outline',
          title: 'เงื่อนไขการใช้งาน',
          subtitle: 'อ่านเงื่อนไขและข้อตกลง',
          onPress: () => console.log('Terms pressed'),
          showArrow: true,
        },
        {
          icon: 'lock-closed-outline',
          title: 'นโยบายความเป็นส่วนตัว',
          subtitle: 'การใช้ข้อมูลส่วนบุคคล',
          onPress: () => console.log('Privacy pressed'),
          showArrow: true,
        },
        {
          icon: 'information-circle-outline',
          title: 'เวอร์ชันแอป',
          subtitle: 'v1.0.0',
          onPress: () => console.log('Version pressed'),
          showArrow: false,
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-[#1F2937]">ตั้งค่า</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View className="px-6 mb-6">
          <TouchableOpacity className="bg-white rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-[#51BC8E] rounded-full items-center justify-center mr-4">
                <Text className="text-white text-xl font-bold">JD</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-[#1F2937]">John Doe</Text>
                <Text className="text-sm text-[#6B7280]">john.doe@example.com</Text>
                <Text className="text-sm text-[#6B7280]">+66 81 234 5678</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        <View className="px-6">
          {settingSections.map((section, sectionIndex) => (
            <View key={sectionIndex} className="mb-6">
              <Text className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">
                {section.title}
              </Text>
              <View className="bg-white rounded-xl shadow-sm">
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    onPress={item.onPress}
                    className={`p-4 ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name={item.icon as any} size={20} color="#6B7280" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium text-[#1F2937]">{item.title}</Text>
                        <Text className="text-sm text-[#6B7280] mt-1">{item.subtitle}</Text>
                      </View>
                      {item.showSwitch && (
                        <Switch
                          value={item.switchValue}
                          onValueChange={item.onPress}
                          trackColor={{ false: '#D1D5DB', true: '#51BC8E' }}
                          thumbColor={item.switchValue ? '#FFFFFF' : '#FFFFFF'}
                        />
                      )}
                      {item.showArrow && (
                        <Ionicons name="chevron-forward-outline" size={20} color="#9CA3AF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-xl p-4 shadow-sm mb-6"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-[#EF4444] font-semibold ml-2">ออกจากระบบ</Text>
            </View>
          </TouchableOpacity>

          {/* Add some bottom padding for the tab bar */}
          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}