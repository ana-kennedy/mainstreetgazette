// Phase 66 — Interactive First-Time Tour: stepped overlay walking through the tabs.
// Phase 09: content rewritten for the current 3-tab IA (News/Explore/For You) and
// rewired as the Startup Wizard's optional "Take the Grand Tour" action — this
// component was previously built but never rendered/wired anywhere (confirmed via
// repo-wide search before this phase), and its old copy referenced a stale 5-tab
// layout (News/Explore/Search/Collections/Preferences) from before the redesign.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { AccessibilityInfo, Modal, Pressable, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { markTourShown } from "../services/welcomeExperience";

interface TourStep {
  icon: string;
  title: string;
  description: string;
  tab?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: "hand-wave-outline",
    title: "Welcome to Main Street Gazette!",
    description: "We'll show you around in a few quick steps. You can also skip this tour and find help anytime from the gear icon.",
  },
  {
    icon: "newspaper-variant-outline",
    tab: "News",
    title: "News — your Gazette feed",
    description: "Articles, videos, and podcasts about Disney parks, all in one scrollable feed. Stories from multiple sources are automatically grouped together.",
  },
  {
    icon: "castle",
    tab: "Explore",
    title: "Explore — live park information",
    description: "Wait times, weather, park hours, and planning tools for Disney destinations around the world.",
  },
  {
    icon: "star-circle-outline",
    tab: "For You",
    title: "For You — pick up where you left off",
    description: "Resume podcasts, revisit your Gazette Library, and see picks based on your My Magic favorites.",
  },
  {
    icon: "cog-outline",
    title: "Your Gazette — make it yours",
    description: "The gear icon on every tab opens Your Gazette: My Magic, Gazette Alerts, Reading Experience, Accessibility, and more.",
  },
];

interface FirstTimeTourProps {
  visible: boolean;
  onComplete: () => void;
}

export function FirstTimeTour({ visible, onComplete }: FirstTimeTourProps) {
  const theme = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const step = TOUR_STEPS[stepIndex]!;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) {
      await markTourShown();
      onComplete();
    } else {
      const nextStep = TOUR_STEPS[stepIndex + 1];
      if (nextStep) {
        AccessibilityInfo.announceForAccessibility(`Step ${stepIndex + 2} of ${TOUR_STEPS.length}. ${nextStep.title}`);
      }
      setStepIndex((i) => i + 1);
    }
  };

  const handleSkip = async () => {
    await markTourShown();
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
      accessibilityViewIsModal
    >
      <View
        style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        accessible={false}
        importantForAccessibility="no"
      />
      <View style={styles.centeredContainer}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          {/* Step content — collapsed into one VoiceOver stop; Skip/Next below stay separately reachable. */}
          <View
            style={styles.stepContent}
            accessible
            accessibilityLabel={`Step ${stepIndex + 1} of ${TOUR_STEPS.length}. ${step.title}. ${step.description}`}
          >
            {/* Step dots */}
            <View style={styles.dots}>
              {TOUR_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === stepIndex ? theme.colors.primary : theme.colors.surfaceVariant,
                      width: i === stepIndex ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name={step.icon as any} size={40} color={theme.colors.primary} />
            </View>

            {/* Tab chip */}
            {step.tab ? (
              <View style={[styles.tabChip, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer, fontWeight: "700" }}>
                  {step.tab.toUpperCase()} TAB
                </Text>
              </View>
            ) : null}

            <Text
              variant="titleLarge"
              style={[styles.stepTitle, { color: theme.colors.onSurface }]}
            >
              {step.title}
            </Text>

            <Text
              variant="bodyMedium"
              style={[styles.stepDesc, { color: theme.colors.onSurfaceVariant }]}
            >
              {step.description}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleSkip}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Skip tour"
              style={styles.skipBtn}
            >
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Skip
              </Text>
            </Pressable>
            <Button
              mode="contained"
              onPress={handleNext}
              accessibilityLabel={isLast ? "Done, close the tour" : `Next, go to step ${stepIndex + 2}`}
              accessibilityRole="button"
            >
              {isLast ? "Done" : "Next"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    alignItems: "center",
  },
  stepContent: {
    gap: 14,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    height: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  tabChip: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepTitle: {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 26,
  },
  stepDesc: {
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 4,
  },
  skipBtn: {
    padding: 8,
  },
});
