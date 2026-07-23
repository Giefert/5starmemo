import { describe, expect, it } from 'vitest';
import {
  compareSeasonalItems,
  formatSeasonality,
  isMonthInSeason,
  RestaurantCurationItem,
} from '../../../shared/types';

function seasonalItem(
  name: string,
  seasonStartMonth?: number,
  seasonEndMonth?: number,
): RestaurantCurationItem {
  return {
    targetType: 'card',
    targetId: name,
    name,
    seasonStartMonth,
    seasonEndMonth,
  };
}

describe('Fish card seasonality', () => {
  it('includes both endpoints of a same-year range', () => {
    expect(isMonthInSeason(3, 7, 3)).toBe(true);
    expect(isMonthInSeason(3, 7, 7)).toBe(true);
    expect(isMonthInSeason(3, 7, 8)).toBe(false);
  });

  it('supports ranges that wrap across New Year', () => {
    expect(isMonthInSeason(11, 3, 12)).toBe(true);
    expect(isMonthInSeason(11, 3, 2)).toBe(true);
    expect(isMonthInSeason(11, 3, 6)).toBe(false);
  });

  it('requires a complete valid range', () => {
    expect(isMonthInSeason(3, undefined, 4)).toBe(false);
    expect(isMonthInSeason(0, 4, 2)).toBe(false);
    expect(formatSeasonality(11, 3)).toBe('November–March');
  });

  describe('Bulletin ordering', () => {
    it('puts active seasons first, ending soonest first', () => {
      const items = [
        seasonalItem('Ends in September', 4, 9),
        seasonalItem('Starts next month', 8, 10),
        seasonalItem('Ends in August', 6, 8),
        seasonalItem('Ends this month', 5, 7),
      ];

      expect(items.sort((a, b) => compareSeasonalItems(a, b, 7)).map((item) => item.name))
        .toEqual([
          'Ends this month',
          'Ends in August',
          'Ends in September',
          'Starts next month',
        ]);
    });

    it('orders upcoming seasons by their next start month', () => {
      const items = [
        seasonalItem('November item', 11, 12),
        seasonalItem('August item', 8, 9),
        seasonalItem('January item', 1, 2),
      ];

      expect(items.sort((a, b) => compareSeasonalItems(a, b, 7)).map((item) => item.name))
        .toEqual(['August item', 'November item', 'January item']);
    });

    it('handles seasons that wrap across New Year', () => {
      const items = [
        seasonalItem('Starts in April', 4, 6),
        seasonalItem('Ends in March', 11, 3),
        seasonalItem('Ends in February', 12, 2),
      ];

      expect(items.sort((a, b) => compareSeasonalItems(a, b, 1)).map((item) => item.name))
        .toEqual(['Ends in February', 'Ends in March', 'Starts in April']);
    });

    it('uses item name as a stable tie-breaker and puts invalid ranges last', () => {
      const items = [
        seasonalItem('Zucchini', 8, 10),
        seasonalItem('No season'),
        seasonalItem('Apple', 8, 12),
      ];

      expect(items.sort((a, b) => compareSeasonalItems(a, b, 7)).map((item) => item.name))
        .toEqual(['Apple', 'Zucchini', 'No season']);
    });
  });
});
