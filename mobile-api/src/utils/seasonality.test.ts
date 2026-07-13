import { describe, expect, it } from 'vitest';
import { formatSeasonality, isMonthInSeason } from '../../../shared/types';

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
});
