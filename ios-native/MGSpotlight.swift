import Foundation
import CoreSpotlight

@objc(MGSpotlight)
class MGSpotlight: NSObject {

  @objc func indexItems(_ items: NSArray,
                         resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
    var searchableItems: [CSSearchableItem] = []
    for case let item as NSDictionary in items {
      guard let id = item["id"] as? String,
            let title = item["title"] as? String else { continue }
      let attrs = CSSearchableItemAttributeSet(contentType: .text)
      attrs.title = title
      attrs.contentDescription = item["summary"] as? String
      if let urlStr = item["url"] as? String { attrs.url = URL(string: urlStr) }
      if let thumbStr = item["thumbnailURL"] as? String { attrs.thumbnailURL = URL(string: thumbStr) }
      if let published = item["publishedAt"] as? String {
        attrs.contentCreationDate = ISO8601DateFormatter().date(from: published)
      }
      let si = CSSearchableItem(
        uniqueIdentifier: "com.mainstreetgazette.article.\(id)",
        domainIdentifier: "com.mainstreetgazette",
        attributeSet: attrs
      )
      si.expirationDate = .distantFuture
      searchableItems.append(si)
    }
    CSSearchableIndex.default().indexSearchableItems(searchableItems) { error in
      if let e = error { reject("SPOTLIGHT_ERROR", e.localizedDescription, e) }
      else { resolve(searchableItems.count) }
    }
  }

  @objc func deleteAllItems(_ resolve: @escaping RCTPromiseResolveBlock,
                              reject: @escaping RCTPromiseRejectBlock) {
    CSSearchableIndex.default().deleteAllSearchableItems { error in
      if let e = error { reject("SPOTLIGHT_ERROR", e.localizedDescription, e) }
      else { resolve(nil) }
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { false }
}
