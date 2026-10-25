Pod::Spec.new do |s|
  s.name           = 'TrialSystem'
  s.version        = '1.0.0'
  s.summary        = 'iCloud key-value sync and the shared snapshot that Siri and Shortcuts read.'
  s.author         = ''
  s.homepage       = 'https://github.com/bernardodonnell-star/trial-guardian'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '*.swift'
end
