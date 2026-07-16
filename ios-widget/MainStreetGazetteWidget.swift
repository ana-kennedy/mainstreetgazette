import WidgetKit
import SwiftUI

@main
struct MainStreetGazetteWidgetBundle: WidgetBundle {
  var body: some Widget {
    MGSmallWidget()
    MGMediumWidget()
    if #available(iOS 16.0, *) {
      MGLockScreenWidget()
    }
  }
}
