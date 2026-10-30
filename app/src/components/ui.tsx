import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { COLORS, type ColorKey } from '../lib/types';

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

/** Sets the per-item accent used by `var(--pc)` throughout the CSS.
 *  `light-dark()` resolves inside the browser, so a theme switch repaints
 *  every practice colour without a React render. */
export function pc(key: ColorKey): CSSProperties {
  return {
    ['--pc' as string]: `light-dark(${COLORS[key].light}, ${COLORS[key].dark})`,
  } as CSSProperties;
}

/** The accent itself, for non-practice surfaces. */
export const PC_ACCENT: CSSProperties = { ['--pc' as string]: 'var(--accent)' } as CSSProperties;

export function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button className={cx('iconbtn', className)} aria-label={label} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  small,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className={cx('segmented', small && 'segmented--sm')} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className="segmented__btn"
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      className="switch"
      data-on={on}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      type="button"
    >
      <span className="switch__knob" />
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
  small,
  style,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  small?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      className={cx('chip', small && 'chip--sm')}
      data-active={!!active}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grip" />
        {title && (
          <div className="sheet__head">
            <div className="sheet__title">{title}</div>
            <IconButton label="Close" onClick={onClose}>
              <X />
            </IconButton>
          </div>
        )}
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </>
  );
}

/** Circular progress used for day rings and practice detail. */
export function Ring({
  value,
  size = 56,
  stroke = 3.5,
  color = 'var(--accent)',
  track = 'var(--surface-3)',
  children,
}: {
  value: number; // 0…1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      {children != null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function CheckDot({ done }: { done: boolean }) {
  return (
    <span className="check" data-done={done} aria-hidden>
      <Check />
    </span>
  );
}

export function Empty({
  glyph = '◦',
  children,
}: {
  glyph?: string;
  children: ReactNode;
}) {
  return (
    <div className="emptystate">
      <div className="emptystate__glyph">{glyph}</div>
      <p>{children}</p>
    </div>
  );
}

export function ToggleRow({
  title,
  sub,
  on,
  onChange,
}: {
  title: string;
  sub?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div style={{ minWidth: 0 }}>
        <div className="toggle-row__title">{title}</div>
        {sub && <div className="toggle-row__sub">{sub}</div>}
      </div>
      <Switch on={on} onChange={onChange} label={title} />
    </div>
  );
}
