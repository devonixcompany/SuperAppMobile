declare module "expo-blur" {
  import type { ComponentType } from "react";
  import type { ViewProps } from "react-native";

  export interface BlurViewProps extends ViewProps {
    intensity?: number;
    tint?:
      | "default"
      | "light"
      | "dark"
      | "extraLight"
      | "systemUltraThinMaterial"
      | "systemThinMaterial"
      | "systemMaterial"
      | "systemThickMaterial";
    experimentalBlurMethod?: "none" | "systemMaterial";
    reducedTransparencyFallbackColor?: string;
  }

  export const BlurView: ComponentType<BlurViewProps>;
  export default BlurView;
}
