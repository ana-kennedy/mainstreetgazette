import Foundation
import React

#if canImport(FoundationModels)
import FoundationModels
#endif

@objc(MGFoundationModels)
class MGFoundationModels: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      resolve(SystemLanguageModel.default.isAvailable)
      return
    }
    #endif
    resolve(false)
  }

  @objc func summarize(_ text: String,
                       resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      Task {
        do {
          let session = LanguageModelSession()
          let truncated = String(text.prefix(3000))
          let prompt = """
            Summarize the following Disney parks news article in exactly one clear, \
            concise sentence suitable for a VoiceOver screen reader announcement. \
            Return only the sentence with no preamble or explanation.

            \(truncated)
            """
          let response = try await session.respond(to: prompt)
          resolve(response.content.trimmingCharacters(in: .whitespacesAndNewlines))
        } catch {
          reject("SUMMARIZE_ERROR", error.localizedDescription, error as NSError)
        }
      }
      return
    }
    #endif
    reject("UNAVAILABLE", "Apple Intelligence requires iOS 26 or later.", nil)
  }
}
