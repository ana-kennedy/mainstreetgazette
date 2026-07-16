import AppIntents
import Foundation

// "Open Main Street Gazette"
@available(iOS 16.0, *)
struct OpenAppIntent: AppIntent {
  static var title: LocalizedStringResource = "Open Main Street Gazette"
  static var description = IntentDescription("Opens Main Street Gazette to the News feed.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    return .result()
  }
}

// "Show my saved articles"
@available(iOS 16.0, *)
struct ShowSavedIntent: AppIntent {
  static var title: LocalizedStringResource = "Show Saved Articles"
  static var description = IntentDescription("Opens the Saved tab in Main Street Gazette.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    return .result()
  }
}

// "What's new at Magic Kingdom?"
@available(iOS 16.0, *)
struct ShowParkNewsIntent: AppIntent {
  static var title: LocalizedStringResource = "Show Park News"
  static var description = IntentDescription("Opens news filtered to a Disney park.")
  static var openAppWhenRun = true

  @Parameter(title: "Park", optionsProvider: ParkOptionsProvider())
  var park: String

  func perform() async throws -> some IntentResult {
    return .result()
  }

  struct ParkOptionsProvider: DynamicOptionsProvider {
    func results() async throws -> [String] {
      return ["Magic Kingdom", "EPCOT", "Hollywood Studios", "Animal Kingdom",
              "Disneyland", "California Adventure"]
    }
  }
}

// "Play the latest Disney podcast"
@available(iOS 16.0, *)
struct PlayLatestPodcastIntent: AppIntent {
  static var title: LocalizedStringResource = "Play Latest Podcast"
  static var description = IntentDescription("Plays the most recent podcast episode in Main Street Gazette.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    return .result()
  }
}

// App Shortcuts provider — wires phrases to intents
@available(iOS 16.4, *)
struct MainStreetGazetteShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    return [
      AppShortcut(intent: OpenAppIntent(), phrases: ["Open \(.applicationName)", "Launch \(.applicationName)"]),
      AppShortcut(intent: ShowSavedIntent(), phrases: ["Show my saved articles in \(.applicationName)", "Open saved in \(.applicationName)"]),
      AppShortcut(intent: PlayLatestPodcastIntent(), phrases: ["Play the latest Disney podcast in \(.applicationName)"]),
    ]
  }
}
