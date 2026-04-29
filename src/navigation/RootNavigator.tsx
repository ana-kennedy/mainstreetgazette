import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useTheme } from "react-native-paper";
import { FeedDetailScreen } from "../screens/FeedDetailScreen";
import { NewsScreen } from "../screens/NewsScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SourcesScreen } from "../screens/SourcesScreen";
import type { NewsStackParamList, RootTabParamList, SavedStackParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();
const NewsStack = createNativeStackNavigator<NewsStackParamList>();
const SavedStack = createNativeStackNavigator<SavedStackParamList>();

function NewsStackNavigator() {
  return (
    <NewsStack.Navigator screenOptions={{ headerShown: false }}>
      <NewsStack.Screen name="NewsHome" component={NewsScreen} options={{ title: "News" }} />
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

export function RootNavigator() {
  const paperTheme = useTheme();
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
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: paperTheme.colors.primary,
          tabBarInactiveTintColor: paperTheme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: paperTheme.colors.surface,
            borderTopColor: paperTheme.colors.outline
          },
          tabBarAccessibilityLabel: `${route.name} tab`,
          tabBarIcon: ({ color, size }) => {
            const iconName =
              route.name === "News" ? "newspaper-variant-outline" : route.name === "Saved" ? "bookmark-outline" : route.name === "Sources" ? "rss" : "cog-outline";
            return <MaterialCommunityIcons name={iconName} color={color} size={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
          }
        })}
      >
        <Tab.Screen name="News" component={NewsStackNavigator} options={{ tabBarLabel: "News" }} />
        <Tab.Screen name="Saved" component={SavedStackNavigator} options={{ tabBarLabel: "Saved" }} />
        <Tab.Screen name="Sources" component={SourcesScreen} options={{ tabBarLabel: "Sources" }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: "Settings" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
