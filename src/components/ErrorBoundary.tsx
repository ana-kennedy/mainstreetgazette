import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // In production a real crash reporter (Sentry, etc.) would go here
    if (__DEV__) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const label = this.props.fallbackLabel ?? "Something went wrong.";

    return (
      <Pressable
        onPress={this.handleReset}
        style={styles.container}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${label} Double tap to try again.`}
      >
        <Text
          variant="headlineSmall"
          style={styles.title}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          Oops
        </Text>
        <Text
          variant="bodyMedium"
          style={styles.body}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {label}
        </Text>
        {__DEV__ && this.state.errorMessage ? (
          <Text
            variant="bodySmall"
            style={styles.devMessage}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {this.state.errorMessage}
          </Text>
        ) : null}
        <Pressable
          onPress={this.handleReset}
          style={styles.retryBtn}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityHint="Double tap to reload this section."
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text variant="labelLarge" style={styles.retryLabel}>
            Try Again
          </Text>
        </Pressable>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: {
    fontWeight: "700",
  },
  body: {
    textAlign: "center",
    opacity: 0.8,
  },
  devMessage: {
    textAlign: "center",
    opacity: 0.5,
    fontFamily: "monospace",
    fontSize: 11,
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#888",
  },
  retryLabel: {
    fontWeight: "600",
  },
});
