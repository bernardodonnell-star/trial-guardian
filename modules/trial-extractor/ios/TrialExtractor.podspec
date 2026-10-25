Pod::Spec.new do |s|
  s.name           = 'TrialExtractor'
  s.version        = '1.0.0'
  s.summary        = 'Reads free trial details from text with Apple Foundation Models, on device.'
  s.author         = ''
  s.homepage       = 'https://github.com/bernardodonnell-star/trial-guardian'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'FoundationModels'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
