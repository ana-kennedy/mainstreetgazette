// Config plugin: adds iCloud KVS entitlement and copies the native Swift bridge
// files into the generated iOS project during expo prebuild / EAS Build.
const { withEntitlementsPlist, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * @param {import("@expo/config-plugins").ExpoConfig} config
 * @returns {import("@expo/config-plugins").ExpoConfig}
 */
function withCloudSync(config) {
  // 1. Add the iCloud KVS entitlement (no container needed for KVS — simpler than CloudKit).
  config = withEntitlementsPlist(config, (cfg) => {
    const bundleId = cfg.ios?.bundleIdentifier ?? "com.mainstreetgazette.app";
    cfg.modResults["com.apple.developer.ubiquity-kvstore-identifier"] =
      `$(TeamIdentifierPrefix)${bundleId}`;
    return cfg;
  });

  // 2. Copy the Swift module + ObjC bridge into the Xcode project folder during prebuild.
  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const projectName = cfg.modRequest.projectName ?? "MainStreetGazette";
      const destDir = path.join(platformRoot, projectName);
      const srcDir = path.join(__dirname, "..", "ios-native");

      for (const filename of ["MGCloudSync.swift", "MGCloudSync.m"]) {
        const src = path.join(srcDir, filename);
        const dest = path.join(destDir, filename);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withCloudSync;
