'use client';

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useEffect, useRef, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';

export const READY_AFTER_DAYS = 7;

export function ago(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function isReady(lastPosted: string | null): boolean {
  if (!lastPosted) return true;
  return Date.now() - new Date(lastPosted).getTime() >= READY_AFTER_DAYS * 86_400_000;
}

/** CSS variables that make a model's colour the accent for everything inside. */
export function modelVars(color: string): React.CSSProperties {
  const hex = color.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return { '--model': color, '--on-model': lum > 0.4 ? '#111318' : '#ffffff' } as React.CSSProperties;
}

/** Current time, refreshed every minute so 'ready' states and 'x ago' labels stay current. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'quiet' | 'outline' | 'danger';

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-9 px-3.5 text-[13.5px]',
        variant === 'primary' && 'bg-model text-[var(--on-model,#fff)] hover:brightness-110 shadow-[inset_0_-1px_0_rgba(0,0,0,.18)]',
        variant === 'outline' && 'border border-line-strong text-ink hover:bg-raised',
        variant === 'quiet' && 'text-muted hover:text-ink hover:bg-raised',
        variant === 'danger' && 'border border-bad/40 text-bad hover:bg-bad/10',
        className
      )}
    />
  );
}

const fieldBase =
  'w-full rounded-md border border-line-strong bg-panel px-3 text-[13.5px] text-ink placeholder:text-faint focus:outline-none focus:border-model focus:ring-2 focus:ring-model/25';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldBase, 'h-9', className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldBase, 'py-2 resize-y', className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(fieldBase, 'h-9 pr-8 appearance-none bg-no-repeat bg-[right_10px_center] bg-[length:10px] bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 10 6%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%238a93a6%27 stroke-width=%271.5%27/%3E%3C/svg%3E")]', className)}>
      {children}
    </select>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px] font-medium text-muted">
      <span>{children}</span>
      {hint && <span className="font-normal text-faint">{hint}</span>}
    </span>
  );
}

/** Centered dialog. Closes on Escape and backdrop click. */
export function Dialog({
  title,
  onClose,
  children,
  width = 'max-w-md',
  accent,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button[data-autofocus]')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        style={accent ? ({ '--model': accent } as React.CSSProperties) : undefined}
        className={cx('relative w-full bg-panel border border-line rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto', width)}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 -mr-1 rounded text-faint hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-5 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            '-mb-px border-b-2 pb-2.5 pt-1 text-[13.5px] font-medium transition-colors',
            value === t.id ? 'border-model text-ink' : 'border-transparent text-muted hover:text-ink'
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="num ml-1.5 text-faint">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-14 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Tag({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'ok' | 'warn' | 'bad' | 'model' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded px-1.5 py-px text-[11.5px] font-medium',
        tone === 'plain' && 'bg-raised text-muted',
        tone === 'ok' && 'bg-ok/12 text-ok',
        tone === 'warn' && 'bg-warn/12 text-warn',
        tone === 'bad' && 'bg-bad/12 text-bad',
        tone === 'model' && 'bg-model/15 text-model'
      )}
    >
      {children}
    </span>
  );
}
