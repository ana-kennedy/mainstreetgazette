import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, Divider, Text } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import type { NewsStackParamList, SavedStackParamList } from "../navigation/types";
import { buildFeedItemAccessibility } from "../utils/accessibility";
import { clockString, relativePublishedText } from "../utils/formatting";

type Props =
  | NativeStackScreenProps<NewsStackParamList, "FeedDetail">
  | NativeStackScreenProps<SavedStackParamList, "SavedDetail">;

export function FeedDetailScreen({ route }: Props) {
  const { item } = route.params;
  const app = useAppContext();
  const playback = usePlayback();
  const current = app.items.find((candidate) => candidate.id === item.id) ?? item;
  const payload = buildFeedItemAccessibility(current);
  const isPodcastLoading = playback.loadingItemID === current.id;
  const isCurrentPodcast = playback.currentItem?.id === current.id;
  const playLabel = isPodcastLoading ? "Loading" : isCurrentPodcast && playback.isPlaying ? "Playing" : "Play";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View accessible accessibilityRole="summary" accessibilityLabel={payload.label} accessibilityHint={payload.hint} style={styles.titleBlock}>
          <Chip accessibilityLabel={`${current.contentType} type`} accessibilityRole="text">
            {current.contentType}
          </Chip>
          <Text variant="headlineSmall" accessibilityRole="header">
            {current.title}
          </Text>
          <Text variant="bodyLarge">{current.authorOrChannel ?? "Unknown Source"}</Text>
          <Text variant="bodyMedium">{relativePublishedText(current.publishedAt)}</Text>
          {current.durationSeconds ? <Text variant="bodyMedium">Duration {clockString(current.durationSeconds)}</Text> : null}
        </View>
        <Divider />
        <Text variant="bodyLarge">{current.summary ?? "No summary was provided by this source."}</Text>
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon={current.isSaved ? "bookmark" : "bookmark-outline"}
            onPress={() => app.toggleSaved(current.id)}
            accessibilityLabel={current.isSaved ? "Unsave article" : "Save article"}
            accessibilityRole="button"
            accessibilityHint={current.isSaved ? "Double tap to remove this from saved articles." : "Double tap to save this item for later."}
          >
            {current.isSaved ? "Saved" : "Save"}
          </Button>
          {current.contentType === "podcast" ? (
            <>
              <Button
                mode="contained-tonal"
                icon="play"
                onPress={() => playback.playItem(current)}
                loading={isPodcastLoading}
                disabled={playback.isLoading || (isCurrentPodcast && playback.isPlaying)}
                accessibilityLabel={`Play podcast episode ${current.title}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: playback.isLoading || (isCurrentPodcast && playback.isPlaying), busy: isPodcastLoading }}
                accessibilityHint={isPodcastLoading ? "Podcast playback is loading." : "Double tap to play this podcast episode."}
              >
                {playLabel}
              </Button>
              <Button
                mode="outlined"
                icon="playlist-plus"
                onPress={() => playback.addToQueue(current)}
                accessibilityLabel="Add episode to queue"
                accessibilityRole="button"
                accessibilityHint="Double tap to add this podcast episode to the playback queue."
              >
                Queue
              </Button>
            </>
          ) : (
            <Button
              mode="contained-tonal"
              icon="open-in-new"
              onPress={() => Linking.openURL(current.externalURL ?? current.canonicalURL)}
              accessibilityLabel={`Open ${current.contentType}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to open the original item."
            >
              Open
            </Button>
          )}
          <Button
            mode="outlined"
            icon="flag-outline"
            onPress={() => app.setCheckpointAtItem(current)}
            accessibilityLabel="Set checkpoint here"
            accessibilityRole="button"
            accessibilityHint="Double tap to mark newer feed items as new."
          >
            Checkpoint
          </Button>
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
  actions: {
    gap: 10
  }
});
