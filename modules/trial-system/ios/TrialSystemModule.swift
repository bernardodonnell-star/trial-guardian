import ExpoModulesCore

/// Small bridges to iOS features with no Expo package: iCloud key-value storage, and the
/// App Group values shared with the Siri and Shortcuts intents compiled into the app.
public class TrialSystemModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("TrialSystem")

    Events("onCloudChange")

    Function("isCloudAvailable") { () -> Bool in
      FileManager.default.ubiquityIdentityToken != nil
    }

    Function("cloudGet") { (key: String) -> String? in
      NSUbiquitousKeyValueStore.default.string(forKey: key)
    }

    Function("cloudSet") { (key: String, value: String) in
      NSUbiquitousKeyValueStore.default.set(value, forKey: key)
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    Function("cloudSynchronize") { () -> Bool in
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    Function("writeShared") { (group: String, key: String, value: String) in
      UserDefaults(suiteName: group)?.set(value, forKey: key)
    }

    /// Reads a value and removes it, e.g. a screen a Shortcut asked the app to open.
    Function("takeShared") { (group: String, key: String) -> String? in
      let defaults = UserDefaults(suiteName: group)
      let value = defaults?.string(forKey: key)
      defaults?.removeObject(forKey: key)
      return value
    }

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
        object: NSUbiquitousKeyValueStore.default,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onCloudChange", [:])
      }
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }
  }
}
