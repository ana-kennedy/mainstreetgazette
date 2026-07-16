// Phase 08 — Trip Companion. Lives in the For You tab per the spec ("not buried in
// Settings" — Settings only has a management link, wired in ExploreDisneyPreferencesScreen).
// Supports multiple upcoming trips with Destination/Start date/End date/optional
// Resort/optional Notes/optional linked collection (only with explicit consent, since
// this app has no user-authored-collection model to create a new one for — see
// PHASE_05_RESULTS.md — so "linking" means referencing an existing editorial/automatic
// collection id).
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, Divider, Text, TextInput, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { PrefChoiceRow, PrefGroup, PrefSectionLabel } from "../components/PreferenceComponents";
import { useAppContext } from "../context/AppContext";
import { useTripCompanion } from "../context/TripCompanionContext";
import { useSounds } from "../context/SoundContext";
import { computeTripReminders, scheduleTripReminders, cancelTripReminders } from "../services/reminderEngine";
import collectionsData from "../data/phase10/collections.json";
import type { CollectionDefinition } from "../intelligence/phase10/types";
import type { Trip } from "../domain/models";

const TRIP_DESTINATIONS: Array<{ value: string; labelKey: string }> = [
  { value: "wdw", labelKey: "myMagic.destination.wdw" },
  { value: "dlr", labelKey: "myMagic.destination.dlr" },
  { value: "dcl", labelKey: "myMagic.destination.dcl" },
  { value: "international", labelKey: "myMagic.destination.international" },
];

function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateISO}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function tripCountdownLabel(trip: Trip): string {
  const days = daysUntil(trip.startDate);
  if (days > 1) return `${days} days away`;
  if (days === 1) return "Tomorrow";
  if (days === 0) return "Today!";
  const daysUntilEnd = daysUntil(trip.endDate);
  return daysUntilEnd >= 0 ? "Happening now" : "Past trip";
}

function TripForm({ onCancel, onSave }: { onCancel: () => void; onSave: (trip: Omit<Trip, "id" | "createdAt">) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [destinationId, setDestinationId] = useState("wdw");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [resort, setResort] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedCollectionId, setLinkedCollectionId] = useState<string | null>(null);
  const [collectionConsent, setCollectionConsent] = useState(false);

  const editorialDefinitions = collectionsData as CollectionDefinition[];
  const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
  const canSave = isValidDate(startDate) && isValidDate(endDate) && endDate >= startDate;

  return (
    <View style={styles.form}>
      <PrefSectionLabel>Destination</PrefSectionLabel>
      <PrefGroup>
        <PrefChoiceRow<string>
          value={destinationId}
          onValueChange={setDestinationId}
          options={TRIP_DESTINATIONS.map((d) => ({ value: d.value, label: t(d.labelKey), accessibilityLabel: t(d.labelKey) }))}
        />
      </PrefGroup>

      <PrefSectionLabel>Dates</PrefSectionLabel>
      <TextInput
        mode="outlined"
        label="Start date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        placeholder="2026-08-01"
        accessibilityLabel="Trip start date"
        accessibilityHint="Enter the first day of your trip in year, month, day order."
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="End date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        placeholder="2026-08-08"
        accessibilityLabel="Trip end date"
        accessibilityHint="Enter the last day of your trip in year, month, day order."
        style={styles.input}
      />

      <PrefSectionLabel>Optional Details</PrefSectionLabel>
      <TextInput
        mode="outlined"
        label="Resort (optional)"
        value={resort}
        onChangeText={setResort}
        accessibilityLabel="Resort"
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        accessibilityLabel="Trip notes"
        style={styles.input}
      />

      <PrefSectionLabel>Link a Collection (Optional)</PrefSectionLabel>
      <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
        Link this trip to one of your Gazette collections so its stories are easy to find later.
      </Text>
      <PrefGroup>
        <PrefChoiceRow<string>
          value={linkedCollectionId ?? ""}
          onValueChange={(v) => setLinkedCollectionId(v || null)}
          options={[
            { value: "", label: "None", accessibilityLabel: "No linked collection" },
            ...editorialDefinitions.slice(0, 6).map((c) => ({ value: c.id, label: c.title, accessibilityLabel: c.title })),
          ]}
        />
      </PrefGroup>
      {linkedCollectionId ? (
        <View
          style={styles.consentRow}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: collectionConsent }}
          accessibilityLabel="I consent to linking this collection to my trip"
        >
          <Checkbox
            status={collectionConsent ? "checked" : "unchecked"}
            onPress={() => setCollectionConsent((v) => !v)}
          />
          <Text style={{ flex: 1, color: theme.colors.onSurface }}>
            I'd like to link this collection to my trip.
          </Text>
        </View>
      ) : null}

      <View style={styles.formActions}>
        <Button mode="text" onPress={onCancel} accessibilityLabel="Cancel">
          Cancel
        </Button>
        <Button
          mode="contained"
          disabled={!canSave}
          onPress={() =>
            onSave({
              destinationId,
              startDate,
              endDate,
              resort: resort.trim() || undefined,
              notes: notes.trim() || undefined,
              linkedCollectionId: linkedCollectionId && collectionConsent ? linkedCollectionId : undefined,
            })
          }
          accessibilityLabel="Save trip"
          accessibilityHint={canSave ? "Double tap to save this trip." : "Enter valid start and end dates to save."}
        >
          Save Trip
        </Button>
      </View>
    </View>
  );
}

