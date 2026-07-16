import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, ProgressBar, Text, useTheme } from "react-native-paper";
import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { usePlayback } from "../context/PlaybackContext";
import { clockString } from "../utils/formatting";

export function PlayerScreen() {
  const playback = usePlayback();
  const theme = useTheme();
  const navigation = useNavigation();
  const backButton = (
    <IconButton
      icon="arrow-left"
      size={28}
      onPress={() => navigation.goBack()}
      style={styles.backButton}
      accessibilityLabel="Back"
      accessibilityRole="button"
      accessibilityHint="Double tap to go back."
    />
  );
  if (!playback.currentItem) {
    return (
      <Screen>
        {backButton}
        <EmptyState title="No podcast loaded" body="Choose a podcast episode from News or Saved to begin playback." />
      </Screen>
    );
  }
  const progress = playback.durationSeconds > 0 ? playback.currentTimeSeconds / playback.durationSeconds : 0;
  const safeProgress = Number.isFinite(progress) ? progress : 0;

  return (
    <Screen>
      {backButton}
      <View style={styles.content}>
        <View accessible accessibilityRole="summary" accessibilityLabel={`Player. ${playback.currentItem.title}. ${playback.isLoading ? "Loading" : playback.isPlaying ? "Playing" : "Paused"}.`}>
          <Text variant="headlineSmall" accessibilityRole="header">
            {playback.currentItem.title}
          </Text>
          <Text variant="bodyLarge">{playback.currentItem.authorOrChannel ?? "Podcast"}</Text>
        </View>
        <Text variant="bodyLarge" accessibilityLabel={playback.isLoading ? "Loading audio." : `Playback position ${clockString(playback.currentTimeSeconds)} of ${clockString(playback.durationSeconds)}.`}>
          {playback.isLoading ? "Loading audio" : `${clockString(playback.currentTimeSeconds)} of ${clockString(playback.durationSeconds)}`}
        </Text>
        <ProgressBar
          progress={safeProgress}
          accessibilityLabel="Playback progress"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(safeProgress * 100), text: `${clockString(playback.currentTimeSeconds)} of ${clockString(playback.durationSeconds)}` }}
        />
        <View style={styles.transport}>
          <IconButton
            icon="rewind-15"
            size={40}
            disabled={playback.isLoading}
            onPress={() => playback.skipBackward()}
            accessibilityLabel="Skip back 15 seconds"
            accessibilityRole="button"
            accessibilityState={{ disabled: playback.isLoading }}
            accessibilityHint="Double tap to rewind playback by 15 seconds."
          />
          <IconButton
            icon={playback.isPlaying ? "pause-circle" : "play-circle"}
            size={64}
            disabled={playback.isLoading}
            onPress={playback.togglePlayPause}
            accessibilityLabel={playback.isPlaying ? "Pause podcast" : "Play podcast"}
            accessibilityRole="button"
            accessibilityState={{ disabled: playback.isLoading, busy: playback.isLoading }}
            accessibilityHint="Double tap to toggle playback."
          />
          <IconButton
            icon="fast-forward-30"
            size={40}
            disabled={playback.isLoading}
            onPress={() => playback.skipForward()}
            accessibilityLabel="Skip forward 30 seconds"
            accessibilityRole="button"
            accessibilityState={{ disabled: playback.isLoading }}
            accessibilityHint="Double tap to advance playback by 30 seconds."
          />
        </View>
        <Text variant="bodyLarge">Speed</Text>
        <View style={[styles.speedRow, { borderColor: theme.colors.outline }]} accessible={false}>
          {[
            { value: "0.75", label: "0.75x", accessibilityLabel: "Playback speed 0.75 times" },
            { value: "1", label: "1x", accessibilityLabel: "Normal speed" },
            { value: "1.25", label: "1.25x", accessibilityLabel: "Playback speed 1.25 times" },
            { value: "1.5", label: "1.5x", accessibilityLabel: "Playback speed 1.5 times" },
            { value: "2", label: "2x", accessibilityLabel: "Playback speed 2 times" }
          ].map((option) => {
            const isSelected = String(playback.currentSpeed) === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.speedButton,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.outline
                  }
                ]}
                onPress={() => playback.setSpeed(Number(option.value))}
                accessible
                accessibilityRole="button"
                accessibilityLabel={option.accessibilityLabel}
                accessibilityState={{ selected: isSelected }}
                accessibilityHint={isSelected ? "Currently selected." : "Double tap to select."}
              >
                <Text style={{ color: isSelected ? theme.colors.onPrimary : theme.colors.primary }}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 18,
    justifyContent: "center"
  },
  transport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16
  },
  speedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: "hidden"
  },
  speedButton: {
    minHeight: 48,
    minWidth: 88,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12
  }
});
