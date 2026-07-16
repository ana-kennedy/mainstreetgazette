import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { openBrowserAsync } from "expo-web-browser";
import { getLocales } from "expo-localization";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityActionEvent, AccessibilityInfo, Alert, Linking, NativeModules, Platform, ScrollView, Share, StyleSheet, View } from "react-native";
import { Button, Chip, Divider, Text } from "react-native-paper";
import { Screen } from "../components/Screen";
import { useAppContext } from "../context/AppContext";
import { usePlayback } from "../context/PlaybackContext";
import { useHandoff } from "../hooks/useHandoff";
import type { NewsStackParamList, SavedStackParamList, SourcesStackParamList } from "../navigation/types";
import { isFoundationModelsAvailable, summarizeArticle } from "../services/foundationModels";
import { isTranslationAvailable, translateText } from "../services/articleTranslation";
import { clockString, contentTypeDisplayName, relativePublishedText, trustLabelDisplayName } from "../utils/formatting";

type Props =
  | NativeStackScreenProps<NewsStackParamList, "FeedDetail">
  | NativeStackScreenProps<SourcesStackParamList, "FeedDetail">
  | NativeStackScreenProps<SavedStackParamList, "SavedDetail">;

interface DetailAction {
  key: string;
  label: string;
  icon: string;
  mode: "text" | "outlined" | "contained" | "contained-tonal" | "elevated";
  onPress: () => void | Promise<void>;
  accessibilityLabel: string;
  hint: string;
  disabled?: boolean;
  loading?: boolean;
}

