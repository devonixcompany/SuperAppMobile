import { Tabs, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import BottomNavigation from "../../components/ui/bottom-navigation";

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // Hide default tab bar
      }}
      tabBar={(props) => (
        <BottomNavigation
          activeTab={props.state.routeNames[props.state.index]}
          onTabPress={(tab) => {
            const routeIndex = props.state.routeNames.findIndex(
              (name) => name === tab,
            );
            if (routeIndex !== -1) {
              props.navigation.navigate(props.state.routeNames[routeIndex]);
            }
          }}
          onQRPress={() => {
            router.push("/qr-scanner");
          }}
        />
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="charging" />
      <Tabs.Screen name="card" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
