// Phase 07 renamed this from NotificationPreferencesScreen; Phase 08 restructures its
// core into the spec's four named choices (temp/03_IMPLEMENTATION_PHASES/
// PHASE_08_ALERTS_AND_TRIP_COMPANION.md), each with a one-sentence description:
// Morning Edition, Special Editions, Disney Moments, Trip Companion Alerts. Also wires
// real permission handling — requested only when a toggle is turned on (never at
// launch/onboarding, per the spec), with an "Open iPhone Settings" recovery action
// when permission has been denied.
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Switch, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { PrefGroup, PrefSectionLabel, PrefSwitchRow } from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useSounds } from "../context/SoundContext";
import { usePersonalization } from "../context/PersonalizationContext";
import {
  getNotificationPermissionState,
  openNotificationSettings,
  requestNotificationPermission,
  type PermissionState,
} from "../services/pushNotifications";
import type { UserSettings } from "../domain/models";
import type { NotificationProfileId } from "../personalization/personalizationTypes";

export interface AlertChoice {
  key: keyof Pick<
    UserSettings,
    "dailyDigestEnabled" | "breakingNewsEnabled" | "disneyMomentsEnabled" | "tripCompanionAlertsEnabled"
  >;
  title: string;
  description: string;
}

// Exported so the Phase 09 Startup Wizard's Gazette Alerts page can describe the same
// four choices verbatim, without wiring notification permission (that stays confined
// to this screen — the wizard must never force a system permission prompt).
export const ALERT_CHOICES: AlertChoice[] = [
  {
    key: "dailyDigestEnabled",
    title: "Morning Edition",
    description: "A gentle morning summary of the day's top Disney stories.",
  },
  {
    key: "breakingNewsEnabled",
    title: "Special Editions",
    description: "Alerts for high-confidence major Disney news, confirmed by multiple sources — never a delayed refresh dressed up as breaking.",
  },
  {
    key: "disneyMomentsEnabled",
    title: "Disney Moments",
    description: "Occasional gentle highlights — anniversaries, seasonal moments, and fan-favorite throwbacks.",
  },
  {
    key: "tripCompanionAlertsEnabled",
    title: "Trip Companion Alerts",
    description: "Reminders for your upcoming trips — dining windows, Lightning Lane, check-in, and more.",
  },
];

const NOTIFICATION_PROFILES: Array<{ id: NotificationProfileId; labelKey: string; descKey: string }> = [
  {
    id: "quiet",
    labelKey: "personalization.notificationProfile.quiet",
    descKey: "personalization.notificationProfile.quietDesc",
  },
  {
    id: "balanced",
    labelKey: "personalization.notificationProfile.balanced",
    descKey: "personalization.notificationProfile.balancedDesc",
  },
  {
    id: "breaking_heavy",
    labelKey: "personalization.notificationProfile.breakingHeavy",
    descKey: "personalization.notificationProfile.breakingHeavyDesc",
  },
];

