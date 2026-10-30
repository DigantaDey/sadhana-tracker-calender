import type { CSSProperties } from 'react';

/**
 * A tiny moon that actually tracks the phase: the lit limb is on the right
 * while waxing and on the left while waning, and the covered fraction follows
 * the illuminated fraction. Pure CSS, so a theme switch repaints it for free.
 */
export function MoonGlyph({
  phase,
  size = 11,
  className = 'tithi__moon',
}: {
  /** 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter */
  phase: number;
  size?: number;
  className?: string;
}) {
  const p = ((phase % 1) + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const waxing = p < 0.5;
  const style = {
    width: size,
    height: size,
    ['--shadow-x' as string]: `${Math.round((1 - illumination) * 100)}%`,
    ['--shadow-sign' as string]: waxing ? '-1' : '1',
  } as CSSProperties;
  return <span className={className} style={style} aria-hidden />;
}

export function moonPhaseFromIllumination(illumination: number, waxing: boolean): number {
  const clamped = Math.max(0, Math.min(1, illumination));
  const angle = Math.acos(1 - 2 * clamped) / (2 * Math.PI); // 0…0.5
  return waxing ? angle : 1 - angle;
}
