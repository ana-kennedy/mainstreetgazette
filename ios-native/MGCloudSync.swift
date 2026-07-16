import Foundation

@objc(MGCloudSync)
class MGCloudSync: RCTEventEmitter {
  private let store = NSUbiquitousKeyValueStore.default

  override init() {
    super.init()
    store.synchronize()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(externalChange(_:)),
      name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
      object: store
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc func externalChange(_ notification: Notification) {
    guard let keys = notification.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] else { return }
    sendEvent(withName: "MGCloudSyncExternalChange", body: ["keys": keys])
  }

  override func supportedEvents() -> [String]! {
    return ["MGCloudSyncExternalChange"]
  }

  @objc func getValue(
    _ key: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(store.string(forKey: key))
  }

  @objc func setValue(
    _ key: String,
    value: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    store.set(value, forKey: key)
    store.synchronize()
    resolve(nil)
  }

  @objc func removeValue(
    _ key: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    store.removeObject(forKey: key)
    store.synchronize()
    resolve(nil)
  }

  @objc func getAllKeys(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(Array(store.dictionaryRepresentation.keys))
  }

  override class func requiresMainQueueSetup() -> Bool {
    return false
  }
}
