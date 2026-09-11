/**
 * Shared presentation helpers used across every INS screen — token-only styling,
 * DS components underneath. Keeps the screens consistent and small.
 */
import * as React from 'react';
import { StatePill } from '@ds/components/data-display';
import * as Icons from '@ds/icons';
import type { EvidencePhoto, IncidentStatus, InspectionStatus, InspectionResult, Severity } from '../data/types';
import { INCIDENT_STATUS, INSPECTION_STATUS, INSPECTION_RESULT, SEVERITY } from '../data/status';

/* ------------------------------ formatters ------------------------------ */
export const formatAed = (n: number) => `AED ${n.toLocaleString('en-AE')}`;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

/** Relative SLA label vs an anchored "now"; negative → overdue. */
export function slaLabel(slaDueAtIso: string, nowMs: number): { text: string; overdue: boolean } {
  const diffMs = new Date(slaDueAtIso).getTime() - nowMs;
  const overdue = diffMs < 0;
  const h = Math.round(Math.abs(diffMs) / 3600_000);
  const text = h >= 24 ? `${Math.round(h / 24)}d` : `${h}h`;
  return { text: overdue ? `${text} overdue` : `in ${text}`, overdue };
}

/* ------------------------------- pills ---------------------------------- */
export function IncidentStatusPill({ status, size = 'md' }: { status: IncidentStatus; size?: 'sm' | 'md' }) {
  const m = INCIDENT_STATUS[status];
  return <StatePill label={m.label} bg={m.color} size={size} />;
}
export function InspectionStatusPill({ status, size = 'md' }: { status: InspectionStatus; size?: 'sm' | 'md' }) {
  const m = INSPECTION_STATUS[status];
  return <StatePill label={m.label} bg={m.color} size={size} />;
}
export function InspectionResultPill({ result, size = 'md' }: { result: InspectionResult; size?: 'sm' | 'md' }) {
  const m = INSPECTION_RESULT[result];
  return <StatePill label={m.label} bg={m.color} size={size} />;
}
export function SeverityPill({ severity, size = 'sm' }: { severity: Severity; size?: 'sm' | 'md' }) {
  const m = SEVERITY[severity];
  return <StatePill label={m.label} bg={m.color} size={size} />;
}

/* --------------------------- avatar chip -------------------------------- */
/** Small deterministic string hash → stable 32-bit unsigned int. */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Rotate/lighten a hex colour by a hue offset — cheap, deterministic. */
function shiftHex(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 0xff) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt * 0.6);
  const b = clamp((n & 0xff) + amt * 1.2);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Polished deterministic avatar — a soft two-stop diagonal gradient derived from
 * the person's own `color`, a subtle geometric accent, and a clean monogram.
 * Fully self-contained (inline SVG/CSS, no network). Same props as before.
 */
