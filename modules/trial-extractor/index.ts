import { requireOptionalNativeModule } from 'expo';

type RawExtraction = Record<
  'service' | 'price' | 'currency' | 'billingPeriod' | 'chargeDate' | 'cancelUrl',
  string
>;

type TrialExtractorModule = {
  isAvailable(): boolean;
  extract(text: string, today: string): Promise<RawExtraction | null>;
};

// Missing on Android, web and older iPhones: callers fall back to the rule-based parser.
const native = requireOptionalNativeModule<TrialExtractorModule>('TrialExtractor');

/** True when Apple Intelligence's on-device model is ready to use. */
export function isOnDeviceModelAvailable(): boolean {
  try {
    return native?.isAvailable() ?? false;
  } catch {
    return false;
  }
}

/** Asks the on-device model for trial details. Never leaves the phone. */
export async function extractWithOnDeviceModel(
  text: string,
  today: string
): Promise<RawExtraction | null> {
  if (!native || !isOnDeviceModelAvailable()) return null;
  return native.extract(text, today);
}
