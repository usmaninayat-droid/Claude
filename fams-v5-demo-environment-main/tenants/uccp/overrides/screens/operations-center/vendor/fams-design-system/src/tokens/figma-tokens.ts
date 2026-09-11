/**
 * FAMS Design System V2 — token data extracted directly from the Figma file
 * `4FS7S3tHKzZZpdFBA0aGkt` (page "Tokens & Styles"), via the Figma MCP
 * `get_variable_defs` API on 2026-06-09. These are the canonical values; the
 * Tokens & Styles showcase page renders straight from this object.
 *
 * Figma's colour model is a NAMED-STOP taxonomy (Lightest / Light / Normal /
 * Dark / Darkest) grouped into collections — NOT a numeric 50–900 ramp.
 */

export type Stop = 'Lightest' | 'Light' | 'Normal' | 'Dark' | 'Darkest';

/** Accent families — each has 5 stops. (16 families.) */
export const ACCENT_FAMILIES: Record<string, Partial<Record<Stop, string>>> = {
  Error: { Lightest: '#fef3f2', Light: '#fee4e2', Normal: '#f04438', Dark: '#b42318', Darkest: '#7a271a' },
  Success: { Lightest: '#ecfdf3', Light: '#d1fadf', Normal: '#12b76a', Dark: '#027a48', Darkest: '#054f31' },
  Warning: { Lightest: '#fffaeb', Light: '#fef0c7', Normal: '#f79009', Dark: '#b54708', Darkest: '#7a2e0e' },
  Info: { Lightest: '#e6f2fc', Light: '#cce6f9', Normal: '#0072d6', Dark: '#00478a', Darkest: '#001c3f' },
  Cyan: { Lightest: '#ecfeff', Light: '#cffafe', Normal: '#06b6d4', Dark: '#0e7490', Darkest: '#164e63' },
  GrayBlue: { Lightest: '#f3f5fc', Light: '#e6e9f7', Normal: '#4e5ba6', Dark: '#353f73', Darkest: '#1a203a' },
  Azure: { Lightest: '#eff6ff', Light: '#dbeafe', Normal: '#3b82f6', Dark: '#1d4ed8', Darkest: '#1e3a8a' },
  Lavender: { Lightest: '#f9f5ff', Light: '#f4ebff', Normal: '#9e77ed', Dark: '#6941c6', Darkest: '#42307d' },
  Plum: { Lightest: '#fdf4ff', Light: '#fae8ff', Normal: '#d946ef', Dark: '#a21caf', Darkest: '#701a75' },
  Pink: { Lightest: '#fdf2fa', Light: '#fce7f6', Normal: '#ee46bc', Dark: '#c11574', Darkest: '#851651' },
  Rose: { Lightest: '#fff1f3', Light: '#ffe4e8', Normal: '#f63d68', Dark: '#c01048', Darkest: '#89123e' },
  Lime: { Lightest: '#f7fee7', Light: '#ecfccb', Normal: '#84cc16', Dark: '#4d7c0f', Darkest: '#365314' },
  AquaGreen: { Lightest: '#e0fcf9', Light: '#b3f5ed', Normal: '#14b8a6', Dark: '#0d776e', Darkest: '#063f39' },
  Flame: { Lightest: '#fff7f0', Light: '#ffead5', Normal: '#ff6a1a', Dark: '#b74300', Darkest: '#661f00' },
  Yellow: { Lightest: '#fff9e8', Light: '#faf3e1', Normal: '#f5bb2a', Dark: '#b78314', Darkest: '#6e4d0b' },
  Bronze: { Lightest: '#f9f5f1', Light: '#eedfcf', Normal: '#8b6439', Dark: '#5c3920', Darkest: '#2f180f' },
};

export const BASE = { White: '#ffffff', Black: '#000000' };

export const SURFACE = {
  Primary: '#ffffff',
  Minimal: '#f9fafb',
  Secondary: '#e6f2fc',
  Low_contrast: '#eaecf0',
};

export const BRAND_PRIMARY: Record<Stop, string> = {
  Lightest: '#e6f2fc', Light: '#99cdf3', Normal: '#0072d6', Dark: '#00478a', Darkest: '#001c3f',
};
export const BRAND_SECONDARY = { ...BRAND_PRIMARY };

export const BORDER: Record<Stop, string> = {
  Lightest: '#eaecf0', Light: '#d0d5dd', Normal: '#98a2b3', Dark: '#344054', Darkest: '#101828',
};

/** Neutral has 8 named stops (not the 5-stop pattern). */
export const NEUTRAL: Record<string, string> = {
  Lightest: '#f9fafb', Lighter: '#eaecf0', xLight: '#d0d5dd', Light: '#98a2b3',
  Normal: '#667085', Dark: '#475467', Darker: '#344054', Darkest: '#101828',
};

