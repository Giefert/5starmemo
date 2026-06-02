import * as SecureStore from 'expo-secure-store';

// Favorites are a personal, client-side pinning of decks to the top of the
// Study tab — they never touch the backend. Stored as a JSON array of deck ids,
// keyed per restaurant so switching restaurants doesn't surface stale picks.
const key = (restaurantId: string) => `favoriteDecks.${restaurantId}`;

export async function loadFavorites(restaurantId: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(key(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(restaurantId: string, ids: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(restaurantId), JSON.stringify(ids));
  } catch (error) {
    console.warn('Failed to save favorites:', error);
  }
}
