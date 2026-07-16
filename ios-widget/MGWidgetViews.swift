import WidgetKit
import SwiftUI

private let appGroup = "group.com.mainstreetgazette.app"

struct MGWidgetEntry: TimelineEntry {
  let date: Date
  let unreadCount: Int
  let latestTitle: String
  let latestSource: String
  let latestURL: URL?
}

struct MGWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> MGWidgetEntry {
    MGWidgetEntry(date: .now, unreadCount: 12, latestTitle: "Disney Announces New Attraction", latestSource: "WDW News Today", latestURL: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (MGWidgetEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MGWidgetEntry>) -> Void) {
    let e = entry()
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
    completion(Timeline(entries: [e], policy: .after(nextUpdate)))
  }

  private func entry() -> MGWidgetEntry {
    let defaults = UserDefaults(suiteName: appGroup)
    let unreadCount = defaults?.integer(forKey: "MSG_unreadCount") ?? 0
    let latestTitle = defaults?.string(forKey: "MSG_latestTitle") ?? "No new stories"
    let latestSource = defaults?.string(forKey: "MSG_latestSource") ?? ""
    let latestURLStr = defaults?.string(forKey: "MSG_latestURL")
    let latestURL = latestURLStr.flatMap(URL.init)
    return MGWidgetEntry(date: .now, unreadCount: unreadCount, latestTitle: latestTitle, latestSource: latestSource, latestURL: latestURL)
  }
}

// MARK: - Small Widget (unread count)
struct MGSmallWidget: Widget {
  let kind = "MGSmallWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MGWidgetProvider()) { entry in
      MGSmallWidgetView(entry: entry)
        .widgetURL(URL(string: "mainstreetgazette://open")!)
    }
    .configurationDisplayName("Main Street Gazette")
    .description("See your unread article count.")
    .supportedFamilies([.systemSmall])
  }
}

struct MGSmallWidgetView: View {
  let entry: MGWidgetEntry
  var body: some View {
    ZStack {
      Color(.systemBackground)
      VStack(spacing: 4) {
        Image(systemName: "newspaper.fill")
          .font(.title2)
          .foregroundColor(.accentColor)
        Text("\(entry.unreadCount)")
          .font(.system(size: 32, weight: .bold, design: .rounded))
          .foregroundColor(.primary)
        Text("unread")
          .font(.caption2)
          .foregroundColor(.secondary)
      }
    }
    .containerBackground(.background, for: .widget)
  }
}

// MARK: - Medium Widget (latest headline)
struct MGMediumWidget: Widget {
  let kind = "MGMediumWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MGWidgetProvider()) { entry in
      MGMediumWidgetView(entry: entry)
        .widgetURL(entry.latestURL ?? URL(string: "mainstreetgazette://open")!)
    }
    .configurationDisplayName("Main Street Gazette")
    .description("See the latest Disney headline.")
    .supportedFamilies([.systemMedium])
  }
}

struct MGMediumWidgetView: View {
  let entry: MGWidgetEntry
  var body: some View {
    HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 4) {
          Image(systemName: "newspaper.fill").font(.caption).foregroundColor(.accentColor)
          Text(entry.latestSource).font(.caption).foregroundColor(.secondary).lineLimit(1)
        }
        Text(entry.latestTitle).font(.headline).fontWeight(.semibold).lineLimit(3)
        Spacer()
        Text("\(entry.unreadCount) unread").font(.caption2).foregroundColor(.secondary)
      }
    }
    .padding()
    .containerBackground(.background, for: .widget)
  }
}

// MARK: - Lock Screen Widget (accessoryCircular)
@available(iOS 16.0, *)
struct MGLockScreenWidget: Widget {
  let kind = "MGLockScreenWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MGWidgetProvider()) { entry in
      MGLockScreenWidgetView(entry: entry)
        .widgetURL(URL(string: "mainstreetgazette://open")!)
    }
    .configurationDisplayName("Main Street Gazette")
    .description("Unread count on your Lock Screen.")
    .supportedFamilies([.accessoryCircular, .accessoryInline])
  }
}

@available(iOS 16.0, *)
struct MGLockScreenWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: MGWidgetEntry
  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Image(systemName: "newspaper.fill").font(.caption2)
          Text("\(entry.unreadCount)").font(.system(size: 14, weight: .bold, design: .rounded))
        }
      }
    default:
      Label("\(entry.unreadCount) unread", systemImage: "newspaper.fill")
    }
  }
}
