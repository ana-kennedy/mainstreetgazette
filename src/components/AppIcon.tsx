import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";

let SymbolView: React.ComponentType<{
  name: string;
  size?: number;
  tintColor?: string;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: string;
}> | null = null;
try {
  SymbolView = require("expo-symbols").SymbolView;
} catch {}

interface AppIconProps {
  symbol: string;
  fallback: string;
  size?: number;
  color?: string;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
}

export function AppIcon({
  symbol,
  fallback,
  size = 24,
  color,
  accessibilityElementsHidden,
  importantForAccessibility,
}: AppIconProps) {
  if (Platform.OS === "ios" && SymbolView) {
    return (
      <SymbolView
        name={symbol}
        size={size}
        tintColor={color}
        accessibilityElementsHidden={accessibilityElementsHidden}
        importantForAccessibility={importantForAccessibility}
      />
    );
  }
  return (
    <MaterialCommunityIcons
      name={fallback as any}
      size={size}
      color={color}
      accessibilityElementsHidden={accessibilityElementsHidden}
      importantForAccessibility={importantForAccessibility}
    />
  );
}
