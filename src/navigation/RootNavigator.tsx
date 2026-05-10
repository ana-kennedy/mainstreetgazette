import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import type { NavigationState } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useRef } from "react";
import { useTheme } from "react-native-paper";
import { useSounds } from "../context/SoundContext";
import { FeedDetailScreen } from "../screens/FeedDetailScreen";
import { NewsTabScreen } from "../screens/NewsTabScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { SourcesScreen } from "../screens/SourcesScreen";
import { SourceFeedScreen } from "../screens/SourceFeedScreen";
import { SourceManageScreen } from "../screens/SourceManageScreen";
import { ParksScreen } from "../screens/ParksScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import type {
  NewsStackParamList,
  RootTabParamList,
  SavedStackParamList,
  SettingsStackParamList,
  SourcesStackParamList
} from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const NewsStack = createNativeStackNavigator<NewsStackParamList>();
const SavedStack = createNativeStackNavigator<SavedStackParamList>();
const SourcesStack = createNativeStackNavigator<SourcesStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function NewsStackNavigator() {
  return (
    <NewsStack.Navigator screenOptions={{ headerShown: false }}>
      <NewsStack.Screen name="NewsHome" component={NewsTabScreen} />
      <NewsStack.Screen name="FeedDetail" component={FeedDetailScreen} options={{ title: "Story" }} />
      <NewsStack.Screen name="Player" component={PlayerScreen} options={{ title: "Player" }} />
    </NewsStack.Navigator>
  );
}

function SavedStackNavigator() {
  return (
    <SavedStack.Navigator screenOptions={{ headerShown: false }}>
      <SavedStack.Screen name="SavedHome" component={SavedScreen} options={{ title: "Saved" }} />
      <SavedStack.Screen name="SavedDetail" component={FeedDetailScreen} options={{ title: "Saved Story" }} />
    </SavedStack.Navigator>
  );
}

function SourcesStackNavigator() {
  return (
    <SourcesStack.Navigator screenOptions={{ headerShown: false }}>
      <SourcesStack.Screen name="SourcesHome" component={SourcesScreen} />
      <SourcesStack.Screen name="SourceFeed" component={SourceFeedScreen} options={{ title: "Source Feed" }} />
      <SourcesStack.Screen name="SourceManage" component={SourceManageScreen} options={{ title: "Manage Sources" }} />
      <SourcesStack.Screen name="FeedDetail" component={FeedDetailScreen} options={{ title: "Story" }} />
      <SourcesStack.Screen name="Player" component={PlayerScreen} options={{ title: "Player" }} />
    </SourcesStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

function getStackDepth(state: NavigationState | undefined): number {
  if (!state) return 0;
  const route = state.routes[state.index ?? 0];
  if (route?.state) return 1 + getStackDepth(route.state as NavigationState);
  return 1;
}

export function RootNavigator() {
  const paperTheme = useTheme();
  const { playBack, playConfirm } = useSounds();
  const prevDepthRef = useRef(0);
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
    <NavigationContainer
      theme={navigationTheme}
      onStateChange={(state) => {
        const depth = getStackDepth(state);
        if (prevDepthRef.current > 0 && depth < prevDepthRef.current) {
          playBack();
        }
        prevDepthRef.current = depth;
      }}
    >
      <Tab.Navigator
        screenListeners={{ tabPress: () => playConfirm() }}
        screenOptions={({ route }) => ({
          headerShown: false,
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
          tabBarIcon: ({ color, size }) => {
            let iconName: string;
            switch (route.name) {
              case "News":
                iconName = "newspaper-variant-outline";
                break;
              case "Parks":
                iconName = "castle";
                break;
              case "Saved":
                iconName = "bookmark-outline";
                break;
              case "Sources":
                iconName = "rss";
                break;
              case "Settings":
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
        <Tab.Screen name="News" component={NewsStackNavigator} options={{ tabBarLabel: "News" }} />
        <Tab.Screen name="Parks" component={ParksScreen} options={{ tabBarLabel: "Parks" }} />
        <Tab.Screen name="Saved" component={SavedStackNavigator} options={{ tabBarLabel: "Saved" }} />
        <Tab.Screen name="Sources" component={SourcesStackNavigator} options={{ tabBarLabel: "Sources" }} />
        <Tab.Screen name="Settings" component={SettingsStackNavigator} options={{ tabBarLabel: "Settings" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
