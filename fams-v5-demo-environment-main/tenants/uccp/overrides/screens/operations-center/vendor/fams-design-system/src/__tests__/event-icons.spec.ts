import { describe, it, expect } from 'vitest';
import {
  EVENT_ICON_KEYS,
  EVENT_ICONS,
  eventIconUrl,
  slugifyEvent,
} from '../icons/event-icons';

describe('event-icons registry', () => {
  it('registers all 65 events (29 DMS + 29 General + 5 Green Driving + 2 Waste)', () => {
    expect(EVENT_ICON_KEYS.length).toBe(65);
  });

  it('every event has both used variants (line + map)', () => {
    for (const key of EVENT_ICON_KEYS) {
      const entry = EVENT_ICONS[key];
      expect(typeof entry.line, `${key}.line`).toBe('string');
      expect(typeof entry.map, `${key}.map`).toBe('string');
    }
  });

  it('does not bundle the unused Filled variant', () => {
    for (const key of EVENT_ICON_KEYS) {
      expect((EVENT_ICONS[key] as unknown as Record<string, unknown>).filled).toBeUndefined();
    }
  });

  it('resolves by name or slug, defaulting to the line variant', () => {
    const byName = eventIconUrl('Overspeed');
    const bySlug = eventIconUrl('overspeed');
    expect(byName).toBeTruthy();
    expect(byName).toBe(bySlug);
    expect(byName).toBe(EVENT_ICONS['overspeed'].line);
  });

  it('resolves the map variant when asked', () => {
    expect(eventIconUrl('Overspeed', 'map')).toBe(EVENT_ICONS['overspeed'].map);
  });

  it('returns undefined for an unknown event', () => {
    expect(eventIconUrl('not-a-real-event')).toBeUndefined();
  });

  it('slugifies Figma labels (spaces, &, ampersand words)', () => {
    expect(slugifyEvent('ADAS Speed Down')).toBe('adas-speed-down');
    expect(slugifyEvent('Bin & Categories')).toBe('bin-and-categories');
  });
});
