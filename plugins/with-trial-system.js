// Native set-up that no Expo package covers:
// - the iCloud key-value store entitlement, for syncing trials between devices;
// - the Siri and Shortcuts intents (plugins/ios/TrialIntents.swift), compiled into the app target.
const { IOSConfig, withDangerousMod, withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const INTENTS_FILE = 'TrialIntents.swift';

function withCloudKeyValueStore(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.ubiquity-kvstore-identifier'] = '$(TeamIdentifierPrefix)$(CFBundleIdentifier)';
    return cfg;
  });
}

function withIntentsSource(config) {
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      const target = path.join(cfg.modRequest.platformProjectRoot, projectName, INTENTS_FILE);
      fs.copyFileSync(path.join(__dirname, 'ios', INTENTS_FILE), target);
      return cfg;
    },
  ]);
  return withXcodeProject(config, (cfg) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const filepath = `${projectName}/${INTENTS_FILE}`;
    if (!cfg.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: projectName, project: cfg.modResults });
    }
    return cfg;
  });
}

module.exports = function withTrialSystem(config) {
  return withIntentsSource(withCloudKeyValueStore(config));
};
