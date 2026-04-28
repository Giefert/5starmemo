import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Tusavor',
  slug: 'tusavor',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/app_icon_1024.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-tusavor.png',
    resizeMode: 'cover',
    backgroundColor: '#1a1a1a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tusavor.app',
    infoPlist: {
      NSUserTrackingUsageDescription:
        'This identifier is used to deliver a better study experience.',
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/app_icon_1024.png',
      backgroundColor: '#1a1a1a',
    },
    edgeToEdgeEnabled: true,
    package: 'com.tusavor.app',
  },
  extra: {
    apiUrl: process.env.API_URL || 'https://api.tusavor.com/api/student',
    privacyPolicyUrl:
      process.env.PRIVACY_POLICY_URL || 'https://tusavor.com/privacy',
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '',
    },
  },
});
