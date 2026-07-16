const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * @param {import("@expo/config-plugins").ExpoConfig} config
 * @returns {import("@expo/config-plugins").ExpoConfig}
 */
function withAppIntents(config) {
  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const projectName = cfg.modRequest.projectName ?? "MainStreetGazette";
      const destDir = path.join(platformRoot, projectName);
      const srcDir = path.join(__dirname, "..", "ios-intents");
      for (const filename of ["MainStreetGazetteIntents.swift"]) {
        const src = path.join(srcDir, filename);
        const dest = path.join(destDir, filename);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
      }
      return cfg;
    },
  ]);
  return config;
}

module.exports = withAppIntents;
