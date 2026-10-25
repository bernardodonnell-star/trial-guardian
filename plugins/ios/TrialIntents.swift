import AppIntents
import Foundation

// Siri and Shortcuts actions. The app writes a small snapshot of upcoming trials to the
// App Group whenever they change, so these work without opening the app.

private let appGroup = "group.com.bernardodonnell.trialguardian"

private struct TrialSnapshot: Decodable {
  let service: String
  let deadline: Double
  let price: String?
}

private func loadSnapshot() -> [TrialSnapshot] {
  guard
    let json = UserDefaults(suiteName: appGroup)?.string(forKey: "trialSnapshot"),
    let data = json.data(using: .utf8),
    let trials = try? JSONDecoder().decode([TrialSnapshot].self, from: data)
  else { return [] }
  let now = Date().timeIntervalSince1970 * 1000
  return trials.filter { $0.deadline > now }.sorted { $0.deadline < $1.deadline }
}

private func describe(_ trial: TrialSnapshot) -> String {
  let deadline = Date(timeIntervalSince1970: trial.deadline / 1000)
  let calendar = Calendar.current
  let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: Date()), to: calendar.startOfDay(for: deadline)).day ?? 0
  let when: String
  switch days {
  case ...1: when = "today is the last day to cancel"
  case 2: when = "cancel by tomorrow"
  default: when = "cancel within \(days) days"
  }
  return "\(trial.service): \(when)"
}

@available(iOS 16.0, *)
struct TrialsEndingSoonIntent: AppIntent {
  static var title: LocalizedStringResource = "Trials ending soon"
  static var description = IntentDescription("Hear which free trials you need to cancel next.")

  func perform() async throws -> some IntentResult & ProvidesDialog & ReturnsValue<String> {
    let trials = loadSnapshot()
    guard !trials.isEmpty else {
      return .result(value: "", dialog: "You have no free trials to cancel.")
    }
    let lines = trials.prefix(3).map(describe)
    let text = lines.joined(separator: ". ")
    return .result(value: text, dialog: IntentDialog(stringLiteral: text + "."))
  }
}

@available(iOS 16.0, *)
struct AddTrialIntent: AppIntent {
  static var title: LocalizedStringResource = "Add a free trial"
  static var description = IntentDescription("Open Trial Guardian ready to add a new trial.")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    UserDefaults(suiteName: appGroup)?.set("/add", forKey: "pendingRoute")
    return .result()
  }
}

@available(iOS 16.0, *)
struct TrialGuardianShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: TrialsEndingSoonIntent(),
      phrases: [
        "Which trials end soon in \(.applicationName)",
        "What should I cancel in \(.applicationName)",
        "\(.applicationName) trials ending",
      ],
      shortTitle: "Trials ending soon",
      systemImageName: "hourglass"
    )
    AppShortcut(
      intent: AddTrialIntent(),
      phrases: [
        "Add a trial in \(.applicationName)",
        "Add a free trial to \(.applicationName)",
      ],
      shortTitle: "Add a trial",
      systemImageName: "plus.circle"
    )
  }
}
