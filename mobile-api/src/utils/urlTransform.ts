/**
 * Transform relative image URLs to full URLs pointing to web-api
 *
 * In production: WEB_API_URL will be the public domain (e.g., https://api.5starmemo.com)
 * In development: WEB_API_URL will be http://localhost:3001
 */
export function transformImageUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  // If already a full URL, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Get web-api URL from environment
  const webApiUrl = process.env.WEB_API_URL || 'http://localhost:3001';

  // Ensure we don't create double slashes
  const cleanBaseUrl = webApiUrl.endsWith('/') ? webApiUrl.slice(0, -1) : webApiUrl;
  const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;

  return `${cleanBaseUrl}${cleanPath}`;
}
