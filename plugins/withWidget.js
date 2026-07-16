const { withEntitlementsPlist, withDangerousMod, withXcodeProject } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const APP_GROUP = "group.com.mainstreetgazette.app";
const WIDGET_TARGET_NAME = "MainStreetGazetteWidget";
const WIDGET_BUNDLE_ID = "com.mainstreetgazette.app.widget";
const WIDGET_SWIFT_FILES = ["MainStreetGazetteWidget.swift", "MGWidgetViews.swift"];

/**
 * @param {import("@expo/config-plugins").ExpoConfig} config
 * @returns {import("@expo/config-plugins").ExpoConfig}
 */
function withWidget(config) {
  // 1. Add App Group entitlement to main target
  config = withEntitlementsPlist(config, (cfg) => {
    const groups = cfg.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(APP_GROUP)) {
      cfg.modResults["com.apple.security.application-groups"] = [...groups, APP_GROUP];
    }
    return cfg;
  });

  // 2. Create widget extension directory + Info.plist + entitlements + copy Swift files
  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const projectName = cfg.modRequest.projectName ?? "MainStreetGazette";
      const widgetDir = path.join(platformRoot, WIDGET_TARGET_NAME);
      fs.mkdirSync(widgetDir, { recursive: true });

      // Copy widget Swift files
      const srcDir = path.join(__dirname, "..", "ios-widget");
      for (const f of WIDGET_SWIFT_FILES) {
        const src = path.join(srcDir, f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(widgetDir, f));
      }

      // Info.plist for widget extension
      fs.writeFileSync(
        path.join(widgetDir, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${WIDGET_BUNDLE_ID}</string>
  <key>CFBundleName</key>
  <string>${WIDGET_TARGET_NAME}</string>
  <key>CFBundleDisplayName</key>
  <string>Main Street Gazette</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`
      );

      // Entitlements for widget extension
      fs.writeFileSync(
        path.join(widgetDir, `${WIDGET_TARGET_NAME}.entitlements`),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>`
      );

      // Copy MGWidgetData native module to main target
      const mainTargetDir = path.join(platformRoot, projectName);
      for (const f of ["MGWidgetData.swift", "MGWidgetData.m"]) {
        const src = path.join(__dirname, "..", "ios-native", f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(mainTargetDir, f));
      }

      return cfg;
    },
  ]);

  // 3. Add widget extension target to Xcode project
  config = withXcodeProject(config, (cfg) => {
    const pbxProject = cfg.modResults;
    // Avoid adding duplicate target
    const existingTargets = pbxProject.pbxNativeTargetSection();
    const alreadyAdded = Object.values(existingTargets).some(
      (t) => typeof t === "object" && t.name === WIDGET_TARGET_NAME
    );
    if (alreadyAdded) return cfg;

    const widgetTarget = pbxProject.addTarget(
      WIDGET_TARGET_NAME,
      "app_extension",
      WIDGET_TARGET_NAME,
      WIDGET_BUNDLE_ID
    );
    if (!widgetTarget) return cfg;

    // Add Swift source files to the widget target
    for (const f of WIDGET_SWIFT_FILES) {
      pbxProject.addSourceFile(
        `${WIDGET_TARGET_NAME}/${f}`,
        { target: widgetTarget.uuid },
        WIDGET_TARGET_NAME
      );
    }

    // Add Info.plist as resource
    pbxProject.addResourceFile(
      `${WIDGET_TARGET_NAME}/Info.plist`,
      { target: widgetTarget.uuid },
      WIDGET_TARGET_NAME
    );

    // Link WidgetKit and SwiftUI frameworks to widget target
    pbxProject.addFramework("WidgetKit.framework", { target: widgetTarget.uuid });
    pbxProject.addFramework("SwiftUI.framework", { target: widgetTarget.uuid });

    // Set Swift version and other build settings
    const buildConfigs = pbxProject.pbxXCBuildConfigurationSection();
    Object.values(buildConfigs).forEach((config) => {
      if (typeof config === "object" && config.buildSettings) {
        if (
          config.buildSettings.PRODUCT_NAME === WIDGET_TARGET_NAME ||
          config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === WIDGET_BUNDLE_ID
        ) {
          config.buildSettings.SWIFT_VERSION = "5.0";
          config.buildSettings.INFOPLIST_FILE = `${WIDGET_TARGET_NAME}/Info.plist`;
          config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`;
          config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
          config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = "16.0";
        }
      }
    });

    return cfg;
  });

  return config;
}

module.exports = withWidget;
