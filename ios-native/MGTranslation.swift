import Foundation
import React
import UIKit

#if canImport(Translation)
import Translation
import SwiftUI

// Minimal SwiftUI view that triggers Apple's Translation framework and returns
// the result via callbacks. Hosted inside a 1×1 invisible UIHostingController.
@available(iOS 17.4, *)
private struct TranslationBridge: View {
  let text: String
  let targetLanguage: String
  let onResult: (String) -> Void
  let onError: (Error) -> Void

  var body: some View {
    Color.clear
      .frame(width: 1, height: 1)
      .translationTask(
        TranslationSession.Configuration(
          source: nil,
          target: Locale.Language(identifier: targetLanguage)
        )
      ) { session in
        do {
          let response = try await session.translate(text)
          onResult(response.targetText)
        } catch {
          onError(error)
        }
      }
  }
}
#endif

@objc(MGTranslation)
class MGTranslation: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(Translation)
    if #available(iOS 17.4, *) {
      resolve(true)
      return
    }
    #endif
    resolve(false)
  }

  @objc func translate(_ text: String,
                       targetLanguage: String,
                       resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(Translation)
    guard #available(iOS 17.4, *) else {
      reject("UNAVAILABLE", "Translation requires iOS 17.4 or later.", nil)
      return
    }

    DispatchQueue.main.async {
      guard let rootVC = UIApplication.shared.connectedScenes
        .compactMap({ $0 as? UIWindowScene })
        .compactMap({ $0.windows.first })
        .first?.rootViewController else {
        reject("NO_VC", "No root view controller found.", nil)
        return
      }

      // Hold a strong reference so the hosting controller stays alive until the
      // translation completes and the callbacks clean it up.
      var hostingVC: UIHostingController<TranslationBridge>?

      let bridge = TranslationBridge(
        text: text,
        targetLanguage: targetLanguage,
        onResult: { translated in
          DispatchQueue.main.async {
            hostingVC?.view.removeFromSuperview()
            hostingVC?.removeFromParent()
            hostingVC = nil
            resolve(translated)
          }
        },
        onError: { error in
          DispatchQueue.main.async {
            hostingVC?.view.removeFromSuperview()
            hostingVC?.removeFromParent()
            hostingVC = nil
            reject("TRANSLATE_ERROR", error.localizedDescription, error as NSError)
          }
        }
      )

      let vc = UIHostingController(rootView: bridge)
      vc.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
      vc.view.alpha = 0
      vc.view.isUserInteractionEnabled = false
      rootVC.addChild(vc)
      rootVC.view.addSubview(vc.view)
      vc.didMove(toParent: rootVC)
      hostingVC = vc
    }
    #else
    reject("UNAVAILABLE", "Translation is not available in this build.", nil)
    #endif
  }
}
