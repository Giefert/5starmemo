import { Platform } from 'react-native';

/**
 * Adjust image URLs for platform-specific requirements in development.
 *
 * In production, URLs will be public (e.g., https://api.5starmemo.com/uploads/...)
 * and work across all platforms without adjustment.
 *
 * In development, Android emulator needs special handling for localhost URLs.
 */
export function adjustUrlForPlatform(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  // Only adjust in development mode
  if (__DEV__) {
    // Android emulator can't reach localhost - use special IP 10.0.2.2
    if (Platform.OS === 'android' && url.includes('localhost')) {
      return url.replace('localhost', '10.0.2.2');
    }
  }

  // iOS simulator, web, and production URLs work as-is
  return url;
}
