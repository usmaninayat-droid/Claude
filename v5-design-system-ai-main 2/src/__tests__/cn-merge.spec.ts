import { describe, it, expect } from 'vitest';
import { cn } from '../components/utils/cn';

/**
 * T-102 regression — tailwind-merge must KEEP the DS's custom font-size
 * utilities when a text color follows in the same cn() call. Before the
 * extendTailwindMerge fix it classified them as colors and silently dropped
 * them (`cn('text-caption', 'text-muted-foreground')` → caption gone →
 * inherited 16px). See defect-log `cn-merge-drops-custom-font-size`.
 */
describe('cn — DS font-size utilities survive color merges (T-102)', () => {
  const SIZES = [
    'text-h1', 'text-h2', 'text-h3', 'text-h4', 'text-h5', 'text-h6',
    'text-body-xl', 'text-body-lg', 'text-body-md', 'text-body-sm', 'text-body-xs',
    'text-body', 'text-label', 'text-caption',
  ];

  it('keeps every DS size class when a color class follows', () => {
    for (const size of SIZES) {
      const out = cn(size, 'text-muted-foreground');
      expect(out).toContain(size);
      expect(out).toContain('text-muted-foreground');
    }
  });

  it('still resolves genuine size-vs-size conflicts (later wins)', () => {
    expect(cn('text-caption', 'text-body-md')).toBe('text-body-md');
    expect(cn('text-h6', 'text-caption')).toBe('text-caption');
  });

  it('still resolves genuine color-vs-color conflicts (later wins)', () => {
    expect(cn('text-muted-foreground', 'text-primary')).toBe('text-primary');
  });

  it('standard Tailwind sizes keep working alongside colors', () => {
    const out = cn('text-sm', 'text-primary');
    expect(out).toContain('text-sm');
    expect(out).toContain('text-primary');
  });
});
