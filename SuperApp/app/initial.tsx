import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Image } from 'react-native';

export default function InitialScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/terms');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 bg-[#EEF0F6] justify-center items-center">
      <View className="items-center justify-center">
        <Image
          source={require('@/assets/img/logo.png')}
          style={{ width: 220, height: 180 }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
