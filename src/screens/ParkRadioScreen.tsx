import React, { useCallback } from "react";
import { AccessibilityInfo, FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import * as WebBrowser from "expo-web-browser";
import { Screen } from "../components/Screen";
import { PARK_RADIO_STATIONS, type ParkRadioStation } from "../data/parkRadioStations";

export function ParkRadioScreen() {
  const theme = useTheme();

  const openStation = useCallback(async (station: ParkRadioStation) => {
    AccessibilityInfo.announceForAccessibility(`Opening ${station.name}'s official listening page.`);
    await WebBrowser.openBrowserAsync(station.officialListenURL, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  }, []);

  const openAppStore = useCallback(async (station: ParkRadioStation) => {
    if (!station.officialAppStoreURL) return;
    AccessibilityInfo.announceForAccessibility(`Opening ${station.name} on the App Store.`);
    await WebBrowser.openBrowserAsync(station.officialAppStoreURL, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  }, []);

  return (
    <Screen>
      <FlatList
        data={PARK_RADIO_STATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="headlineMedium" accessibilityRole="header">Park Radio</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Step into independent stations inspired by Disney parks and entertainment. Nothing plays until you choose a station.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card
            mode="outlined"
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${item.name}. ${item.description}`}
            accessibilityHint="Double tap to open the station's official listening page."
            onPress={() => openStation(item)}
          >
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium" accessibilityRole="header">{item.name}</Text>
              <Text>{item.description}</Text>
              {item.availabilityNote ? (
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{item.availabilityNote}</Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  mode="contained-tonal"
                  icon="radio"
                  onPress={() => openStation(item)}
                  accessibilityLabel={`Listen to ${item.name}`}
                  accessibilityHint={`Opens ${item.name}'s official listening page.`}
                >
                  Official Listen Page
                </Button>
                {item.officialAppStoreURL ? (
                  <Button
                    mode="outlined"
                    icon="apple"
                    onPress={() => openAppStore(item)}
                    accessibilityLabel={`${item.name} on the App Store`}
                    accessibilityHint={`Opens ${item.name}'s official App Store page.`}
                  >
                    App Store
                  </Button>
                ) : null}
              </View>
            </Card.Content>
          </Card>
        )}
        ListFooterComponent={
          <Text style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}>
            Park Radio connects you with independent stations operated by their respective owners. Main Street Gazette does not operate, relay, record, or control these broadcasts. Availability and programming may change.
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { gap: 8, marginBottom: 8 },
  cardContent: { gap: 10 },
  actions: { gap: 8, alignItems: "flex-start" },
  disclaimer: { fontSize: 13, lineHeight: 18, marginTop: 8 },
});
