import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export type PointCardResponsive = {
  horizontalGutter: number;
  heroPaddingX: number;
  heroPaddingTop: number;
  heroPaddingBottom: number;
  heroCoinSize: number;
  heroPointFontSize: number;
  heroBadgePaddingX: number;
  heroTitleFont: number;
  heroLogoWidth: number;
  heroLogoHeight: number;
  heroSubtitleFont: number;
  heroExpiryFont: number;
  isSmallPhone: boolean;
  isTablet: boolean;
};

export const usePointCardResponsive = (): PointCardResponsive => {
  const { width: screenWidth } = useWindowDimensions();

  return useMemo(() => {
    const isSmallPhone = screenWidth < 360;
    const isLargePhone = screenWidth >= 414 && screenWidth < 768;
    const isTablet = screenWidth >= 768;

    const horizontalGutter = isTablet
      ? 48
      : isLargePhone
        ? 28
        : isSmallPhone
          ? 16
          : 22;

    const heroPaddingX = isTablet ? 10 : isLargePhone ? 10 : isSmallPhone ? 20 : 15;
    const heroPaddingTop = isTablet ? 20 : isSmallPhone ? 10 : 10;
    const heroPaddingBottom = isTablet ? 20 : isSmallPhone ? 5 : 10;
    const heroCoinSize = isTablet ? 30 : isSmallPhone ? 5 : 25;
    const heroPointFontSize = isTablet ? 20 : isSmallPhone ? 5 : 25;
    const heroBadgePaddingX = isTablet ? 26 : isSmallPhone ? 5 : 15;
    const heroTitleFont = isTablet ? 28 : isSmallPhone ? 5 : 18;
    const heroLogoWidth = isTablet ? 140 : isLargePhone ? 100 : isSmallPhone ? 104 : 118;
    const heroLogoHeight = isTablet ? 48 : isLargePhone ? 44 : isSmallPhone ? 34 : 38;
    const heroSubtitleFont = isTablet ? 22 : isSmallPhone ? 16 : 18;
    const heroExpiryFont = isTablet ? 18 : isSmallPhone ? 13 : 15;

    return {
      horizontalGutter,
      heroPaddingX,
      heroPaddingTop,
      heroPaddingBottom,
      heroCoinSize,
      heroPointFontSize,
      heroBadgePaddingX,
      heroTitleFont,
      heroLogoWidth,
      heroLogoHeight,
      heroSubtitleFont,
      heroExpiryFont,
      isSmallPhone,
      isTablet,
    };
  }, [screenWidth]);
};
