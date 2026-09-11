/**
 * SectorDetectOverlay — the "AI is detecting your sector…" → "Sector identified
 * successfully." animation shown over the Report-Incident map while the app
 * verifies the inspector's location. The timeline, sparkle layout and colours
 * are data-driven from `src/data/sector-detect.json`.
 *
 * `willSucceed` decides the branch: true → play detecting then success then
 * onComplete(true); false → play detecting then onComplete(false) so the caller
 * can raise the invalid-location popup.
 */
import * as React from 'react';
import cfg from '@/data/sector-detect.json';

const SPARKLE_PATH =
  'M12 2 C12.6 8 16 11.4 22 12 C16 12.6 12.6 16 12 22 C11.4 16 8 12.6 2 12 C8 11.4 11.4 8 12 2 Z';

export function SectorDetectOverlay({
  willSucceed,
  onComplete,
}: {
  willSucceed: boolean;
  onComplete: (ok: boolean) => void;
}) {
  const [phase, setPhase] = React.useState<'detecting' | 'success'>('detecting');
  const done = React.useRef(onComplete);
  done.current = onComplete;

  // detecting → (success | invalid)
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if (willSucceed) setPhase('success');
      else done.current(false);
    }, cfg.phases[0].durationMs);
    return () => window.clearTimeout(t);
  }, [willSucceed]);

  // success → complete
  React.useEffect(() => {
    if (phase !== 'success') return;
    const t = window.setTimeout(() => done.current(true), cfg.phases[1].durationMs);
    return () => window.clearTimeout(t);
  }, [phase]);

  const msg = phase === 'detecting' ? cfg.phases[0].message : cfg.phases[1].message;

  return (
    <div
      className="iims-overlay-in absolute inset-0 z-[600] flex flex-col items-center justify-center gap-5"
      style={{ background: cfg.overlay }}
      role="status"
      aria-live="polite"
    >
      {phase === 'detecting' ? (
        <div className="relative h-36 w-44">
          {cfg.sparkles.map((sp, i) => (
            <svg
              key={i}
              className="iims-sparkle absolute drop-shadow"
              style={{ left: sp.left, top: sp.top, width: sp.size, height: sp.size, animationDelay: `${sp.delay}ms` }}
              viewBox="0 0 24 24"
              fill={cfg.colors.sparkle}
              aria-hidden
            >
              <path d={SPARKLE_PATH} />
            </svg>
          ))}
        </div>
      ) : (
        <span
          className="iims-check-pop grid h-24 w-24 place-items-center rounded-full"
          style={{ border: `4px solid ${cfg.colors.check}` }}
        >
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke={cfg.colors.check} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className="iims-check-draw" d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      )}
      <p className="text-[16px] font-semibold" style={{ color: cfg.colors.text }}>{msg}</p>
    </div>
  );
}
