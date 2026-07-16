import Foundation
import MediaPlayer

@objc(MGNowPlaying)
class MGNowPlaying: RCTEventEmitter {
  private var commandsSetUp = false

  override func supportedEvents() -> [String] {
    return ["MGNowPlayingCommand"]
  }

  @objc func setMetadata(_ info: NSDictionary) {
    DispatchQueue.main.async {
      var nowPlaying: [String: Any] = [:]
      if let title = info["title"] as? String { nowPlaying[MPMediaItemPropertyTitle] = title }
      if let artist = info["artist"] as? String { nowPlaying[MPMediaItemPropertyArtist] = artist }
      if let duration = info["duration"] as? Double { nowPlaying[MPMediaItemPropertyPlaybackDuration] = duration }
      if let elapsed = info["elapsed"] as? Double { nowPlaying[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed }
      if let speed = info["speed"] as? Double { nowPlaying[MPNowPlayingInfoPropertyPlaybackRate] = speed }
      nowPlaying[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlaying
    }
  }

  @objc func updateElapsed(_ elapsed: Double, speed: Double) {
    DispatchQueue.main.async {
      var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
      info[MPNowPlayingInfoPropertyPlaybackRate] = speed
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
  }

  @objc func clearMetadata() {
    DispatchQueue.main.async {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }
  }

  @objc func setupRemoteCommands() {
    guard !commandsSetUp else { return }
    commandsSetUp = true
    DispatchQueue.main.async {
      let cc = MPRemoteCommandCenter.shared()
      cc.playCommand.isEnabled = true
      cc.pauseCommand.isEnabled = true
      cc.skipForwardCommand.isEnabled = true
      cc.skipForwardCommand.preferredIntervals = [30]
      cc.skipBackwardCommand.isEnabled = true
      cc.skipBackwardCommand.preferredIntervals = [15]
      cc.nextTrackCommand.isEnabled = false
      cc.previousTrackCommand.isEnabled = false

      cc.playCommand.addTarget { [weak self] _ in
        self?.sendEvent(withName: "MGNowPlayingCommand", body: ["command": "play"])
        return .success
      }
      cc.pauseCommand.addTarget { [weak self] _ in
        self?.sendEvent(withName: "MGNowPlayingCommand", body: ["command": "pause"])
        return .success
      }
      cc.togglePlayPauseCommand.addTarget { [weak self] _ in
        self?.sendEvent(withName: "MGNowPlayingCommand", body: ["command": "togglePlayPause"])
        return .success
      }
      cc.skipForwardCommand.addTarget { [weak self] event in
        let interval = (event as? MPSkipIntervalCommandEvent)?.interval ?? 30
        self?.sendEvent(withName: "MGNowPlayingCommand", body: ["command": "skipForward", "interval": interval])
        return .success
      }
      cc.skipBackwardCommand.addTarget { [weak self] event in
        let interval = (event as? MPSkipIntervalCommandEvent)?.interval ?? 15
        self?.sendEvent(withName: "MGNowPlayingCommand", body: ["command": "skipBackward", "interval": interval])
        return .success
      }
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool { true }
}
