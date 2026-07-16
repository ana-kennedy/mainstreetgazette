import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

private let appGroup = "group.com.mainstreetgazette.app"

@objc(MGWidgetData)
class MGWidgetData: NSObject {

  @objc func writeData(_ data: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: appGroup) else {
      reject("WIDGET_ERROR", "App Group not available", nil)
      return
    }
    if let unreadCount = data["unreadCount"] as? Int {
      defaults.set(unreadCount, forKey: "MSG_unreadCount")
    }
    if let latestTitle = data["latestTitle"] as? String {
      defaults.set(latestTitle, forKey: "MSG_latestTitle")
    }
    if let latestSource = data["latestSource"] as? String {
      defaults.set(latestSource, forKey: "MSG_latestSource")
    }
    if let latestURL = data["latestURL"] as? String {
      defaults.set(latestURL, forKey: "MSG_latestURL")
    }
    if let latestThumbnail = data["latestThumbnail"] as? String {
      defaults.set(latestThumbnail, forKey: "MSG_latestThumbnail")
    }
    defaults.set(Date().timeIntervalSince1970, forKey: "MSG_lastUpdated")
    defaults.synchronize()
    #if canImport(WidgetKit)
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    #endif
    resolve(true)
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
