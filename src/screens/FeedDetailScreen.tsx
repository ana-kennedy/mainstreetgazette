import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { openBrowserAsync } from "expo-web-browser";
import React, { useState } from "react";
import { AccessibilityActionEvent, Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, Divider, Text } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import type { NewsStackParamList, SavedStackParamList, SourcesStackParamList } from "../navigation/types";
import { clockString, contentTypeDisplayName, relativePublishedText } from "../utils/formatting";

type Props =
  | NativeStackScreenProps<NewsStackParamList, "FeedDetail">
  | NativeStackScreenProps<SourcesStackParamList, "FeedDetail">
  | NativeStackScreenProps<SavedStackParamList, "SavedDetail">;

interface DetailAction {
  key: string;
  label: string;
  icon: string;
  mode: "text" | "outlined" | "contained" | "contained-tonal" | "elevated";
  onPress: () => void | Promise<void>;
  accessibilityLabel: string;
  hint: string;
  disabled?: boolean;
  loading?: boolean;
}

export function FeedDetailScreen({ route, navigation }: Props) {
  const { item } = route.params;
  const app = useAppContext();
  const playback = usePlayback();
  const current = app.items.find((candidate) => candidate.id === item.id) ?? item;
  const sourceName = app.sources.find((source) => source.id === current.sourceID)?.name ?? "Unknown website";
  const authorText = current.authorOrChannel && current.authorOrChannel !== sourceName ? current.authorOrChannel : null;
  const contentType = contentTypeDisplayName(current.contentType);
  const publishedText = relativePublishedText(current.publishedAt);
  const durationText = current.durationSeconds ? `Duration ${clockString(current.durationSeconds)}.` : null;
  const headerAccessibilityLabel = [current.title, `Source: ${sourceName}.`, authorText ? `By ${authorText}.` : null, publishedText, durationText]
    .filter(Boolean)
    .join(" ");
  const isPodcastLoading = playback.loadingItemID === current.id;
  const isCurrentPodcast = playback.currentItem?.id === current.id;
  const playLabel = isPodcastLoading ? "Loading" : isCurrentPodcast && playback.isPlaying ? "Playing" : "Play";
  const [areActionsVisible, setAreActionsVisible] = useState(false);
  const isPlayActionDisabled = playback.isLoading || (isCurrentPodcast && playback.isPlaying);
  const saveLabel = current.isSaved ? `Unsave ${contentType.toLowerCase()}` : `Save ${contentType.toLowerCase()}`;
  const saveHint = current.isSaved ? `Double tap to remove this ${contentType.toLowerCase()} from saved items.` : "Double tap to save this item for later.";
  const primaryAction: DetailAction =
    current.contentType === "podcast"
      ? {
          key: "play",
          label: playLabel,
          icon: "play",
          mode: "contained-tonal" as const,
          onPress: () => playback.playItem(current),
          accessibilityLabel: `Play podcast episode ${current.title}`,
          hint: isPodcastLoading ? "Podcast playback is loading." : "Double tap to play this podcast episode.",
          disabled: isPlayActionDisabled,
          loading: isPodcastLoading
        }
      : {
          key: "open",
          label: "Open",
          icon: "open-in-new",
          mode: "contained-tonal" as const,
          onPress: () => {
            const url = current.externalURL ?? current.canonicalURL;
            if (current.contentType === "article" && Platform.OS === "ios" && app.settings?.preferReaderMode) {
              openBrowserAsync(url, { readerMode: true });
            } else {
              Linking.openURL(url);
            }
          },
          accessibilityLabel: `Open ${contentType}`,
          hint: "Double tap to open the original item."
        };
  const detailActions: DetailAction[] = [
    {
      key: "save",
      label: current.isSaved ? "Saved" : "Save",
      icon: current.isSaved ? "bookmark" : "bookmark-outline",
      mode: "contained" as const,
      onPress: () => app.toggleSaved(current.id),
      accessibilityLabel: saveLabel,
      hint: saveHint
    },
    primaryAction,
    ...(current.contentType === "podcast"
      ? [
          {
            key: "queue",
            label: "Queue",
            icon: "playlist-plus",
            mode: "outlined" as const,
            onPress: () => playback.addToQueue(current),
            accessibilityLabel: "Add episode to queue",
            hint: "Double tap to add this podcast episode to the playback queue."
          }
        ]
      : []),
  ];
  const iosAccessibilityActions =
    Platform.OS === "ios"
      ? detailActions
          .filter((action) => !action.disabled)
          .map((action) => ({ name: `action-${action.key}`, label: action.accessibilityLabel }))
      : undefined;

  const handleActionsAccessibilityAction = (event: AccessibilityActionEvent) => {
    const actionKey = event.nativeEvent.actionName.replace("action-", "");
    const selectedAction = detailActions.find((action) => action.key === actionKey && !action.disabled);
    selectedAction?.onPress();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Back"
          accessibilityRole="button"
          accessibilityHint="Double tap to return to the previous screen."
        >
          Back
        </Button>
        <View accessible accessibilityRole="header" accessibilityLabel={headerAccessibilityLabel} style={styles.titleBlock}>
          <Chip accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {contentType}
          </Chip>
          <Text variant="headlineSmall">
            {current.title}
          </Text>
          <Text variant="bodyLarge">{sourceName}</Text>
          {authorText ? <Text variant="bodyMedium">By {authorText}</Text> : null}
          <Text variant="bodyMedium">{publishedText}</Text>
          {durationText ? <Text variant="bodyMedium">{durationText}</Text> : null}
        </View>
        <Divider />
        <Text variant="bodyLarge" accessibilityLabel={current.summary ?? "No summary was provided by this source."}>
          {current.summary ?? "No summary was provided by this source."}
        </Text>
        <View style={styles.actions}>
          <Button
            mode="outlined"
            icon="dots-horizontal"
            onPress={() => setAreActionsVisible((currentValue) => !currentValue)}
            accessibilityLabel={`Actions button ${areActionsVisible ? "expanded" : "collapsed"}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: areActionsVisible }}
            accessibilityHint={
              Platform.OS === "ios"
                ? areActionsVisible
                  ? "Swipe up or down to choose an action. Double tap to collapse."
                  : "Swipe up or down to choose an action. Double tap to expand."
                : areActionsVisible
                  ? "Double tap to collapse actions."
                  : "Double tap to expand actions."
            }
            accessibilityActions={iosAccessibilityActions}
            onAccessibilityAction={Platform.OS === "ios" ? handleActionsAccessibilityAction : undefined}
          >
            Actions
          </Button>
          {areActionsVisible
            ? detailActions.map((action) => (
                <Button
                  key={action.key}
                  mode={action.mode}
                  icon={action.icon}
                  onPress={action.onPress}
                  loading={action.loading}
                  disabled={action.disabled}
                  accessibilityLabel={action.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: action.disabled, busy: action.loading }}
                  accessibilityHint={action.hint}
                >
                  {action.label}
                </Button>
              ))
            : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16
  },
  titleBlock: {
    gap: 8
  },
  backButton: {
    alignSelf: "flex-start"
  },
  actions: {
    gap: 10
  }
});
