import React from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, ProgressBar, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayback } from "../context/PlaybackContext";
import { clockString } from "../utils/formatting";

export function MiniPlayer() {
  const playback = usePlayback();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  if (!playback.currentItem) return null;
  const progress = playback.durationSeconds > 0 ? playback.currentTimeSeconds / playback.durationSeconds : 0;
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const statusText = playback.isLoading ? "Loading" : playback.isPlaying ? "Playing" : "Paused";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          borderTopColor: theme.colors.outline,
          bottom: insets.bottom + 56
        }
      ]}
      accessible={false}
    >
      <ProgressBar
        progress={safeProgress}
        accessibilityLabel="Playback progress"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(safeProgress * 100), text: `${clockString(playback.currentTimeSeconds)} of ${clockString(playback.durationSeconds)}` }}
      />
      <View style={styles.titleRow}>
        <View
          style={styles.titleText}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`Podcast player. ${playback.currentItem.title}. ${statusText}. ${clockString(playback.currentTimeSeconds)} of ${clockString(playback.durationSeconds)}.`}
        >
          <Text variant="labelLarge" numberOfLines={1}>
            {playback.currentItem.title}
          </Text>
          <Text variant="bodySmall">
            {playback.isLoading ? "Loading audio" : `${clockString(playback.currentTimeSeconds)} of ${clockString(playback.durationSeconds)}`}
          </Text>
        </View>
        <IconButton
          icon={playback.isPlaying ? "pause" : "play"}
          disabled={playback.isLoading}
          onPress={playback.togglePlayPause}
          accessibilityLabel={playback.isPlaying ? "Pause podcast" : "Play podcast"}
          accessibilityRole="button"
          accessibilityState={{ disabled: playback.isLoading, busy: playback.isLoading }}
          accessibilityHint="Double tap to toggle podcast playback."
        />
        <IconButton
          icon="close"
          onPress={playback.stop}
          accessibilityLabel="Close podcast player and stop playback"
          accessibilityRole="button"
          accessibilityHint="Double tap to stop playback and dismiss this bar."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 10,
    right: 10,
    zIndex: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 6
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  titleText: {
    flex: 1
  }
});