export function FeedDetailScreen({ route, navigation }: Props) {
  const { item } = route.params;
  const app = useAppContext();
  const playback = usePlayback();
  const { t } = useTranslation();
  const current = app.items.find((candidate) => candidate.id === item.id) ?? item;
  useHandoff(current.canonicalURL, current.title);

  const sourceName = app.sources.find((source) => source.id === current.sourceID)?.name ?? t("detail.unknownWebsite");
  const authorText = current.authorOrChannel && current.authorOrChannel !== sourceName ? current.authorOrChannel : null;
  const contentType = contentTypeDisplayName(current.contentType);
  const publishedText = relativePublishedText(current.publishedAt);
  const durationText = current.durationSeconds ? t("detail.durationText", { clock: clockString(current.durationSeconds) }) : null;
  const headerAccessibilityLabel = [
    current.title,
    t("detail.sourceText", { name: sourceName }),
    authorText ? t("detail.byText", { name: authorText }) : null,
    publishedText,
    durationText
  ].filter(Boolean).join(" ");

  const isPodcastLoading = playback.loadingItemID === current.id;
  const isCurrentPodcast = playback.currentItem?.id === current.id;
  const playLabel = isPodcastLoading ? t("detail.loading") : isCurrentPodcast && playback.isPlaying ? t("detail.playing") : t("detail.listen");
  const [areActionsVisible, setAreActionsVisible] = useState(false);
  const isPlayActionDisabled = playback.isLoading || (isCurrentPodcast && playback.isPlaying);
  const contentTypeLower = contentType.toLowerCase();
  const saveLabel = current.isSaved ? t("detail.unsaveLabel", { type: contentTypeLower }) : t("detail.saveLabel", { type: contentTypeLower });
  const saveHint = current.isSaved ? t("detail.unsaveHint", { type: contentTypeLower }) : t("detail.saveHint");

  // Intelligence state
  const [aiAvailable, setAiAvailable] = useState(false);
  const [translationAvailable, setTranslationAvailable] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (NativeModules.MGFoundationModels && app.settings?.aiSummariesEnabled) {
      isFoundationModelsAvailable().then(setAiAvailable).catch(() => {});
    }
    if (NativeModules.MGTranslation && app.settings?.translateArticlesEnabled) {
      isTranslationAvailable().then(setTranslationAvailable).catch(() => {});
    }
  }, [app.settings?.aiSummariesEnabled, app.settings?.translateArticlesEnabled]);

  const handleGenerateSummary = async () => {
    const textToSummarize = current.summary ?? current.title;
    setIsGeneratingSummary(true);
    try {
      const result = await summarizeArticle(textToSummarize);
      setAiSummary(result);
      AccessibilityInfo.announceForAccessibility(`${t("intelligence.summaryLabel")}: ${result}`);
    } catch {
      AccessibilityInfo.announceForAccessibility(t("intelligence.unavailable"));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleTranslate = async () => {
    const textToTranslate = aiSummary ?? current.summary;
    if (!textToTranslate) return;
    const [locale] = getLocales();
    const targetLang = locale?.languageCode ?? "en";
    setIsTranslating(true);
    try {
      const result = await translateText(textToTranslate, targetLang);
      setTranslatedText(result);
      AccessibilityInfo.announceForAccessibility(`${t("intelligence.translatedLabel")}: ${result}`);
    } catch {
      AccessibilityInfo.announceForAccessibility(t("intelligence.translationUnavailable"));
    } finally {
      setIsTranslating(false);
    }
  };

  const summaryToShow = aiSummary ?? current.summary;
  const canGenerateSummary = aiAvailable && !current.summary && !aiSummary && !isGeneratingSummary;
  const canTranslate = translationAvailable && !!summaryToShow && !translatedText && !isTranslating;

  // Content-type-aware primary action per temp/03_IMPLEMENTATION_PHASES/PHASE_03_GAZETTE_READER.md
  // and the approved Actions vocabulary in temp/08_COPY_AND_CONTENT/APP_COPY_REFERENCE.md.
  // There is no fullText field anywhere in this app's data model — only `summary` — so for
  // articles this is always the "only a summary is available" case the spec describes, and
  // the action is always "Continue to Original Story," never an in-app full read.
  const primaryAction: DetailAction =
    current.contentType === "podcast"
      ? {
          key: "play",
          label: playLabel,
          icon: "play",
          mode: "contained-tonal" as const,
          onPress: () => playback.playItem(current),
          accessibilityLabel: t("detail.playA11y", { title: current.title }),
          hint: isPodcastLoading ? t("detail.playLoadingHint") : t("detail.playHint"),
          disabled: isPlayActionDisabled,
          loading: isPodcastLoading
        }
      : current.contentType === "video"
        ? {
            // No in-app video player exists in this app today — this opens the video on its
            // original website rather than playing in-app. See PHASE_03_RESULTS.md.
            key: "watch",
            label: t("detail.watch"),
            icon: "play-box-outline",
            mode: "contained-tonal" as const,
            onPress: () => Linking.openURL(current.externalURL ?? current.canonicalURL),
            accessibilityLabel: t("detail.watch"),
            hint: t("detail.watchHint")
          }
        : current.contentType === "community"
          ? {
              key: "openOriginal",
              label: t("detail.openOriginalWebsite"),
              icon: "open-in-new",
              mode: "contained-tonal" as const,
              onPress: () => Linking.openURL(current.externalURL ?? current.canonicalURL),
              accessibilityLabel: t("detail.openOriginalWebsite"),
              hint: t("detail.openOriginalWebsiteHint")
            }
          : {
              key: "continueReading",
              label: t("detail.continueReading"),
              icon: "arrow-right-circle-outline",
              mode: "contained-tonal" as const,
              onPress: () => {
                const url = current.externalURL ?? current.canonicalURL;
                if (Platform.OS === "ios" && app.settings?.preferReaderMode) {
                  openBrowserAsync(url, { readerMode: true });
                } else {
                  Linking.openURL(url);
                }
              },
              accessibilityLabel: t("detail.continueReading"),
              hint: t("detail.continueReadingHint")
            };

  // Always-available, guaranteed-system-browser link — distinct from the primary action above,
  // which may open in an in-app reader view for articles. Community posts skip this since their
  // primary action already is "Open Original Website."
  const openWebsiteAction: DetailAction | null =
    current.contentType === "community"
      ? null
      : {
          key: "openWebsite",
          label: t("detail.openOriginalWebsite"),
          icon: "open-in-new",
          mode: "outlined" as const,
          onPress: () => Linking.openURL(current.externalURL ?? current.canonicalURL),
          accessibilityLabel: t("detail.openOriginalWebsite"),
          hint: t("detail.openOriginalWebsiteHint")
        };

  const shareAction: DetailAction = {
    key: "share",
    label: t("feed.share", { type: contentTypeLower }),
    icon: "share-variant",
    mode: "outlined" as const,
    onPress: async () => {
      await Share.share(
        Platform.OS === "ios"
          ? { url: current.canonicalURL, title: current.title }
          : { message: current.canonicalURL, title: current.title }
      );
    },
    accessibilityLabel: t("feed.share", { type: contentTypeLower }),
    hint: t("feed.shareHint")
  };

  const aboutAction: DetailAction = {
    key: "about",
    label: t("detail.aboutInformation"),
    icon: "information-outline",
    mode: "text" as const,
    onPress: () =>
      Alert.alert(
        t("detail.aboutInformationTitle"),
        t("detail.aboutInformationBody", { source: sourceName, trust: trustLabelDisplayName(current.trustLabel) })
      ),
    accessibilityLabel: t("detail.aboutInformation"),
    hint: t("detail.aboutInformationHint")
  };

  const detailActions: DetailAction[] = [
    {
      key: "save",
      label: current.isSaved ? t("a11y.savedLabel").replace(".", "") : t("a11y.save"),
      icon: current.isSaved ? "bookmark" : "bookmark-outline",
      mode: "contained" as const,
      onPress: () => app.toggleSaved(current.id),
      accessibilityLabel: saveLabel,
      hint: saveHint
    },
    primaryAction,
    ...(current.contentType === "podcast"
      ? [
          {
            key: "queue",
            label: t("feed.addToQueue"),
            icon: "playlist-plus",
            mode: "outlined" as const,
            onPress: () => playback.addToQueue(current),
            accessibilityLabel: t("feed.addToQueue"),
            hint: t("feed.addToQueueHint")
          }
        ]
      : []),
    ...(openWebsiteAction ? [openWebsiteAction] : []),
    shareAction,
    aboutAction,
  ];

  const iosAccessibilityActions =
    Platform.OS === "ios"
      ? detailActions
          .filter((action) => !action.disabled)
          .map((action) => ({ name: `action-${action.key}`, label: action.accessibilityLabel }))
      : undefined;

  const handleActionsAccessibilityAction = (event: AccessibilityActionEvent) => {
    const actionKey = event.nativeEvent.actionName.replace("action-", "");
    const selectedAction = detailActions.find((action) => action.key === actionKey && !action.disabled);
    selectedAction?.onPress();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          mode="text"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
          accessibilityHint={t("common.back")}
        >
          {t("common.back")}
        </Button>
        <View accessible accessibilityRole="header" accessibilityLabel={headerAccessibilityLabel} style={styles.titleBlock}>
          <Chip accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {contentType}
          </Chip>
          <Text variant="headlineSmall">
            {current.title}
          </Text>
          <Text variant="bodyLarge">{sourceName}</Text>
          {authorText ? <Text variant="bodyMedium">{t("feed.by", { name: authorText })}</Text> : null}
          <Text variant="bodyMedium">{publishedText}</Text>
          {durationText ? <Text variant="bodyMedium">{durationText}</Text> : null}
          {current.trustLabel ? (
            <Text variant="labelSmall" style={styles.trustLabel}>
              {trustLabelDisplayName(current.trustLabel)}
            </Text>
          ) : null}
        </View>
        <Divider />

        {/* Summary block — RSS summary, AI-generated, and translated variants */}
        <View style={styles.summaryBlock}>
          {summaryToShow ? (
            <Text
              variant="bodyLarge"
              accessibilityLabel={aiSummary ? `${t("intelligence.summaryLabel")}: ${aiSummary}` : summaryToShow}
            >
              {summaryToShow}
            </Text>
          ) : (
            <Text variant="bodyLarge" style={styles.noSummary}>
              No summary was provided by this source.
            </Text>
          )}

          {translatedText ? (
            <View style={styles.translatedBlock}>
              <Text variant="labelSmall" style={styles.translatedLabel}>
                {t("intelligence.translatedLabel")}
              </Text>
              <Text
                variant="bodyLarge"
                accessibilityLabel={`${t("intelligence.translatedLabel")}: ${translatedText}`}
              >
                {translatedText}
              </Text>
            </View>
          ) : null}

          <View style={styles.intelligenceActions}>
            {canGenerateSummary ? (
              <Button
                mode="outlined"
                icon="creation"
                onPress={handleGenerateSummary}
                loading={isGeneratingSummary}
                accessibilityLabel={t("intelligence.generateSummary")}
                accessibilityRole="button"
                accessibilityHint="Uses Apple Intelligence on this device to create a one-sentence summary."
              >
                {t("intelligence.generateSummary")}
              </Button>
            ) : null}
            {isGeneratingSummary ? (
              <Text variant="bodySmall" style={styles.loadingLabel}>
                {t("intelligence.generatingSummary")}
              </Text>
            ) : null}
            {canTranslate ? (
              <Button
                mode="outlined"
                icon="translate"
                onPress={handleTranslate}
                loading={isTranslating}
                accessibilityLabel={t("intelligence.translateAction")}
                accessibilityRole="button"
                accessibilityHint="Uses Apple's on-device translation to translate this summary to your device language."
              >
                {t("intelligence.translateAction")}
              </Button>
            ) : null}
            {isTranslating ? (
              <Text variant="bodySmall" style={styles.loadingLabel}>
                {t("intelligence.translating")}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            icon="dots-horizontal"
            onPress={() => setAreActionsVisible((currentValue) => !currentValue)}
            accessibilityLabel={`Actions button ${areActionsVisible ? "expanded" : "collapsed"}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: areActionsVisible }}
            accessibilityHint={
              Platform.OS === "ios"
                ? areActionsVisible
                  ? "Swipe up or down to choose an action. Double tap to collapse."
                  : "Swipe up or down to choose an action. Double tap to expand."
                : areActionsVisible
                  ? "Double tap to collapse actions."
                  : "Double tap to expand actions."
            }
            accessibilityActions={iosAccessibilityActions}
            onAccessibilityAction={Platform.OS === "ios" ? handleActionsAccessibilityAction : undefined}
          >
            Actions
          </Button>
          {areActionsVisible
            ? detailActions.map((action) => (
                <Button
                  key={action.key}
                  mode={action.mode}
                  icon={action.icon}
                  onPress={action.onPress}
                  loading={action.loading}
                  disabled={action.disabled}
                  accessibilityLabel={action.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: action.disabled, busy: action.loading }}
                  accessibilityHint={action.hint}
                >
                  {action.label}
                </Button>
              ))
            : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16
  },
  titleBlock: {
    gap: 8
  },
  trustLabel: {
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  backButton: {
    alignSelf: "flex-start"
  },
  summaryBlock: {
    gap: 12
  },
  noSummary: {
    opacity: 0.6
  },
  translatedBlock: {
    gap: 4
  },
  translatedLabel: {
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  intelligenceActions: {
    gap: 8,
    alignItems: "flex-start"
  },
  loadingLabel: {
    opacity: 0.6
  },
  actions: {
    gap: 10
  }
});
