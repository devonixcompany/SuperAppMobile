import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const DESIGN_SPEC = {
  cardWidth: 375,
  cardHeight: 200,
  horizontalMargin: 0,
  heroPaddingX: 10,
  heroPaddingTop: 10,
  heroPaddingBottom: 20,
  heroHeaderGap: 0,
  heroCoinSize: 35,
  heroCoinGap: 9,
  heroSubtitleMarginTop: 5, //ระยะห่างบน คะแนนของฉัน
  heroValueSpacing: 5,
  heroDividerSpacingTop: 25,
  heroDividerSpacingBottom: 5,
  heroBadgeOffsetTop: 20,
  heroBadgeOffsetRight: 20,
  heroBadgePaddingX: 10,
  heroBadgePaddingY: 4,
  heroTitleFont: 20,
  heroSubtitleFont: 20,
  heroPointFontSize: 30,
  heroBadgeFontSize: 12,
  heroExpiryFont: 14, 
};

export type PointCardResponsive = {
  cardHorizontalMargin: number;
  cardWidth: number;
  cardHeight: number;
  heroPaddingX: number;
  heroPaddingTop: number;
  heroPaddingBottom: number;
  heroHeaderGap: number;
  heroCoinSize: number;
  heroPointFontSize: number;
  heroBadgePaddingX: number;
  heroBadgePaddingY: number;
  heroBadgeFontSize: number;
  heroBadgeOffsetTop: number;
  heroBadgeOffsetRight: number;
  heroCoinGap: number;
  heroSubtitleMarginTop: number;
  heroValueSpacing: number;
  heroDividerSpacingTop: number;
  heroDividerSpacingBottom: number;
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

    const cardHorizontalMargin = DESIGN_SPEC.horizontalMargin;

    const baseCardWidth = isTablet ? 420 : DESIGN_SPEC.cardWidth;
    const baseCardHeight = isTablet ? 240 : DESIGN_SPEC.cardHeight;
    const maxWidth = Math.max(screenWidth - cardHorizontalMargin * 2, 160);
    const minWidth = Math.min(220, maxWidth);
    const cardWidth = Math.max(Math.min(baseCardWidth, maxWidth), minWidth);
    const cardHeight = baseCardHeight;

    const heroPaddingX = isTablet
      ? DESIGN_SPEC.heroPaddingX + 16
      : isSmallPhone
        ? DESIGN_SPEC.heroPaddingX - 4
        : DESIGN_SPEC.heroPaddingX;
    const heroPaddingTop = isTablet
      ? DESIGN_SPEC.heroPaddingTop + 12
      : isSmallPhone
        ? DESIGN_SPEC.heroPaddingTop - 2
        : DESIGN_SPEC.heroPaddingTop;
    const heroPaddingBottom = isTablet
      ? DESIGN_SPEC.heroPaddingBottom + 8
      : isSmallPhone
        ? DESIGN_SPEC.heroPaddingBottom - 6
        : DESIGN_SPEC.heroPaddingBottom;
    const heroHeaderGap = isTablet
      ? DESIGN_SPEC.heroHeaderGap + 6
      : isSmallPhone
        ? DESIGN_SPEC.heroHeaderGap - 4
        : DESIGN_SPEC.heroHeaderGap;
    const heroCoinSize = isTablet
      ? DESIGN_SPEC.heroCoinSize + 12
      : isSmallPhone
        ? DESIGN_SPEC.heroCoinSize - 12
        : DESIGN_SPEC.heroCoinSize;
    const heroBadgeOffsetTop = isTablet
      ? DESIGN_SPEC.heroBadgeOffsetTop + 9
      : isSmallPhone
        ? DESIGN_SPEC.heroBadgeOffsetTop - 5
        : DESIGN_SPEC.heroBadgeOffsetTop;
    const heroBadgeOffsetRight = isTablet
      ? DESIGN_SPEC.heroBadgeOffsetRight + 12
      : isSmallPhone
        ? DESIGN_SPEC.heroBadgeOffsetRight - 8
        : DESIGN_SPEC.heroBadgeOffsetRight;
    const heroCoinGap = isTablet
      ? DESIGN_SPEC.heroCoinGap + 2
      : isSmallPhone
        ? DESIGN_SPEC.heroCoinGap - 6
        : DESIGN_SPEC.heroCoinGap;
    const heroPointFontSize = isTablet
      ? DESIGN_SPEC.heroPointFontSize + 6
      : isSmallPhone
        ? DESIGN_SPEC.heroPointFontSize - 6
        : DESIGN_SPEC.heroPointFontSize;
    const heroBadgePaddingX = isTablet
      ? DESIGN_SPEC.heroBadgePaddingX + 10
      : isSmallPhone
        ? DESIGN_SPEC.heroBadgePaddingX - 6
        : DESIGN_SPEC.heroBadgePaddingX;
    const heroBadgePaddingY = isTablet
      ? DESIGN_SPEC.heroBadgePaddingY + 2
      : isSmallPhone
        ? DESIGN_SPEC.heroBadgePaddingY - 2
        : DESIGN_SPEC.heroBadgePaddingY;
    const heroBadgeFontSize = isTablet
      ? DESIGN_SPEC.heroBadgeFontSize + 2
      : isSmallPhone
        ? DESIGN_SPEC.heroBadgeFontSize - 2
        : DESIGN_SPEC.heroBadgeFontSize;
    const heroSubtitleMarginTop = isTablet
      ? DESIGN_SPEC.heroSubtitleMarginTop + 4
      : isSmallPhone
        ? DESIGN_SPEC.heroSubtitleMarginTop - 10
        : DESIGN_SPEC.heroSubtitleMarginTop;
    const heroValueSpacing = isTablet
      ? DESIGN_SPEC.heroValueSpacing + 6
      : isSmallPhone
        ? DESIGN_SPEC.heroValueSpacing - 6
        : DESIGN_SPEC.heroValueSpacing;
    const heroTitleFont = isTablet
      ? DESIGN_SPEC.heroTitleFont + 4
      : isSmallPhone
        ? DESIGN_SPEC.heroTitleFont - 4
        : DESIGN_SPEC.heroTitleFont;
    const heroLogoWidth = isTablet ? 160 : isLargePhone ? 120 : isSmallPhone ? 92 : 100;
    const heroLogoHeight = isTablet ? 52 : isLargePhone ? 44 : isSmallPhone ? 32 : 36;
    const heroSubtitleFont = isTablet
      ? DESIGN_SPEC.heroSubtitleFont + 4
      : isSmallPhone
        ? DESIGN_SPEC.heroSubtitleFont - 4
        : DESIGN_SPEC.heroSubtitleFont;
    const heroDividerSpacingTop = isTablet
      ? DESIGN_SPEC.heroDividerSpacingTop + 6
      : isSmallPhone
        ? DESIGN_SPEC.heroDividerSpacingTop - 8
        : DESIGN_SPEC.heroDividerSpacingTop;
    const heroDividerSpacingBottom = isTablet
      ? DESIGN_SPEC.heroDividerSpacingBottom + 6
      : isSmallPhone
        ? DESIGN_SPEC.heroDividerSpacingBottom - 4
        : DESIGN_SPEC.heroDividerSpacingBottom;
    const heroExpiryFont = isTablet
      ? DESIGN_SPEC.heroExpiryFont + 2
      : isSmallPhone
        ? DESIGN_SPEC.heroExpiryFont - 2
        : DESIGN_SPEC.heroExpiryFont;

    return {
      cardHorizontalMargin,
      cardWidth,
      cardHeight,
      heroPaddingX,
      heroPaddingTop,
      heroPaddingBottom,
      heroHeaderGap,
      heroCoinSize,
      heroPointFontSize,
      heroBadgePaddingX,
      heroBadgePaddingY,
      heroBadgeFontSize,
      heroBadgeOffsetTop,
      heroBadgeOffsetRight,
      heroCoinGap,
      heroSubtitleMarginTop,
      heroValueSpacing,
      heroDividerSpacingTop,
      heroDividerSpacingBottom,
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