export function GazetteAlertsScreen() {
  const app = useAppContext();
  const { playConfirm } = useSounds();
  const { t } = useTranslation();
  const theme = useTheme();
  const { prefs, updatePrefs } = usePersonalization();
  const settings = app.settings;
  const [permission, setPermission] = useState<PermissionState>("undetermined");

  useEffect(() => {
    getNotificationPermissionState().then(setPermission).catch(() => {});
  }, []);

  const update = useCallback(
    (patch: Partial<UserSettings>) => {
      if (!settings) return;
      playConfirm();
      app.updateSettings({ ...settings, ...patch });
    },
    [app, playConfirm, settings]
  );

  // Per the spec: never force a permission prompt during onboarding. This only fires
  // in direct response to the user turning one of the four choices on.
  const handleToggle = useCallback(
    async (key: AlertChoice["key"], value: boolean) => {
      update({ [key]: value } as Partial<UserSettings>);
      if (value && permission !== "granted") {
        const result = await requestNotificationPermission();
        setPermission(result);
      }
    },
    [permission, update]
  );

  if (!settings) return null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.pageTitle} accessibilityRole="header">
          Gazette Alerts
        </Text>

        {permission === "denied" ? (
          <View
            style={[styles.permissionBanner, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }]}
            accessible
            accessibilityRole="text"
            accessibilityLabel="Notifications are turned off in iPhone Settings. Alerts you choose below won't arrive until you turn them back on."
          >
            <MaterialCommunityIcons name={"bell-off-outline" as any} size={18} color={theme.colors.onErrorContainer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onErrorContainer }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              Notifications are turned off in iPhone Settings. Alerts you choose below won't arrive until you turn them back on.
            </Text>
            <Button mode="text" compact onPress={openNotificationSettings} accessibilityLabel="Open iPhone Settings" accessibilityHint="Double tap to open iPhone Settings for Main Street Gazette.">
              Open Settings
            </Button>
          </View>
        ) : null}

        <PrefSectionLabel>Choose Your Alerts</PrefSectionLabel>
        <PrefGroup>
          {ALERT_CHOICES.map((choice) => (
            <PrefSwitchRow
              key={choice.key}
              title={choice.title}
              description={choice.description}
              value={settings[choice.key]}
              onValueChange={(v) => handleToggle(choice.key, v)}
            />
          ))}
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>Quiet Hours</PrefSectionLabel>
        <PrefGroup>
          <PrefSwitchRow
            title="Enable Quiet Hours"
            description="Silence notifications during your chosen hours."
            value={settings.quietHoursEnabled}
            onValueChange={(v) => update({ quietHoursEnabled: v })}
          />
        </PrefGroup>

        <Divider style={styles.divider} />

        <PrefSectionLabel>{t("personalization.section.notifications")}</PrefSectionLabel>
        <Text style={[styles.sectionDesc, { color: theme.colors.onSurfaceVariant }]}>
          {t("personalization.section.notificationsDesc")}
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          {NOTIFICATION_PROFILES.map((profile, idx) => {
            const selected = prefs.notificationProfile === profile.id;
            return (
              <React.Fragment key={profile.id}>
                {idx > 0 && <Divider />}
                <Pressable
                  onPress={() => {
                    playConfirm();
                    updatePrefs({ notificationProfile: profile.id });
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${t(profile.labelKey)}. ${t(profile.descKey)}`}
                  accessibilityHint={selected ? t("personalization.currentSelection") : t("personalization.tapToSelect")}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface },
                  ]}
                >
                  <View style={styles.rowTextBlock}>
                    <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{t(profile.labelKey)}</Text>
                    <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>{t(profile.descKey)}</Text>
                  </View>
                  {selected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={theme.colors.primary}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        <PrefSectionLabel>{t("personalization.section.notificationBehavior")}</PrefSectionLabel>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.switchRow}>
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{t("personalization.officialAlways")}</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>{t("personalization.officialAlwaysDesc")}</Text>
            </View>
            <Switch
              value={prefs.allowOfficialAnnouncementsAlways}
              onValueChange={(val) => updatePrefs({ allowOfficialAnnouncementsAlways: val })}
              accessibilityLabel={t("personalization.officialAlways")}
              accessibilityHint={t("personalization.officialAlwaysDesc")}
            />
          </View>
          <Divider />
          <View style={styles.switchRow}>
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{t("personalization.breakingOnly")}</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>{t("personalization.breakingOnlyDesc")}</Text>
            </View>
            <Switch
              value={prefs.breakingNewsOnly}
              onValueChange={(val) => updatePrefs({ breakingNewsOnly: val })}
              accessibilityLabel={t("personalization.breakingOnly")}
              accessibilityHint={t("personalization.breakingOnlyDesc")}
            />
          </View>
          <Divider />
          <View style={styles.switchRow}>
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{t("personalization.safetyAlerts")}</Text>
              <Text style={[styles.rowDesc, { color: theme.colors.onSurfaceVariant }]}>{t("personalization.safetyAlertsDesc")}</Text>
            </View>
            <Switch
              value={prefs.allowHighConfidenceSafetyOrClosureAlerts}
              onValueChange={(val) => updatePrefs({ allowHighConfidenceSafetyOrClosureAlerts: val })}
              accessibilityLabel={t("personalization.safetyAlerts")}
              accessibilityHint={t("personalization.safetyAlertsDesc")}
            />
          </View>
        </View>

        <View style={{ height: 24 }} />
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
  divider: {
    marginVertical: 8,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  rowTextBlock: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
});
