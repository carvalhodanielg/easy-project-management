import { describe, it, expect } from 'vitest';
import { epicColor, EPIC_PALETTE } from './epicColor';

describe('epicColor', () => {
  it('is deterministic — the same key always yields the same colour', () => {
    expect(epicColor('Auth')).toBe(epicColor('Auth'));
  });

  it('always returns a colour from the palette', () => {
    for (const key of ['Auth', 'Onboarding', 'Billing', '', 'x', 'a very long epic name here']) {
      expect(EPIC_PALETTE).toContain(epicColor(key));
    }
  });

  it('spreads different keys across the palette', () => {
    const colours = new Set(
      ['Auth', 'Onboarding', 'Billing', 'Search', 'Reports', 'Mobile', 'Infra'].map(epicColor),
    );
    expect(colours.size).toBeGreaterThan(1);
  });
});
