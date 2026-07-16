// Phase 07 — "Your Gazette" Settings home. Restructured from a flat 8-card list into
// the spec's exact 5 groups (temp/04_SCREEN_SPECIFICATIONS/SETTINGS_SPEC.md):
// Your Experience, Gazette Library, Explore Disney, Help & Support, About the Gazette.
// Source Library / Manage Sources / Analytics / diagnostics are deliberately NOT here —
// they live behind the developer unlock in AboutGazetteScreen.
import React from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Text, TextInput, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { PrefNavCard, PrefSectionLabel } from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import type { SettingsStackParamList } from "../navigation/types";

const PRIVACY_POLICY_URL = "https://ana-kennedy.github.io/mainstreetgazette/privacy-policy/";
const SUPPORT_URL = "https://ana-kennedy.github.io/mainstreetgazette/support/";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

export function SettingsScreen() {
  const app = useAppContext();
  const navigation = useNavigation<Nav>();
  const { playConfirm } = useSounds();
  const theme = useTheme();
  const { t } = useTranslation();
  const settings = app.settings;
  const [nameInput, setNameInput] = React.useState(settings?.displayName ?? "");

  if (!settings) return null;

  const handleNameBlur = () => {
    const trimmed = nameInput.trim();
    const current = settings.displayName ?? "";
    if (trimmed !== current) {
      playConfirm();
      app.updateSettings({ ...settings, displayName: trimmed || undefined });
    }
  };

  const nav = (screen: keyof SettingsStackParamList, params?: object) => {
    playConfirm();
    navigation.navigate(screen as any, params as any);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.pageTitle} accessibilityRole="header">
          Your Gazette
        </Text>
        <Text style={[styles.pageIntro, { color: theme.colors.onSurfaceVariant }]}>
          Make Main Street Gazette feel just the way you like it.
        </Text>
        {settings.displayName ? (
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: -6 }}
          >
            {t("settings.hi", { name: settings.displayName })}
          </Text>
        ) : null}

        <PrefSectionLabel>{t("settings.section.profile")}</PrefSectionLabel>
        <TextInput
          mode="outlined"
          label={t("settings.profile.label")}
          value={nameInput}
          onChangeText={setNameInput}
          onBlur={handleNameBlur}
          returnKeyType="done"
          onSubmitEditing={handleNameBlur}
          autoCorrect={false}
          maxLength={40}
          accessibilityLabel={t("settings.profile.label")}
          accessibilityHint={t("settings.profile.hint")}
          style={styles.nameInput}
        />

        <Divider style={styles.divider} />

        {/* 1. Your Experience */}
        <PrefSectionLabel>Your Experience</PrefSectionLabel>
        <Text style={[styles.groupIntro, { color: theme.colors.onSurfaceVariant }]}>
          Make the Gazette feel just the way you like it.
        </Text>
        <View style={styles.cards}>
          <PrefNavCard
            title="My Magic"
            subtitle="Destinations and interests"
            icon="star-circle-outline"
            hint="Double tap to choose the destinations and topics the Gazette should highlight."
            onPress={() => nav("MyMagic")}
          />
          <PrefNavCard
            title="Gazette Alerts"
            subtitle="Notifications and quiet hours"
            icon="bell-outline"
            hint="Double tap to manage when the Gazette may gently let you know something is ready."
            onPress={() => nav("GazetteAlerts")}
          />
          <PrefNavCard
            title="Reading Experience"
            subtitle="Theme, cards, artwork, sound"
            icon="palette-outline"
            hint="Double tap to change how the Gazette looks, reads, and sounds."
            onPress={() => nav("ReadingExperience")}
          />
          <PrefNavCard
            title="Accessibility"
            subtitle="VoiceOver, vision, simplified navigation"
            icon="human"
            hint="Double tap to open accessibility preferences."
            onPress={() => nav("AccessibilityPreferences")}
          />
        </View>

        <Divider style={styles.divider} />

        {/* 2. Gazette Library */}
        <PrefSectionLabel>Gazette Library</PrefSectionLabel>
        <Text style={[styles.groupIntro, { color: theme.colors.onSurfaceVariant }]}>
          Your saved Disney discoveries, thoughtfully organized in one place.
        </Text>
        <View style={styles.cards}>
          <PrefNavCard
            title="Gazette Library"
            subtitle="Collections, storage, and offline"
            icon="bookmark-multiple-outline"
            hint="Double tap to manage your collections and storage."
            onPress={() => nav("GazetteLibrarySettings")}
          />
        </View>

        <Divider style={styles.divider} />

        {/* 3. Explore Disney */}
        <PrefSectionLabel>Explore Disney</PrefSectionLabel>
        <Text style={[styles.groupIntro, { color: theme.colors.onSurfaceVariant }]}>
          Personalize how park information and destinations appear.
        </Text>
        <View style={styles.cards}>
          <PrefNavCard
            title="Explore Disney"
            subtitle="Dashboard, weather, Park Radio, trips"
            icon="map-outline"
            hint="Double tap to personalize the Explore tab."
            onPress={() => nav("ExploreDisneyPreferences")}
          />
        </View>

        <Divider style={styles.divider} />

        {/* 4. Help & Support */}
        <PrefSectionLabel>Help & Support</PrefSectionLabel>
        <Text style={[styles.groupIntro, { color: theme.colors.onSurfaceVariant }]}>
          Learn about the Gazette and find help whenever you need it.
        </Text>
        <View style={styles.cards}>
          <PrefNavCard
            title="Learn the Gazette"
            subtitle="Searchable help for every feature"
            icon="book-open-outline"
            hint="Double tap to open the built-in user guide."
            onPress={() => nav("UserGuide")}
          />
          <PrefNavCard
            title="VoiceOver Guide"
            subtitle="How the Gazette works with VoiceOver"
            icon="human"
            hint="Double tap to open the VoiceOver guide."
            onPress={() => nav("AccessibilityGuide", { section: "voiceover" })}
          />
          <PrefNavCard
            title="Low Vision Guide"
            subtitle="Large text and low vision support"
            icon="format-line-spacing"
            hint="Double tap to open the low vision guide."
            onPress={() => nav("AccessibilityGuide", { section: "lowVision" })}
          />
          <PrefNavCard
            title="Braille and Keyboard Guide"
            subtitle="Braille display support"
            icon="dots-grid"
            hint="Double tap to open the braille and keyboard guide."
            onPress={() => nav("AccessibilityGuide", { section: "braille" })}
          />
          <PrefNavCard
            title="Frequently Asked Questions"
            subtitle="Quick answers to common questions"
            icon="help-circle-outline"
            hint="Double tap to open frequently asked questions."
            onPress={() => nav("AccessibilityGuide", { section: "faq" })}
          />
          <PrefNavCard
            title="What's New"
            subtitle="Recent updates and highlights"
            icon="star-shooting-outline"
            hint="Double tap to see what's new in this version."
            onPress={() => nav("WhatsNew")}
          />
          <PrefNavCard
            title="Contact the Editor"
            subtitle="Get in touch with the team"
            icon="email-outline"
            hint="Double tap to open the support page."
            onPress={() => Linking.openURL(SUPPORT_URL)}
          />
          <PrefNavCard
            title="Report an Accessibility Issue"
            subtitle="Help us improve"
            icon="flag-outline"
            hint="Double tap to open the support page."
            onPress={() => Linking.openURL(SUPPORT_URL)}
          />
        </View>

        <Divider style={styles.divider} />

        {/* 5. About the Gazette */}
        <PrefSectionLabel>About the Gazette</PrefSectionLabel>
        <Text style={[styles.groupIntro, { color: theme.colors.onSurfaceVariant }]}>
          Discover the story, sources, and people behind Main Street Gazette.
        </Text>
        <View style={styles.cards}>
          <PrefNavCard
            title="About the Gazette"
            subtitle="Version, sources, privacy, credits"
            icon="information-outline"
            hint="Double tap to open About the Gazette."
            onPress={() => nav("AboutGazette")}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("settings.privacy.legal")}
          </Text>
          <Button
            mode="text"
            compact
            icon="open-in-new"
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityLabel={t("settings.privacy.privacyPolicy")}
            accessibilityRole="button"
            accessibilityHint={t("settings.privacy.privacyPolicyHint")}
          >
            {t("settings.privacy.privacyPolicy")}
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  pageTitle: {
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  pageIntro: {
    marginTop: -4,
  },
  nameInput: {
    marginBottom: 2,
  },
  divider: {
    marginVertical: 8,
  },
  groupIntro: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  cards: {
    gap: 8,
  },
  footer: {
    paddingTop: 16,
    gap: 4,
    alignItems: "flex-start",
  },
});
