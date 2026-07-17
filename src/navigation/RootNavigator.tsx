import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { DarkTheme, DefaultTheme, NavigationContainer, createNavigationContainerRef, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
// Loaded at runtime — falls back to MaterialCommunityIcons in Expo Go.
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
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { FeedDetailScreen } from "../screens/FeedDetailScreen";
import { StoryDetailScreen } from "../screens/StoryDetailScreen";
import { NewsTabScreen } from "../screens/NewsTabScreen";
import { DiscoverTabScreen } from "../screens/DiscoverTabScreen";
import { ForYouTabScreen } from "../screens/ForYouTabScreen";
import { GazetteLibraryScreen } from "../screens/GazetteLibraryScreen";
import { TripCompanionScreen } from "../screens/TripCompanionScreen";
import { SourcesScreen } from "../screens/SourcesScreen";
import { SourceFeedScreen } from "../screens/SourceFeedScreen";
import { SourceManageScreen } from "../screens/SourceManageScreen";
import { ParksScreen } from "../screens/ParksScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { MyMagicScreen } from "../screens/MyMagicScreen";
import { CollectionScreen } from "../screens/CollectionScreen";
import { SourceLibraryScreen } from "../screens/SourceLibraryScreen";
import { UserGuideScreen } from "../screens/UserGuideScreen";
import { WhatsNewScreen } from "../screens/WhatsNewScreen";
import { AccessibilityGuideScreen } from "../screens/AccessibilityGuideScreen";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { EntityProfileScreen } from "../screens/EntityProfileScreen";
import { NewsPreferencesScreen } from "../screens/NewsPreferencesScreen";
import { GazetteAlertsScreen } from "../screens/GazetteAlertsScreen";
import { AccessibilityPreferencesScreen } from "../screens/AccessibilityPreferencesScreen";
import { ReadingExperienceScreen } from "../screens/ReadingExperienceScreen";
import { GazetteLibrarySettingsScreen } from "../screens/GazetteLibrarySettingsScreen";
import { ExploreDisneyPreferencesScreen } from "../screens/ExploreDisneyPreferencesScreen";
import { AboutGazetteScreen } from "../screens/AboutGazetteScreen";
import { DeveloperToolsScreen } from "../screens/DeveloperToolsScreen";
import { EntityGraphScreen } from "../screens/EntityGraphScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { QuickJumpMenu, type QuickJumpItem } from "../components/QuickJumpMenu";
import type {
  DiscoverStackParamList,
  ForYouStackParamList,
  NewsStackParamList,
  RootTabParamList,
  SettingsStackParamList,
} from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const NewsStack = createNativeStackNavigator<NewsStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const ForYouStack = createNativeStackNavigator<ForYouStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const navigationRef = createNavigationContainerRef<RootTabParamList>();

function NewsStackNavigator() {
  const { playBack } = useSounds();
  const { t } = useTranslation();
  return (
    <NewsStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={{ beforeRemove: () => playBack() }}
    >
      <NewsStack.Screen name="NewsHome" component={NewsTabScreen} />
      <NewsStack.Screen name="FeedDetail" component={FeedDetailScreen} options={{ title: t("screens.story") }} />
      <NewsStack.Screen name="StoryDetail" component={StoryDetailScreen} options={{ title: t("storyDetail.title") }} />
      <NewsStack.Screen name="EntityProfile" component={EntityProfileScreen} options={({ route }) => ({ title: route.params.entityName, headerShown: true })} />
      <NewsStack.Screen name="Player" component={PlayerScreen} options={{ title: t("screens.player") }} />
    </NewsStack.Navigator>
  );
}

function DiscoverStackNavigator() {
  const { playBack } = useSounds();
  const { t } = useTranslation();
  return (
    <DiscoverStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={{ beforeRemove: () => playBack() }}
    >
      <DiscoverStack.Screen name="DiscoverHome" component={DiscoverTabScreen} />
      <DiscoverStack.Screen name="FeedDetail" component={FeedDetailScreen} options={{ title: t("screens.story") }} />
      <DiscoverStack.Screen name="StoryDetail" component={StoryDetailScreen} options={{ title: t("storyDetail.title") }} />
      <DiscoverStack.Screen name="CollectionDetail" component={CollectionScreen as any} options={{ title: t("collections.screenTitle") }} />
      <DiscoverStack.Screen name="EntityProfile" component={EntityProfileScreen} options={({ route }) => ({ title: route.params.entityName, headerShown: true })} />
      <DiscoverStack.Screen name="ParksHome" component={ParksScreen as any} />
      <DiscoverStack.Screen name="EntityGraph" component={EntityGraphScreen as any} options={{ title: "Entity Graph", headerShown: true }} />
      <DiscoverStack.Screen name="SourcesHome" component={SourcesScreen as any} />
      <DiscoverStack.Screen name="SourceFeed" component={SourceFeedScreen as any} options={{ title: t("screens.sourceFeed"), headerShown: true }} />
      <DiscoverStack.Screen name="SourceManage" component={SourceManageScreen as any} options={{ title: t("screens.manageSources"), headerShown: true }} />
      <DiscoverStack.Screen name="Player" component={PlayerScreen} options={{ title: t("screens.player") }} />
    </DiscoverStack.Navigator>
  );
}

function ForYouStackNavigator() {
  const { playBack } = useSounds();
  const { t } = useTranslation();
  return (
    <ForYouStack.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={{ beforeRemove: () => playBack() }}
    >
      <ForYouStack.Screen name="ForYouHome" component={ForYouTabScreen} />
      <ForYouStack.Screen name="GazetteLibrary" component={GazetteLibraryScreen} options={{ title: t("library.title"), headerShown: true }} />
      <ForYouStack.Screen name="TripCompanion" component={TripCompanionScreen} options={{ title: "Trip Companion", headerShown: true }} />
      <ForYouStack.Screen name="SavedDetail" component={FeedDetailScreen as any} options={{ title: t("screens.savedStory") }} />
      <ForYouStack.Screen name="FeedDetail" component={FeedDetailScreen} options={{ title: t("screens.story") }} />
      <ForYouStack.Screen name="StoryDetail" component={StoryDetailScreen} options={{ title: t("storyDetail.title") }} />
      <ForYouStack.Screen name="CollectionDetail" component={CollectionScreen as any} options={{ title: t("collections.screenTitle") }} />
      <ForYouStack.Screen name="EntityProfile" component={EntityProfileScreen} options={({ route }) => ({ title: route.params.entityName, headerShown: true })} />
      <ForYouStack.Screen name="SourceManage" component={SourceManageScreen as any} options={{ title: t("screens.manageSources"), headerShown: true }} />
      <ForYouStack.Screen name="Player" component={PlayerScreen} options={{ title: t("screens.player") }} />
    </ForYouStack.Navigator>
  );
}

function SettingsStackNavigator() {
  const { t } = useTranslation();
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen
        name="MyMagic"
        component={MyMagicScreen}
        options={{ title: t("myMagic.title") }}
      />
      <SettingsStack.Screen
        name="GazetteAlerts"
        component={GazetteAlertsScreen}
        options={{ title: "Gazette Alerts", headerShown: true }}
      />
      <SettingsStack.Screen
        name="ReadingExperience"
        component={ReadingExperienceScreen}
        options={{ title: "Reading Experience", headerShown: true }}
      />
      <SettingsStack.Screen
        name="AccessibilityPreferences"
        component={AccessibilityPreferencesScreen}
        options={{ title: "Accessibility", headerShown: true }}
      />
      <SettingsStack.Screen
        name="GazetteLibrarySettings"
        component={GazetteLibrarySettingsScreen}
        options={{ title: "Gazette Library", headerShown: true }}
      />
      <SettingsStack.Screen
        name="ExploreDisneyPreferences"
        component={ExploreDisneyPreferencesScreen}
        options={{ title: "Explore Disney", headerShown: true }}
      />
      <SettingsStack.Screen
        name="AboutGazette"
        component={AboutGazetteScreen}
        options={{ title: "About the Gazette", headerShown: true }}
      />
      <SettingsStack.Screen
        name="DeveloperTools"
        component={DeveloperToolsScreen}
        options={{ title: "Developer Tools", headerShown: true }}
      />
      <SettingsStack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: t("settings.analytics.title"), headerShown: true }}
      />
      <SettingsStack.Screen
        name="NewsPreferences"
        component={NewsPreferencesScreen}
        options={{ title: "News & Timeline" }}
      />
      <SettingsStack.Screen
        name="SourceLibrary"
        component={SourceLibraryScreen}
        options={{ title: "Source Library", headerShown: true }}
      />
      <SettingsStack.Screen
        name="SourceFeed"
        component={SourceFeedScreen as any}
        options={{ title: t("screens.sourceFeed"), headerShown: true }}
      />
      <SettingsStack.Screen
        name="SourceManage"
        component={SourceManageScreen as any}
        options={{ title: t("screens.manageSources"), headerShown: true }}
      />
      <SettingsStack.Screen
        name="FeedDetail"
        component={FeedDetailScreen as any}
        options={{ title: t("screens.story"), headerShown: false }}
      />
      <SettingsStack.Screen
        name="SourcePlayer"
        component={PlayerScreen}
        options={{ title: t("screens.player"), headerShown: false }}
      />
      <SettingsStack.Screen
        name="UserGuide"
        component={UserGuideScreen}
        options={{ title: "User Guide", headerShown: true }}
      />
      <SettingsStack.Screen
        name="WhatsNew"
        component={WhatsNewScreen}
        options={{ title: "What's New", headerShown: true }}
      />
      <SettingsStack.Screen
        name="AccessibilityGuide"
        component={AccessibilityGuideScreen}
        options={{ title: "Accessibility Guide", headerShown: true }}
      />
    </SettingsStack.Navigator>
  );
}

