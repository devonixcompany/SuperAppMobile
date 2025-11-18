import React, { useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Image,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CoinSvg from "@/assets/img/twemoji_coin.svg";
import { usePointCardResponsive } from "@/hooks/usePointCardResponsive";

type TouchableScaleProps = PressableProps & {
  className?: string;
  androidRippleColor?: string;
  children: React.ReactNode;
  activeOpacity?: number;
};

type PointsCardProps = {
  points: number | string;
  memberId?: string;
  footerText?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const DEFAULT_POINTS_CARD_PROPS: Pick<
  PointsCardProps,
  "points" | "memberId" | "footerText"
> = {
  points: 9999,
  memberId: "PN00000",
  footerText: "ชาร์จรับเหรียญคืน 1% ของจำนวนเงิน",
};

const ponixLogo = require("@/assets/img/ponix-logo-06.png");
const GRADIENT_COLORS = [
  "#1F274B",
  "#395F85",
  "#589FAF",
  "#67C1A5",
  "#5EC1A0",
] as const;

const TouchableScale = ({
  className,
  children,
  androidRippleColor,
  onPressIn,
  onPressOut,
  android_ripple,
  activeOpacity,
  style,
  ...restProps
}: TouchableScaleProps) => {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    Animated.spring(pressAnim, {
      toValue: 1,
      speed: 20,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    Animated.spring(pressAnim, {
      toValue: 0,
      speed: 18,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
    onPressOut?.(event);
  };

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  const targetOpacity = activeOpacity ?? 0.85;
  const contentOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, targetOpacity],
  });

  return (
    <Pressable
      {...restProps}
      className={className}
      style={style}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={
        androidRippleColor
          ? { color: androidRippleColor, borderless: false }
          : android_ripple
      }
    >
      <Animated.View
        style={{
          transform: [{ scale }, { translateY }],
          opacity: contentOpacity,
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

const HOME_GRADIENT_LOCATIONS = [0.1, 0.4, 0.7, 0.99, 1] as const;

const getCoinWrapperSize = (responsiveSize: number) => responsiveSize + 2;
const getCoinSize = (responsiveSize: number) => responsiveSize;

export default function PointsCard({
  points = DEFAULT_POINTS_CARD_PROPS.points,
  memberId = DEFAULT_POINTS_CARD_PROPS.memberId,
  footerText = DEFAULT_POINTS_CARD_PROPS.footerText,
  onPress,
  disabled = false,
  style,
}: PointsCardProps) {
  const pointResponsive = usePointCardResponsive();

  const badgeBorderWidth = 0.5;
  const badgeBackgroundColor = "rgba(243, 245, 250, 0.5)";

  const bottomText = footerText ?? DEFAULT_POINTS_CARD_PROPS.footerText;
  const pointsLabel = `${points} Ponix`;

  return (
    <View style={[{ marginBottom: 20, alignSelf: "stretch" }, style]}>
      <TouchableScale
        activeOpacity={0.9}
        onPress={onPress}
        disabled={disabled}
        style={{
          alignSelf: "stretch",
          marginHorizontal: pointResponsive.cardHorizontalMargin,
        }}
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          locations={HOME_GRADIENT_LOCATIONS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            minHeight: pointResponsive.cardHeight,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            paddingHorizontal: pointResponsive.heroPaddingX,
            paddingTop: pointResponsive.heroPaddingTop,
            paddingBottom: pointResponsive.heroPaddingBottom,
            shadowColor: "#0B1E2B",
            shadowOpacity: 0.25,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
            position: "relative",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Image
              source={ponixLogo}
              resizeMode="contain"
              style={{
                width: pointResponsive.heroLogoWidth,
                height: pointResponsive.heroLogoHeight,
                marginLeft: pointResponsive.heroLogoMarginLeft,
                marginRight: pointResponsive.heroLogoMarginRight,
              }}
            />
            <Text
              style={{
                fontSize: pointResponsive.heroTitleFont,
                fontWeight: "600",
                color: "#F3F6FF",
              }}
            >
              Point
            </Text>
          </View>

          <View
            style={{
              position: "absolute",
              top: pointResponsive.heroBadgeOffsetTop,
              right: pointResponsive.heroBadgeOffsetRight,
              borderRadius: 999,
              paddingHorizontal: pointResponsive.heroBadgePaddingX,
              paddingVertical: pointResponsive.heroBadgePaddingY,
              borderWidth: badgeBorderWidth,
              borderColor: "#FFFFFF",
              backgroundColor: badgeBackgroundColor,
              shadowColor: "#0F172A",
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <Text
              style={{
                fontSize: pointResponsive.heroBadgeFontSize,
                fontWeight: "400",
                color: "#1B2344",
              }}
            >
              รหัสสมาชิก {memberId}
            </Text>
          </View>

          <Text
            style={{
              marginTop: pointResponsive.heroSubtitleMarginTop,
              fontSize: pointResponsive.heroSubtitleFont,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            เหรียญของฉัน
          </Text>

          <View
            style={{ marginTop: pointResponsive.heroValueSpacing }}
            className="flex-row items-center"
          >
            <View
            className="items-center justify-center rounded-full bg-white/15"
            style={{
              width: getCoinWrapperSize(pointResponsive.heroCoinSize),
              height: getCoinWrapperSize(pointResponsive.heroCoinSize),
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <CoinSvg
              width={getCoinSize(pointResponsive.heroCoinSize)}
              height={getCoinSize(pointResponsive.heroCoinSize)}
            />
          </View>
            <Text
              style={{
                marginLeft: pointResponsive.heroCoinGap,
                fontSize: pointResponsive.heroPointFontSize,
                fontWeight: "800",
                color: "#FFFFFF",
              }}
            >
              {pointsLabel}
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "rgba(255,255,255,0.35)",
              marginTop: pointResponsive.heroDividerSpacingTop,
              marginBottom: pointResponsive.heroDividerSpacingBottom,
            }}
          />

          <Text
            style={{
              fontSize: pointResponsive.heroExpiryFont,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {bottomText}
          </Text>
        </LinearGradient>
      </TouchableScale>
    </View>
  );
}
