import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export type QuickJumpItem = {
  label: string;
  hint?: string;
  icon?: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  items: QuickJumpItem[];
  onClose: () => void;
};

export function QuickJumpMenu({ visible, title = "Quick Jump", items, onClose }: Props) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" variant="headlineSmall" style={{ color: theme.colors.onBackground }}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close Quick Jump"
            accessibilityHint="Double tap to close this menu."
            style={styles.closeButton}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={item.hint ?? "Double tap to jump there."}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              {item.icon ? (
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              ) : null}
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                {item.label}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={theme.colors.onSurfaceVariant}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    minWidth: 64,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  row: {
    minHeight: 56,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