export function AvatarChip({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const h = hashString(name || color);
  const light = shiftHex(color, 46);
  const dark = shiftHex(color, -40);
  const gradId = `av-g-${h.toString(36)}`;
  // deterministic accent blob position/size from the hash
  const cx = 20 + (h % 60);
  const cy = 18 + ((h >> 5) % 40);
  const rr = 30 + ((h >> 9) % 22);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
      title={name}
      aria-label={name}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gradId})`} />
        <circle cx={cx} cy={cy} r={rr} fill="#ffffff" opacity="0.14" />
        <circle cx={100 - cx * 0.6} cy={100 - cy * 0.5} r={rr * 0.55} fill="#000000" opacity="0.08" />
      </svg>
      <span
        className="relative z-[1] font-semibold text-white"
        style={{ fontSize: size * 0.4, letterSpacing: '0.02em', textShadow: '0 1px 1px rgba(0,0,0,0.18)' }}
      >
        {initials(name)}
      </span>
    </span>
  );
}

/* --------------------------- evidence tile ------------------------------ */
/**
 * Evidence "scenes" — a fully self-contained, deterministic illustration engine
 * that renders a photo-like site image (realistic sky + Doha skyline + ground
 * + a recognizable illustrated subject) instead of a flat icon-on-colour block.
 * The subject is chosen from caption/kind keywords; sky & ground vary by seed so
 * two tiles rarely look identical. When `photo.dataUrl` is set (real camera /
 * gallery capture) that image is shown instead.
 */
type SubjectKey =
  | 'bin' | 'overflow' | 'sweep' | 'sand' | 'fleet' | 'ehs'
  | 'container' | 'spill' | 'tool' | 'site';

const SUBJECT_COLOR: Record<SubjectKey, { body: string; dark: string; light: string }> = {
  bin:      { body: '#2E6FB0', dark: '#1E4E7E', light: '#5B97CE' },
  overflow: { body: '#3F7C3A', dark: '#2A5427', light: '#63A85C' },
  sweep:    { body: '#C88A1E', dark: '#8A5F12', light: '#E4B457' },
  sand:     { body: '#CBAE79', dark: '#A98A52', light: '#E4CE9F' },
  fleet:    { body: '#0E9F6E', dark: '#0A6E4C', light: '#3FC493' },
  ehs:      { body: '#DC5B26', dark: '#A63E16', light: '#F0894F' },
  container:{ body: '#6D4FC4', dark: '#4C3591', light: '#9179DA' },
  spill:    { body: '#0E7490', dark: '#0A5568', light: '#3AA0BA' },
  tool:     { body: '#546272', dark: '#3A4552', light: '#7C8B9B' },
  site:     { body: '#2563EB', dark: '#1B49B0', light: '#5B8CF5' },
};

/** Sky palettes (top → horizon) — a few Doha times of day, picked by seed. */
const SKIES = [
  { a: '#8FCBEC', b: '#DDF0FA' }, // clear day
  { a: '#E7CE9C', b: '#F7ECD6' }, // sandy haze
  { a: '#7E8FC0', b: '#E6BE95' }, // late afternoon
  { a: '#AEC2CF', b: '#E2EAEF' }, // overcast
];
/** Ground palettes (near → far), picked by seed. */
const GROUNDS = [
  { near: '#5B6470', far: '#79828E', line: '#41474F' }, // asphalt
  { near: '#B79A66', far: '#CDB489', line: '#977C4E' }, // sand/dust
  { near: '#8C929A', far: '#A6ACB3', line: '#6E747B' }, // pavement
];

function subjectFor(photo: EvidencePhoto): SubjectKey {
  const c = photo.caption.toLowerCase();
  if (/(leak|leachate|spill|drain|fluid|wash|odour|odor|puddle)/.test(c)) return 'spill';
  if (/(overflow|full|uncollected|bulky|bags|dumping|dump)/.test(c)) return 'overflow';
  if (/(sand)/.test(c)) return 'sand';
  if (/(sweep|swept|sweeping|debris|kerb|footpath|litter|street|road|pavement)/.test(c)) return 'sweep';
  if (/(vehicle|truck|sweeper|compactor|fleet|gps)/.test(c)) return 'fleet';
  if (/(ppe|hazard|biohazard|chemical|unsafe|safety|signage|cordon)/.test(c)) return 'ehs';
  if (/(container|skip|40yd|40 yd)/.test(c)) return 'container';
  if (/(bin)/.test(c)) return 'bin';
  if (/(equip|manpower|resource|tool)/.test(c)) return 'tool';
  if (/(before|after|verif|re-insp|inspection|verified)/.test(c)) return 'site';
  const keys = Object.keys(SUBJECT_COLOR) as SubjectKey[];
  return keys[photo.seed % keys.length];
}

/** Illustrated foreground per subject (drawn on a ground horizon at y≈46). */
function SubjectArt({ k, seed }: { k: SubjectKey; seed: number }) {
  const c = SUBJECT_COLOR[k];
  const dx = (seed % 7) - 3; // slight horizontal jitter so tiles differ
  switch (k) {
    case 'bin':
      return (
        <g transform={`translate(${dx} 0)`}>
          <ellipse cx="50" cy="66" rx="16" ry="2.6" fill="#000" opacity="0.18" />
          <rect x="42" y="41" width="17" height="24" rx="2.4" fill={c.body} />
          <rect x="42" y="41" width="5" height="24" rx="2.4" fill={c.light} opacity="0.55" />
          <rect x="40" y="37" width="21" height="5" rx="2.2" fill={c.dark} />
          <rect x="48.5" y="34.6" width="4" height="3.2" rx="1" fill={c.dark} />
          <circle cx="45.5" cy="65.5" r="2.3" fill="#2b3138" />
          <circle cx="55.5" cy="65.5" r="2.3" fill="#2b3138" />
        </g>
      );
    case 'overflow':
      return (
        <g transform={`translate(${dx} 0)`}>
          <ellipse cx="50" cy="66" rx="19" ry="2.8" fill="#000" opacity="0.18" />
          <rect x="42" y="44" width="17" height="21" rx="2.4" fill={c.body} />
          <rect x="42" y="44" width="5" height="21" rx="2.4" fill={c.light} opacity="0.5" />
          {/* overflowing bags */}
          <ellipse cx="47" cy="41" rx="6" ry="5" fill={c.dark} />
          <ellipse cx="54" cy="40" rx="6.5" ry="5.5" fill={c.dark} />
          <ellipse cx="50" cy="38" rx="6" ry="5" fill={c.body} />
          <ellipse cx="63" cy="62" rx="5" ry="3.2" fill={c.dark} />
          <ellipse cx="37" cy="63" rx="4.4" ry="3" fill={c.body} />
          <circle cx="45.5" cy="65.5" r="2.2" fill="#2b3138" />
          <circle cx="55.5" cy="65.5" r="2.2" fill="#2b3138" />
        </g>
      );
    case 'fleet':
      return (
        <g transform={`translate(${dx} 0)`}>
          <ellipse cx="50" cy="66" rx="26" ry="3" fill="#000" opacity="0.18" />
          {/* body */}
          <rect x="34" y="44" width="26" height="15" rx="2" fill={c.body} />
          {/* cab */}
          <rect x="60" y="47" width="10" height="12" rx="1.6" fill={c.dark} />
          <rect x="61.5" y="49" width="6" height="4.5" rx="1" fill="#cfe8ff" opacity="0.9" />
          {/* hopper hatch */}
          <rect x="36" y="46" width="9" height="7" rx="1" fill={c.light} opacity="0.6" />
          <circle cx="42" cy="61" r="3.4" fill="#22282e" /><circle cx="42" cy="61" r="1.4" fill="#4b545e" />
          <circle cx="64" cy="61" r="3.4" fill="#22282e" /><circle cx="64" cy="61" r="1.4" fill="#4b545e" />
        </g>
      );
    case 'sweep':
      return (
        <g transform={`translate(${dx} 0)`}>
          {/* scattered litter on the road */}
          <rect x="30" y="60" width="4" height="2.2" rx="1" fill="#c9c0ac" transform="rotate(-18 32 61)" />
          <rect x="62" y="63" width="5" height="2.4" rx="1" fill="#d8cdb2" transform="rotate(12 64 64)" />
          <circle cx="44" cy="64" r="1.5" fill="#b7ad95" />
          <circle cx="70" cy="59" r="1.3" fill="#b7ad95" />
          {/* broom */}
          <rect x="48" y="34" width="2.2" height="24" rx="1" fill="#8a5a33" transform="rotate(18 49 46)" />
          <path d="M52 56 l8 3 l-2 6 l-9 -3 z" fill={c.body} />
          <path d="M52 56 l8 3 l-0.6 2 l-8.2 -3 z" fill={c.dark} />
        </g>
      );
    case 'sand':
      return (
        <g transform={`translate(${dx} 0)`}>
          {/* kerb */}
          <rect x="20" y="58" width="60" height="3" fill="#9aa0a6" opacity="0.7" />
          {/* sand drift */}
          <path d="M22 60 Q40 44 58 56 Q70 62 78 60 L78 66 L22 66 Z" fill={c.body} />
          <path d="M22 60 Q40 44 58 56 Q70 62 78 60" fill="none" stroke={c.light} strokeWidth="1.2" opacity="0.7" />
          <path d="M30 62 Q45 54 60 60" fill="none" stroke={c.dark} strokeWidth="0.9" opacity="0.5" />
        </g>
      );
    case 'ehs':
      return (
        <g transform={`translate(${dx} 0)`}>
          <ellipse cx="50" cy="66" rx="22" ry="2.8" fill="#000" opacity="0.16" />
          {/* warning sign on a post */}
          <rect x="41" y="46" width="1.8" height="18" fill="#6b7280" />
          <path d="M42 34 l7 12 l-14 0 z" fill={c.body} stroke="#fff" strokeWidth="1" />
          <rect x="41.2" y="40" width="1.6" height="4" fill="#fff" /><rect x="41.2" y="45" width="1.6" height="1.6" fill="#fff" />
          {/* traffic cones */}
          <path d="M58 64 l3.5 -12 l3.5 12 z" fill={c.body} /><rect x="59.6" y="56" width="4" height="1.8" fill="#fff" />
          <path d="M66 65 l3 -9 l3 9 z" fill={c.light} /><rect x="67.4" y="59" width="3.2" height="1.4" fill="#fff" />
        </g>
      );
    case 'container':
      return (
        <g transform={`translate(${dx} 0)`}>
          <ellipse cx="50" cy="66" rx="24" ry="3" fill="#000" opacity="0.18" />
          {/* open-top skip (trapezoid) */}
          <path d="M32 47 L68 47 L64 63 L36 63 Z" fill={c.body} />
          <path d="M32 47 L68 47 L66.5 51 L33.5 51 Z" fill={c.light} opacity="0.7" />
          <path d="M40 47 L38.5 63 M50 47 L50 63 M60 47 L61.5 63" stroke={c.dark} strokeWidth="0.9" />
          <rect x="31" y="63" width="5" height="3" fill={c.dark} /><rect x="64" y="63" width="5" height="3" fill={c.dark} />
        </g>
      );
    case 'spill':
      return (
        <g transform={`translate(${dx} 0)`}>
          {/* drain grate */}
          <rect x="28" y="55" width="12" height="8" rx="1" fill="#4b535c" />
          <path d="M30 56 v6 M33 56 v6 M36 56 v6 M39 56 v6" stroke="#2b3138" strokeWidth="0.8" />
          {/* dark leachate puddle with sheen */}
          <path d="M42 62 Q46 54 56 55 Q68 56 70 61 Q71 66 60 67 Q46 68 42 64 Z" fill={c.dark} />
          <path d="M48 60 Q54 57 60 59" fill="none" stroke={c.light} strokeWidth="1.1" opacity="0.75" />
          <ellipse cx="63" cy="63" rx="3" ry="1.2" fill={c.light} opacity="0.4" />
        </g>
      );
    case 'tool':
      return (
        <g transform={`translate(${dx} 0)`}>
          <ellipse cx="50" cy="66" rx="20" ry="2.6" fill="#000" opacity="0.16" />
          {/* shovel */}
          <rect x="43" y="38" width="2" height="22" rx="1" fill="#8a5a33" transform="rotate(-14 44 49)" />
          <path d="M36 58 q-3 6 3 7 q6 -1 3 -7 z" fill={c.body} transform="rotate(-14 39 61)" />
          {/* toolbox */}
          <rect x="52" y="54" width="16" height="10" rx="1.4" fill={c.body} />
          <rect x="52" y="54" width="16" height="3" rx="1.4" fill={c.dark} />
          <rect x="58" y="51" width="4" height="3" rx="1" fill={c.dark} />
        </g>
      );
    case 'site':
    default:
      return (
        <g transform={`translate(${dx} 0)`}>
          <ellipse cx="50" cy="64" rx="6" ry="1.8" fill="#000" opacity="0.2" />
          {/* map pin */}
          <path d="M50 34 c-6 0 -10 4.4 -10 10 c0 7 10 19 10 19 c0 0 10 -12 10 -19 c0 -5.6 -4 -10 -10 -10 Z" fill={c.body} />
          <circle cx="50" cy="44" r="3.6" fill="#fff" />
          {/* clipboard */}
          <rect x="60" y="50" width="12" height="14" rx="1.4" fill="#eef2f6" />
          <rect x="63.6" y="48.6" width="4.8" height="3" rx="1" fill={c.dark} />
          <rect x="62" y="54" width="8" height="1.4" fill="#9aa4af" /><rect x="62" y="57.5" width="8" height="1.4" fill="#9aa4af" />
        </g>
      );
  }
}

/** Distant Doha skyline silhouette across the horizon. */
function Skyline({ color, gid }: { color: string; gid: string }) {
  return (
    <g fill={color} opacity="0.55">
      <rect x="4" y="34" width="6" height="12" />
      <rect x="11" y="28" width="5" height="18" />
      <rect x="17" y="38" width="7" height="8" />
      {/* spire (Burj-like) */}
      <path d="M27 46 L29.4 16 L31.8 46 Z" />
      <rect x="33" y="30" width="6" height="16" />
      <rect x="40" y="36" width="5" height="10" />
      <rect x="70" y="32" width="6" height="14" />
      <rect x="77" y="26" width="7" height="20" />
      <path d="M86 46 L88 22 L90 46 Z" />
      <rect x="92" y="34" width="6" height="12" />
      <rect id={`${gid}-sk`} x="47" y="40" width="5" height="6" />
    </g>
  );
}

/**
 * Deterministic generated thumbnail for a captured photo (no real images in the
 * demo). Renders an illustrated, photo-like site scene with a GPS/timestamp
 * footer, fully self-contained. When `photo.dataUrl` is set (real camera/gallery
 * capture) that image is shown instead.
 */
export function EvidenceTile({
  photo, onClick, className = '', showMeta = true,
}: { photo: EvidencePhoto; onClick?: () => void; className?: string; showMeta?: boolean }) {
  const k = subjectFor(photo);
  const gid = `ev-${photo.id.replace(/[^a-z0-9]/gi, '')}`;
  const sky = SKIES[photo.seed % SKIES.length];
  const ground = GROUNDS[(photo.seed >> 2) % GROUNDS.length];
  const sunX = 16 + (photo.seed % 66);
  const HORIZON = 46;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block overflow-hidden rounded-lg border border-border text-left ${className}`}
      style={{ aspectRatio: '4 / 3' }}
    >
      {photo.dataUrl ? (
        <img src={photo.dataUrl} alt={photo.caption} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sky.a} />
              <stop offset="100%" stopColor={sky.b} />
            </linearGradient>
            <linearGradient id={`${gid}-grd`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ground.far} />
              <stop offset="100%" stopColor={ground.near} />
            </linearGradient>
            <radialGradient id={`${gid}-sun`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* sky + sun */}
          <rect x="0" y="0" width="100" height={HORIZON} fill={`url(#${gid}-sky)`} />
          <circle cx={sunX} cy={HORIZON * 0.42} r="20" fill={`url(#${gid}-sun)`} />
          {/* skyline sits on the horizon */}
          <Skyline color={ground.line} gid={gid} />
          {/* ground */}
          <rect x="0" y={HORIZON} width="100" height={75 - HORIZON} fill={`url(#${gid}-grd)`} />
          <rect x="0" y={HORIZON} width="100" height="0.8" fill="#fff" opacity="0.25" />
          {/* perspective road/kerb streaks */}
          <path d="M0 62 L100 58" stroke={ground.line} strokeWidth="0.7" opacity="0.5" />
          <path d="M0 70 L100 64" stroke={ground.line} strokeWidth="0.7" opacity="0.35" />
          {/* subject */}
          <SubjectArt k={k} seed={photo.seed} />
        </svg>
      )}
      {photo.kind !== 'incident' && (
        <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
          {photo.kind}
        </span>
      )}
      {showMeta && (
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/65 to-transparent px-1.5 pb-1 pt-3 text-[9px] leading-tight text-white">
          <span className="truncate">{photo.caption}</span>
          <span className="opacity-80">
            {photo.gps.lat.toFixed(4)}, {photo.gps.lng.toFixed(4)} · {new Date(photo.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
      )}
    </button>
  );
}
