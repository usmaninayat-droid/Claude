/**
 * poiPinDataUri — the canonical POI map pin (Flood Management, Figma
 * cWjEbSNpZCC7tNhZc2CikU · 233-181658), reproduced verbatim as a recolorable
 * data-URI SVG: a rounded-square speech-bubble head (white 2.5 stroke + soft
 * drop shadow) with a white location glyph inside, floating above a small
 * anchor dot (white-ringed circle) that marks the exact coordinate.
 *
 * The single `color` parameter fills both the bubble and the anchor dot —
 * everything else (white stroke/glyph, shadows) is fixed by the design.
 * Colors are hex by necessity (SVG data-URIs can't resolve CSS var()); the
 * DEFAULT palette mirrors DS tokens — see each swatch's annotation.
 */

/** Natural canvas 47.5 × 68.4; anchor dot center at (22.74, 54.51). */
export const POI_PIN_SIZE: [number, number] = [47.5, 68.4];
/** Fraction of width/height where the anchor dot sits (use for iconAnchor). */
export const POI_PIN_ANCHOR_FRACTION: [number, number] = [22.74 / 47.5, 54.51 / 68.4];

const cache = new Map<string, string>();

export function poiPinDataUri(color: string): string {
  const hit = cache.get(color);
  if (hit) return hit;
  const svg =
    `<svg width="47.4779" height="68.4088" viewBox="0 0 47.4779 68.4088" fill="none" xmlns="http://www.w3.org/2000/svg">` +
    `<g filter="url(#pinShadow)">` +
    `<path d="M28.9893 4.25C30.3337 4.25 31.6651 4.51485 32.9072 5.0293C34.1494 5.54382 35.2788 6.2983 36.2295 7.24902C37.18 8.19965 37.9338 9.32832 38.4482 10.5703C38.9628 11.8125 39.2275 13.1438 39.2275 14.4883V29.6982C39.2275 31.0427 38.9627 32.3741 38.4482 33.6162C37.9337 34.8584 37.1802 35.9878 36.2295 36.9385C35.2788 37.8892 34.1494 38.6427 32.9072 39.1572C31.6651 39.6717 30.3337 39.9365 28.9893 39.9365H28.2939C28.2122 39.9365 27.803 40.0238 27.0898 40.9941C26.4235 41.9008 25.691 43.3122 24.9014 45.249C24.7126 45.7815 24.3622 46.2425 23.8945 46.5625L23.8486 46.5938L23.8008 46.6201C23.545 46.7638 23.2573 46.8419 22.9639 46.8457H22.9375L22.9102 46.8447C22.6642 46.8374 22.4222 46.7798 22.1992 46.6758C21.9854 46.576 21.7936 46.4352 21.6338 46.2617C21.6302 46.2578 21.6266 46.2539 21.623 46.25C21.62 46.2466 21.6163 46.2437 21.6133 46.2402V46.2393C21.4123 46.0188 21.2538 45.7634 21.1455 45.4854V45.4863C20.3388 43.4718 19.5865 42.0003 18.9014 41.0537C18.1672 40.0393 17.7429 39.9447 17.6592 39.9443H16.4883C13.773 39.9443 11.1691 38.8653 9.24902 36.9453C7.32902 35.0253 6.25008 32.4213 6.25 29.7061V14.4883C6.25003 11.7729 7.32898 9.16907 9.24902 7.24902C11.1691 5.32898 13.7729 4.25003 16.4883 4.25H28.9893Z" fill="${color}" stroke="white" stroke-width="2.5"/>` +
    `<path d="M22.7397 12.373C18.398 12.373 14.8647 15.9308 14.8647 20.3049C14.8647 26.52 21.9995 32.9373 22.3031 33.2068C22.4282 33.3179 22.584 33.373 22.7397 33.373C22.8955 33.373 23.0512 33.3179 23.1764 33.2077C23.48 32.9373 30.6147 26.52 30.6147 20.3049C30.6147 15.9308 27.0815 12.373 22.7397 12.373ZM22.7397 24.623C20.3274 24.623 18.3647 22.6604 18.3647 20.248C18.3647 17.8357 20.3274 15.873 22.7397 15.873C25.1521 15.873 27.1147 17.8357 27.1147 20.248C27.1147 22.6604 25.1521 24.623 22.7397 24.623Z" fill="white"/>` +
    `</g>` +
    `<g filter="url(#dotShadow)">` +
    `<circle cx="22.7386" cy="54.5062" r="2.90265" fill="${color}"/>` +
    `<circle cx="22.7386" cy="54.5062" r="3.90265" stroke="white" stroke-width="2"/>` +
    `</g>` +
    `<defs>` +
    `<filter id="pinShadow" x="0" y="0" width="47.4779" height="57.096" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="b"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="h"/><feOffset dx="1" dy="3"/><feGaussianBlur stdDeviation="3"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.243 0"/><feBlend mode="normal" in2="b" result="s1"/><feBlend mode="normal" in="SourceGraphic" in2="s1" result="shape"/></filter>` +
    `<filter id="dotShadow" x="12.8359" y="46.6035" width="21.8053" height="21.8053" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="b"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="h"/><feOffset dx="1" dy="3"/><feGaussianBlur stdDeviation="3"/><feComposite in2="h" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.24 0"/><feBlend mode="normal" in2="b" result="s1"/><feBlend mode="normal" in="SourceGraphic" in2="s1" result="shape"/></filter>` +
    `</defs>` +
    `</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(color, uri);
  return uri;
}

/** Default selectable pin colors (Figma 233-181655 pin variants).
 *  Hex mirrors DS tokens — annotated per swatch. */
export const POI_PIN_COLORS: { id: string; label: string; color: string }[] = [
  { id: 'teal', label: 'Teal', color: '#2BB3AA' },    // coherence-allow — Figma POI teal (≈ --chart-accent-teal)
  { id: 'maroon', label: 'Maroon', color: '#6E112D' }, // coherence-allow — == --primary (C&C maroon)
  { id: 'blue', label: 'Blue', color: '#0072D6' },     // coherence-allow — == --status-info
  { id: 'orange', label: 'Orange', color: '#F79009' }, // coherence-allow — == --status-warning
  { id: 'red', label: 'Red', color: '#F04438' },       // coherence-allow — == --status-error
  { id: 'navy', label: 'Navy', color: '#1D2939' },     // coherence-allow — == --gray-800
];
