import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  }
});
