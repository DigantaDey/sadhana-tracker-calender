// ── Human-facing strings for domain objects ──────────────────────────────────

import { TITHI_NAMES, type Frequency } from './types';

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every day", "Mon to Sat", "Every Tue, Thu", "Monthly on the 3rd"… */
export function describeFrequency(f: Frequency): string {
  switch (f.kind) {
    case 'daily':
      return 'Every day';
    case 'weekly': {
      const days = [...new Set(f.days)].sort((a, b) => a - b);
      if (days.length === 7) return 'Every day';
      if (days.length === 6 && days.includes(1) && !days.includes(0)) return 'Monday to Saturday';
      if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
      if (days.length === 1) return `Every ${SHORT_DAYS[days[0]]}`;
      return `Every ${days.map((d) => SHORT_DAYS[d]).join(', ')}`;
    }
    case 'monthly':
      return `Monthly on the ${ordinal(f.day)}`;
    case 'yearly':
      return 'Once a year';
    case 'tithi':
      return `Every ${TITHI_NAMES[f.tithi - 1]} tithi`;
    case 'once':
      return 'One-time anuṣṭhāna';
  }
}
