import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "react-native-paper";

interface PlainSearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export function PlainSearchField({ value, onChangeText, placeholder, accessibilityLabel, accessibilityHint }: PlainSearchFieldProps) {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        style={[styles.input, { color: theme.colors.onSurface }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12
  },
  input: {
    minHeight: 44,
    fontSize: 17
  }
});
