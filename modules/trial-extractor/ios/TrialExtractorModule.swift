import ExpoModulesCore
#if canImport(FoundationModels)
import FoundationModels
#endif

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct TrialExtraction {
  @Guide(description: "The product or service the person signed up for, e.g. Netflix or Headspace. Not the payment provider (Apple, Google, PayPal). Empty if unclear.")
  var service: String

  @Guide(description: "The recurring price charged after the free trial, digits only with a dot for decimals, e.g. 9.99. Empty if not stated. Ignore amounts due today such as 0.00.")
  var price: String

  @Guide(description: "ISO 4217 currency code of that price, e.g. USD, GBP, EUR. Empty if unknown.")
  var currency: String

  @Guide(description: "How often the price is charged.", .anyOf(["week", "month", "year", "unknown"]))
  var billingPeriod: String

  @Guide(description: "The date the free trial ends or the first payment is taken, as YYYY-MM-DD. Work it out from today's date if the text only gives a length such as 7 days. Empty if unknown.")
  var chargeDate: String

  @Guide(description: "A link from the text for cancelling or managing the subscription. Never an email unsubscribe link. Empty if none.")
  var cancelUrl: String
}
#endif

public class TrialExtractorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TrialExtractor")

    Function("isAvailable") { () -> Bool in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        if case .available = SystemLanguageModel.default.availability {
          return true
        }
      }
      #endif
      return false
    }

    AsyncFunction("extract") { (text: String, today: String) async throws -> [String: String]? in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        guard case .available = SystemLanguageModel.default.availability else {
          return nil
        }
        let session = LanguageModelSession(
          instructions: """
          You read sign-up emails, receipts and screenshots for free trials and subscriptions, \
          and pull out the details needed to remind someone before they are charged. \
          Only use facts written in the text. Leave a field empty rather than guess.
          """
        )
        // The on-device model has a small context window, so keep the useful start of the text.
        let clipped = String(text.prefix(6000))
        let prompt = "Today's date is \(today).\n\nText:\n\(clipped)"
        let response = try await session.respond(
          to: prompt,
          generating: TrialExtraction.self,
          options: GenerationOptions(temperature: 0)
        )
        let result = response.content
        return [
          "service": result.service,
          "price": result.price,
          "currency": result.currency,
          "billingPeriod": result.billingPeriod,
          "chargeDate": result.chargeDate,
          "cancelUrl": result.cancelUrl,
        ]
      }
      #endif
      return nil
    }
  }
}
