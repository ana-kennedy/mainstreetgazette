import Foundation
import UIKit

@objc(MGKeyboardShortcuts)
class MGKeyboardShortcuts: RCTEventEmitter {
  private weak var keyResponder: MGKeyResponder?

  override func supportedEvents() -> [String] {
    return ["MGKeyCommand"]
  }

  @objc func install() {
    DispatchQueue.main.async {
      guard let rootVC = UIApplication.shared.windows.first(where: { $0.isKeyWindow })?.rootViewController else { return }
      // Remove any previously installed responder
      self.keyResponder?.view.removeFromSuperview()
      self.keyResponder?.removeFromParent()

      let responder = MGKeyResponder { [weak self] command in
        self?.sendEvent(withName: "MGKeyCommand", body: ["command": command])
      }
      // Install as hidden child — iOS traverses child VCs when looking for keyCommand handlers
      responder.view.frame = .zero
      responder.view.isHidden = true
      responder.view.isUserInteractionEnabled = false
      rootVC.addChild(responder)
      rootVC.view.addSubview(responder.view)
      responder.didMove(toParent: rootVC)
      self.keyResponder = responder
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { true }
}

class MGKeyResponder: UIViewController {
  private let onCommand: (String) -> Void

  init(onCommand: @escaping (String) -> Void) {
    self.onCommand = onCommand
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { nil }

  override var keyCommands: [UIKeyCommand]? {
    return [
      UIKeyCommand(input: "r", modifierFlags: .command, action: #selector(doRefresh), discoverabilityTitle: "Refresh Feed"),
      UIKeyCommand(input: "f", modifierFlags: .command, action: #selector(doFind), discoverabilityTitle: "Find in Timeline"),
      UIKeyCommand(input: "1", modifierFlags: .command, action: #selector(doTab0), discoverabilityTitle: "News"),
      UIKeyCommand(input: "2", modifierFlags: .command, action: #selector(doTab1), discoverabilityTitle: "Discover"),
      UIKeyCommand(input: "3", modifierFlags: .command, action: #selector(doTab2), discoverabilityTitle: "For You"),
      UIKeyCommand(input: ",", modifierFlags: .command, action: #selector(doSettings), discoverabilityTitle: "Settings"),
      UIKeyCommand(input: "s", modifierFlags: .command, action: #selector(doSave), discoverabilityTitle: "Save Article"),
    ]
  }

  @objc private func doRefresh()  { onCommand("refresh") }
  @objc private func doFind()     { onCommand("find") }
  @objc private func doTab0()     { onCommand("tab:0") }
  @objc private func doTab1()     { onCommand("tab:1") }
  @objc private func doTab2()     { onCommand("tab:2") }
  @objc private func doSettings() { onCommand("tab:3") }
  @objc private func doSave()     { onCommand("save") }
}
