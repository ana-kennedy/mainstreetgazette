import Foundation
import UIKit

@objc(MGHandoff)
class MGHandoff: NSObject {
  private var currentActivity: NSUserActivity?

  @objc func advertise(_ url: String, title: String) {
    DispatchQueue.main.async {
      self.currentActivity?.invalidate()
      let activity = NSUserActivity(activityType: "com.mainstreetgazette.viewArticle")
      activity.title = title
      activity.isEligibleForHandoff = true
      activity.isEligibleForSearch = false
      if let webURL = URL(string: url) {
        activity.webpageURL = webURL
      }
      activity.userInfo = ["url": url, "title": title]
      activity.becomeCurrent()
      self.currentActivity = activity
    }
  }

  @objc func resign() {
    DispatchQueue.main.async {
      self.currentActivity?.resignCurrent()
      self.currentActivity?.invalidate()
      self.currentActivity = nil
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
