import type { LucideIcon } from 'lucide-react';
import { Building2, ChevronRight, Clock, LogOut, Mail, Phone, ShieldCheck } from 'lucide-react';

/**
 * ProfileModule — mobile-only Profile tab, rebuilt on the OLD flood-demo
 * shell's profile page (InspectorMobileShell's `profile` tab):
 *  · centered avatar circle with a 2px ring and an "On duty" pill straddling
 *    its bottom edge;
 *  · 22px bold name over a 14px muted role line;
 *  · 13px muted uppercase-ish section labels with `pt-7 pb-2` rhythm;
 *  · rounded-xl (12px) `var(--muted)` rows, 14px side / 12px vertical
 *    padding, a 36px rounded-lg tinted icon tile, a caption over a 16px bold
 *    value, and a trailing chevron on actionable rows;
 *  · a centered footer block.
 * Only the data is ours (Qatar MME inspector identity).
 */

const NAME = 'Ahmed Khalid';
const ROLE = 'Field Inspector · Doha Municipality';
const INITIALS = 'AK';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '28px 0 8px', fontSize: 13, color: 'var(--muted-foreground)' }}>{children}</div>;
}

function Row({
  icon: Icon,
  label,
  value,
  chevron,
  onClick,
  tone = 'var(--primary)',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  chevron?: boolean;
  onClick?: () => void;
  tone?: string;
}) {
  const inner = (
    <>
      <span
        style={{
          display: 'flex',
          width: 36,
          height: 36,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--ins-radius-sm)',
          background: `color-mix(in srgb, ${tone} 14%, transparent)`,
        }}
      >
        <Icon size={18} style={{ color: tone }} />
      </span>
      <span style={{ display: 'block', minWidth: 0, flex: 1, textAlign: 'start' }}>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted-foreground)' }}>{label}</span>
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--foreground)',
          }}
        >
          {value}
        </span>
      </span>
      {chevron ? <ChevronRight size={18} style={{ flexShrink: 0, color: 'var(--muted-foreground)' }} /> : null}
    </>
  );

  const style: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    minHeight: 60,
    alignItems: 'center',
    gap: 12,
    borderRadius: 'var(--ins-radius-md)',
    background: 'var(--muted)',
    border: 'none',
    padding: '12px 14px',
    cursor: onClick ? 'pointer' : 'default',
  };

  return onClick ? (
    <button type="button" onClick={onClick} style={style}>
      {inner}
    </button>
  ) : (
    <div style={style}>{inner}</div>
  );
}

export function ProfileModule() {
  return (
    <div
      className="fams-hide-scrollbar"
      style={{ display: 'flex', flex: 1, minHeight: '100%', flexDirection: 'column', padding: '0 20px 24px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              width: 92,
              height: 92,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: '2px solid var(--primary)',
              background: `color-mix(in srgb, var(--primary) 12%, transparent)`,
              color: 'var(--primary)',
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {INITIALS}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              insetInlineStart: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              borderRadius: 999,
              padding: '3px 10px',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
            On duty
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>{NAME}</div>
        <div style={{ marginTop: 2, fontSize: 14, color: 'var(--muted-foreground)' }}>{ROLE}</div>
      </div>

      <SectionLabel>Contact</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row icon={Phone} label="Phone" value="+974 5512 3456" />
        <Row icon={Mail} label="Email" value="ahmed.khalid@mme.gov.qa" />
      </div>

      <SectionLabel>Assignment</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row icon={Clock} label="Shift" value="Morning · 06:00 – 14:00" />
        <Row icon={Building2} label="Municipality" value="Doha" />
        <Row icon={ShieldCheck} label="Inspector ID" value="MME-INS-0421" />
      </div>

      <SectionLabel>Session</SectionLabel>
      <Row icon={LogOut} label="Account" value="Sign out" chevron tone="var(--destructive, #d92d20)" onClick={() => {}} />

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '40px 0 24px',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--muted-foreground)',
        }}
      >
        <span>Qatar MME · Inspector App</span>
        <span>Version 5.0</span>
      </div>
    </div>
  );
}