const SF_SYMBOLS = {
  News:        { focused: "newspaper.fill",   unfocused: "newspaper" },
  Discover:    { focused: "safari.fill",      unfocused: "safari" },
  ForYou:      { focused: "heart.fill",       unfocused: "heart" },
  Preferences: { focused: "gearshape.fill",   unfocused: "gearshape" },
} as const;

function KeyboardShortcutHandler() {
  const navigation = useNavigation<any>();
  const app = useAppContext();
  useKeyboardShortcuts({
    onRefresh: () => app.refresh(),
    onTabChange: (index) => {
      // Index 3 ("Preferences") isn't a tab-bar button but is still a real, navigable
      // tab route — this is what the native Cmd+, shortcut resolves to.
      const tabs = ["News", "Discover", "ForYou", "Preferences"] as const;
      const tab = tabs[index];
      if (tab) navigation.navigate(tab as any);
    },
  });
  return null;
}

function QuickJumpHost() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const jumpTo = (name: keyof RootTabParamList, params?: object) => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate(name as any, params as any);
  };

  const jumpItems = useMemo<QuickJumpItem[]>(
    () => [
      {
        label: "Latest News",
        icon: "newspaper-variant-outline",
        onPress: () => jumpTo("News", { screen: "NewsHome" }),
      },
      {
        label: "Search",
        icon: "magnify",
        onPress: () => jumpTo("Discover", { screen: "DiscoverHome" }),
      },
      {
        label: "Disney Destinations",
        icon: "castle",
        onPress: () => jumpTo("Discover", { screen: "ParksHome", params: { initialView: "destinations" } }),
      },
      {
        label: "Events",
        icon: "calendar-month-outline",
        onPress: () => jumpTo("News", { screen: "NewsHome" }),
      },
      {
        label: "Media",
        icon: "play-circle-outline",
        onPress: () => jumpTo("Discover", { screen: "DiscoverHome" }),
      },
      {
        label: "Saved Articles",
        icon: "bookmark-outline",
        onPress: () => jumpTo("ForYou", { screen: "ForYouHome" }),
      },
      {
        label: "Settings",
        icon: "cog-outline",
        onPress: () => jumpTo("Preferences", { screen: "SettingsHome" }),
      },
    ],
    []
  );

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Quick Jump"
        accessibilityHint="Double tap to jump to key app areas."
        style={({ pressed }) => [
          styles.quickJumpButton,
          {
            backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.primary,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="menu-open"
          size={24}
          color={theme.colors.onPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      <QuickJumpMenu visible={visible} items={jumpItems} onClose={() => setVisible(false)} />
    </>
  );
}

export function RootNavigator() {
  const paperTheme = useTheme();
  const { playTabChange } = useSounds();
  const { t } = useTranslation();
  const navigationTheme = {
    ...(paperTheme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(paperTheme.dark ? DarkTheme.colors : DefaultTheme.colors),
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outline,
      notification: paperTheme.colors.error
    }
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <KeyboardShortcutHandler />
      <QuickJumpHost />
      <Tab.Navigator
        screenListeners={{ tabPress: () => playTabChange() }}
        screenOptions={({ route }) => ({
          headerShown: false,
          // Preferences is a real tab route (reachable via each screen's gear icon /
          // navigation.getParent()?.navigate("Preferences")) but hidden from the tab bar itself.
          tabBarButton: route.name === "Preferences" ? () => null : undefined,
          tabBarActiveTintColor: paperTheme.colors.primary,
          tabBarInactiveTintColor: paperTheme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: paperTheme.colors.surface,
            borderTopColor: paperTheme.colors.outline,
            borderTopWidth: 0.5
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500"
          },
          tabBarAccessibilityLabel: `${route.name} tab`,
          tabBarIcon: ({ color, size, focused }) => {
            if (Platform.OS === "ios" && SymbolView) {
              const symbols = SF_SYMBOLS[route.name as keyof typeof SF_SYMBOLS];
              if (symbols) {
                return (
                  <SymbolView
                    name={focused ? symbols.focused : symbols.unfocused}
                    size={size}
                    tintColor={color}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                );
              }
            }
            let iconName: string;
            switch (route.name) {
              case "News":
                iconName = "newspaper-variant-outline";
                break;
              case "Discover":
                iconName = "compass-outline";
                break;
              case "ForYou":
                iconName = "heart-outline";
                break;
              case "Preferences":
              default:
                iconName = "cog-outline";
                break;
            }
            return (
              <MaterialCommunityIcons
                name={iconName as any}
                color={color}
                size={size}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            );
          }
        })}
      >
        <Tab.Screen name="News" component={NewsStackNavigator} options={{ tabBarLabel: t("tabs.news") }} />
        <Tab.Screen
          name="Discover"
          component={DiscoverStackNavigator}
          options={{ tabBarLabel: t("tabs.discover") }}
          listeners={({ navigation }) => ({
            // Tapping the tab always lands on the Discover home (Trending, Event Calendar,
            // Media Hub, etc.) instead of resuming wherever the user last drilled into
            // (e.g. Manage Sources), which otherwise looks like a totally different screen.
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("Discover", { screen: "DiscoverHome" } as never);
            },
          })}
        />
        <Tab.Screen name="ForYou" component={ForYouStackNavigator} options={{ tabBarLabel: t("tabs.forYou") }} />
        <Tab.Screen name="Preferences" component={SettingsStackNavigator} options={{ tabBarLabel: "Preferences" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  quickJumpButton: {
    position: "absolute",
    right: 16,
    bottom: 88,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 8,
  },
});
