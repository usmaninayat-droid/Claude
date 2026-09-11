import { describe, it, expect } from 'vitest';
import {
  ASSET_VECTOR_KEYS,
  ASSET_VECTORS,
  assetVectorUrl,
  slugifyAsset,
} from '../icons/asset-vectors';

describe('asset-vectors registry', () => {
  it('registers the vehicle types + bin + workforce', () => {
    // ~30 flat vehicle types + bin + workforce (some names overlap, e.g. Bin).
    expect(ASSET_VECTOR_KEYS.length).toBeGreaterThanOrEqual(28);
    for (const slug of ['car', 'tanker', 'bus', 'excavator', 'bin', 'default-workforce']) {
      expect(ASSET_VECTORS[slug], slug).toBeTruthy();
    }
  });

  it('exposes a map variant for every asset (used inside the marker)', () => {
    for (const key of ASSET_VECTOR_KEYS) {
      expect(typeof ASSET_VECTORS[key].map, `${key}.map`).toBe('string');
    }
  });

  it('resolves by name or slug, defaulting to the map variant', () => {
    expect(assetVectorUrl('Tanker')).toBe(ASSET_VECTORS['tanker'].map);
    expect(assetVectorUrl('tanker')).toBe(ASSET_VECTORS['tanker'].map);
    expect(assetVectorUrl('Cement Bulker', 'list')).toBe(ASSET_VECTORS['cement-bulker'].list);
  });

  it('returns undefined for an unknown asset', () => {
    expect(assetVectorUrl('not-an-asset')).toBeUndefined();
  });

  it('slugifies asset labels', () => {
    expect(slugifyAsset('Cement Bulker')).toBe('cement-bulker');
    expect(slugifyAsset('Front & Backhoe Loader')).toBe('front-and-backhoe-loader');
  });
});