export function TripCompanionScreen() {
  const app = useAppContext();
  const { trips, addTrip, removeTrip } = useTripCompanion();
  const { playConfirm } = useSounds();
  const { t } = useTranslation();
  const theme = useTheme();
  const [showForm, setShowForm] = useState(false);

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [trips]
  );

  const handleSave = async (tripInput: Omit<Trip, "id" | "createdAt">) => {
    playConfirm();
    const trip = await addTrip(tripInput);
    setShowForm(false);
    if (app.settings?.tripCompanionAlertsEnabled) {
      await scheduleTripReminders(trip).catch(() => {});
    }
  };

  const handleRemove = async (trip: Trip) => {
    playConfirm();
    await cancelTripReminders(trip).catch(() => {});
    await removeTrip(trip.id);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.pageTitle} accessibilityRole="header">
          Trip Companion
        </Text>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Plan your upcoming Disney trips and get gentle reminders as they approach.
        </Text>

        {!showForm ? (
          <Button mode="contained-tonal" icon="plus" onPress={() => setShowForm(true)} style={styles.addButton} accessibilityLabel="Add a trip">
            Add a Trip
          </Button>
        ) : (
          <TripForm onCancel={() => setShowForm(false)} onSave={handleSave} />
        )}

        <Divider style={styles.divider} />

        {sortedTrips.length === 0 && !showForm ? (
          <EmptyState
            title="No trips yet"
            body="Add your first trip to get started with dining, Lightning Lane, and check-in reminders."
            icon="bag-suitcase-outline"
          />
        ) : (
          sortedTrips.map((trip) => {
            const reminders = computeTripReminders(trip).filter((r) => r.dueDate.getTime() > Date.now());
            return (
              <View key={trip.id} style={[styles.tripCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={styles.tripHeaderRow}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
                    {t(`myMagic.destination.${trip.destinationId}`, trip.destinationId)}
                  </Text>
                  <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                    {tripCountdownLabel(trip)}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {trip.startDate} – {trip.endDate}
                  {trip.resort ? ` · ${trip.resort}` : ""}
                </Text>
                {trip.notes ? <Text style={{ color: theme.colors.onSurfaceVariant }}>{trip.notes}</Text> : null}
                {reminders.length > 0 ? (
                  <View style={styles.remindersBlock}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "700" }}>
                      UPCOMING REMINDERS
                    </Text>
                    {reminders.slice(0, 3).map((r) => (
                      <Text key={r.id} style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                        {r.title} — {r.dueDate.toLocaleDateString()}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Button mode="text" compact onPress={() => handleRemove(trip)} accessibilityLabel="Remove trip" style={styles.removeButton}>
                  Remove Trip
                </Button>
              </View>
            );
          })
        )}
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
  intro: {
    marginBottom: 4,
  },
  addButton: {
    alignSelf: "flex-start",
  },
  divider: {
    marginVertical: 8,
  },
  form: {
    gap: 8,
  },
  input: {
    marginBottom: 2,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  tripCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
    marginBottom: 10,
  },
  tripHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  remindersBlock: {
    marginTop: 6,
    gap: 2,
  },
  removeButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginLeft: -8,
  },
});
