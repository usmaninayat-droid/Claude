import * as React from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../primitives/button';
import { FloatingLabelInput } from '../primitives/floating-label-input';
import illustrationUrl from './login-illustration.svg';
import logoUrl from './fams-logo.svg';

/**
 * LoginScreen — the platform sign-in (FAMS Web Portal: 22799-6581 / 22800-7335).
 *
 * Split layout: a branded illustration panel (left, hidden < lg) + a centred
 * form (right) — logo · heading · subheading · Email · Password (+ show/hide) ·
 * an error row + "Forgot password?" · Login · footer. Token-styled.
 *
 * Domain-agnostic: the tagline / heading / logo / illustration / footer are all
 * props (defaulting to FAMS). `error` turns both fields' borders destructive and
 * shows the inline message (canonical "Invalid Email or Password!" state).
 */
export interface LoginScreenProps {
  /** Large headline over the illustration panel. */
  tagline?: React.ReactNode;
  taglineSubtitle?: React.ReactNode;
  /** Form heading + subheading. */
  heading?: React.ReactNode;
  subheading?: React.ReactNode;
  /** Override the brand assets. */
  illustrationSrc?: string;
  logoSrc?: string;
  logoAlt?: string;
  /** Inline error (e.g. "Invalid Email or Password!") — drives the error state. */
  error?: string;
  /** Footer line + link. */
  footerText?: React.ReactNode;
  footerLinkLabel?: string;
  footerHref?: string;
  onSubmit?: (values: { email: string; password: string }) => void;
  onForgotPassword?: () => void;
  className?: string;
}

export function LoginScreen({
  tagline = 'Your Fleet, Our Technology, Total Control',
  taglineSubtitle = 'Experience the power of seamless fleet management with FAMS. Track, monitor, and optimize your entire fleet in real time, ensuring efficiency and safety at every step.',
  heading = 'Welcome',
  subheading = 'Log in to FAMS for real-time visibility and operational control.',
  illustrationSrc = illustrationUrl,
  logoSrc = logoUrl,
  logoAlt = 'FAMS',
  error,
  footerText = 'For more information, visit our website',
  footerLinkLabel = 'www.fams.com',
  footerHref = 'https://www.fams.com',
  onSubmit,
  onForgotPassword,
  className,
}: LoginScreenProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ email, password });
  };
  const errorBorder = error ? 'border-destructive focus-within:border-destructive focus-within:ring-destructive/15' : undefined;

  return (
    <div className={cn('flex min-h-screen w-full bg-card', className)}>
      {/* Illustration panel (hidden on small screens) */}
      <div className="relative hidden min-h-screen flex-1 overflow-hidden lg:block">
        <img src={illustrationSrc} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute left-0 top-0 max-w-[34rem] p-12">
          <h1 className="text-h4 font-bold leading-tight text-white">{tagline}</h1>
          <p className="mt-3 text-body-md leading-relaxed text-white/85">{taglineSubtitle}</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[460px] lg:shrink-0">
        <form onSubmit={submit} className="flex w-full max-w-[360px] flex-col">
          <img src={logoSrc} alt={logoAlt} className="mb-10 h-12 w-auto self-start" />
          <h2 className="text-h4 font-bold text-foreground">{heading}</h2>
          <p className="mt-1.5 text-body-sm text-muted-foreground">{subheading}</p>

          <div className="mt-7 flex flex-col gap-4">
            <FloatingLabelInput
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errorBorder}
            />
            <div className="relative">
              <FloatingLabelInput
                label="Password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn('pr-10', errorBorder)}
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            {error ? (
              <span className="inline-flex items-center gap-1.5 text-caption font-medium text-destructive">
                <AlertCircle size={13} /> {error}
              </span>
            ) : (
              <span />
            )}
            <button type="button" onClick={onForgotPassword} className="shrink-0 text-caption font-semibold text-primary outline-none hover:underline">
              Forgot password?
            </button>
          </div>

          <Button type="submit" variant="primary" className="mt-6 w-full">
            Login
          </Button>

          {footerText ? (
            <p className="mt-10 text-center text-caption text-muted-foreground">
              {footerText}{' '}
              {footerHref ? (
                <a href={footerHref} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                  {footerLinkLabel}
                </a>
              ) : null}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