/** Default Text has 7 named stops. */
export const DEFAULT_TEXT: Record<string, string> = {
  Lightest: '#f9fafb', Lighter: '#98a2b3', Light: '#667085', Normal: '#475467',
  Dark: '#344054', Darker: '#1d2939', Darkest: '#101828',
};

export const TRANSPARENT: Record<string, string> = {
  'White/20': '#ffffff33', 'White/40': '#ffffff66', 'White/60': '#ffffff99',
  'Brand/20': '#0072d633', 'Brand/40': '#0072d666', 'Brand/60': '#0072d699',
  'Black/20': '#00000033', 'Black/40': '#00000066', 'Black/60': '#00000099',
};

/** Size collection — IconSize (px). */
export const ICON_SIZE: Record<string, number> = {
  '2xSmall': 14, xSmall: 16, Small: 20, Normal: 24, Medium: 32, Large: 40, xLarge: 48,
};

/** Typography — FontSize / LineHeight (px). Gilroy. */
export const TYPE_SCALE: { name: string; size: number; line: number; weight: number; family: string }[] = [
  { name: 'H1', size: 48, line: 56, weight: 700, family: 'Headings' },
  { name: 'H2', size: 40, line: 48, weight: 700, family: 'Headings' },
  { name: 'H3', size: 32, line: 40, weight: 600, family: 'Headings' },
  { name: 'H4', size: 28, line: 36, weight: 600, family: 'Headings' },
  { name: 'H5', size: 24, line: 32, weight: 600, family: 'Headings' },
  { name: 'H6', size: 20, line: 26, weight: 600, family: 'Headings' },
  { name: 'Body XL', size: 20, line: 26, weight: 400, family: 'Body | Subtitle' },
  { name: 'Body LG', size: 18, line: 26, weight: 400, family: 'Body | Subtitle' },
  { name: 'Body MD', size: 16, line: 24, weight: 400, family: 'Body | Subtitle' },
  { name: 'Body SM', size: 14, line: 20, weight: 400, family: 'Body | Subtitle' },
  { name: 'Body XS', size: 12, line: 18, weight: 400, family: 'Body | Subtitle' },
  { name: 'Caption', size: 10, line: 12, weight: 400, family: 'Caption' },
];

export const FONT_WEIGHTS = [
  { name: 'Regular', value: 400 },
  { name: 'Medium', value: 500 },
  { name: 'Semibold', value: 600 },
  { name: 'Bold', value: 700 },
];

/** Effect styles — Standard shadow ladder (Figma "Shadows/Standard/*"). */
export const EFFECT_STYLES: { name: string; shadow: string }[] = [
  { name: 'sm', shadow: '0px 1px 2px 0px rgba(16,24,40,0.06), 0px 1px 3px 0px rgba(16,24,40,0.10)' },
  { name: 'md', shadow: '0px 2px 4px -2px rgba(16,24,40,0.06), 0px 4px 8px -2px rgba(16,24,40,0.10)' },
  { name: 'lg', shadow: '0px 4px 6px -2px rgba(16,24,40,0.03), 0px 12px 16px -4px rgba(16,24,40,0.08)' },
  { name: 'xl', shadow: '0px 8px 8px -4px rgba(16,24,40,0.03), 0px 20px 24px -4px rgba(16,24,40,0.08)' },
  { name: '2xl', shadow: '0px 24px 48px -12px rgba(16,24,40,0.18)' },
  { name: '3xl', shadow: '0px 32px 64px -12px rgba(16,24,40,0.14)' },
];

/** Paint styles — raster libraries present in Figma (Maps + Workforce). Not raster-shipped here. */
export const PAINT_STYLE_GROUPS = [
  { group: 'Maps / 2D', regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Qatar', 'Saudi Arabia', 'Austria'] },
  { group: 'Maps / 3D (Dark)', regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Qatar', 'Saudi Arabia', 'Austria'] },
  { group: 'Maps / 3D (Light)', regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Qatar', 'Saudi Arabia', 'Austria'] },
  { group: 'Workforce / Driver', regions: ['Asian ×7', 'Austrian ×7'] },
  { group: 'Workforce / Executive', regions: ['UAE', 'KSA', 'QAT', 'AUST', 'AUST2 — ×7 each'] },
  { group: 'Workforce / Worker', regions: ['Asian ×7', 'Austrian ×7'] },
];

export const STOPS: Stop[] = ['Lightest', 'Light', 'Normal', 'Dark', 'Darkest'];
