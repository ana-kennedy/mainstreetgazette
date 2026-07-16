import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import type { DiscoveryItem, DiscoverySection } from "../intelligence/phase8/types";

interface DiscoveryShelfProps {
  sections: DiscoverySection[];
  onPressItem: (item: DiscoveryItem) => void;
}

const MEDIA_LABEL_MAP: Record<string, string> = {
  article: "ARTICLE",
  video: "VIDEO",
  podcast: "PODCAST",
  community: "COMMUNITY",
  official: "OFFICIAL",
};

function MediaBadge({ label }: { label: string }) {
  const theme = useTheme();
  const isOfficial = label === "official";
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isOfficial
            ? theme.colors.primaryContainer
            : theme.colors.surfaceVariant,
        },
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text
        variant="labelSmall"
        style={{
          color: isOfficial ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 0.5,
        }}
      >
        {MEDIA_LABEL_MAP[label] ?? label.toUpperCase()}
      </Text>
    </View>
  );
}

function DiscoveryCard({
  item,
  onPress,
}: {
  item: DiscoveryItem;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityHint={item.accessibilityHint}
    >
      {item.isBreaking ? (
        <View style={[styles.breakingStripe, { backgroundColor: theme.colors.error }]}>
          <Text
            style={{ color: theme.colors.onError, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            BREAKING
          </Text>
        </View>
      ) : null}

      <View style={styles.cardBody}>
        <MediaBadge label={item.mediaLabel} />
        <Text
          variant="titleSmall"
          numberOfLines={3}
          style={[styles.headline, { color: theme.colors.onSurface }]}
        >
          {item.headline}
        </Text>
        {item.sourceName ? (
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {item.sourceName}
          </Text>
        ) : null}
        <Text
          variant="bodySmall"
          numberOfLines={2}
          style={[styles.reasonLabel, { color: theme.colors.primary }]}
        >
          {item.reasonLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export function DiscoveryShelf({ sections, onPressItem }: DiscoveryShelfProps) {
  const theme = useTheme();

  if (sections.length === 0) return null;

  return (
    <View style={styles.container} accessibilityRole="list" accessibilityLabel="Personalized recommendations">
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text
            variant="titleMedium"
            style={[styles.sectionHeader, { color: theme.colors.onSurface }]}
            accessibilityRole="header"
          >
            {section.label}
          </Text>
          <FlatList
            horizontal
            data={section.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DiscoveryCard item={item} onPress={() => onPressItem(item)} />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shelfRow}
          />
        </View>
      ))}
      <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    fontWeight: "600",
  },
  shelfRow: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 10,
  },
  card: {
    width: 196,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  breakingStripe: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: "center",
  },
  cardBody: {
    padding: 12,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  headline: {
    fontWeight: "500",
    lineHeight: 18,
  },
  reasonLabel: {
    marginTop: 8,
    fontSize: 11,
    fontStyle: "italic",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
});
