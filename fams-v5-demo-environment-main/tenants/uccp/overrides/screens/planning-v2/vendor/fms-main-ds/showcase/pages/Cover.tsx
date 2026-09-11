import { Logo } from '../../components';

export function Cover() {
  return (
    <div className="relative flex min-h-[calc(100vh-88px)] flex-col items-center justify-center overflow-hidden">
      {/* brand gradient glow */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--fig-brand-light), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 size-[520px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--fig-accent-cyan-normal), transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center gap-6 text-center">
        <Logo brand="fams" variant="icon" height={96} />
        <div>
          <h1 className="text-h1 font-bold text-foreground">FAMS Design System</h1>
        </div>
        <p className="max-w-xl text-body-lg text-muted-foreground">
          A faithful code adaptation of the FAMS design system in Figma — tokens, styles and
          basics, organised page-by-page exactly as designed.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-caption text-muted-foreground">
          <span className="rounded-full border border-border px-3 py-1">React + TypeScript</span>
          <span className="rounded-full border border-border px-3 py-1">Tailwind 4</span>
          <span className="rounded-full border border-border px-3 py-1">CSS-variable tokens</span>
          <span className="rounded-full border border-border px-3 py-1">Gilroy</span>
        </div>
      </div>
    </div>
  );
}
