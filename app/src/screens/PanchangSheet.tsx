import { useMemo } from 'react';
import { Compass, Info, Moon, Sun } from 'lucide-react';
import { Sheet, Ring } from '../components/ui';
import { MoonGlyph } from '../components/MoonGlyph';
import { formatLong } from '../lib/date';
import { moonTimesFor, panchangFor } from '../lib/panchang';
import { prettyDuration, timeIn } from '../lib/location';

export function PanchangSheet({
  date,
  onClose,
}: {
  date: string | null;
  onClose: () => void;
}) {
  const day = useMemo(() => (date ? panchangFor(date) : null), [date]);
  const moon = useMemo(() => (date ? moonTimesFor(date) : null), [date]);

  if (!date || !day) return null;

  const zone = day.place.timeZone;
  const tithiSpan = (day.tithiEnd - day.tithiStart) / 60_000;
  const endsTomorrow =
    day.tithiEnd > day.solarNoon && new Date(day.tithiEnd).getDate() !== new Date(day.solarNoon).getDate();
  const phase = day.paksha === 'śukla' ? day.tithi / 60 : 1 - (day.tithi - 15) / 60;

  return (
    <Sheet open onClose={onClose} title="Pañcāṅga">
      <div className="panch__head">
        <div>
          <div className="eyebrow">{formatLong(date)}</div>
          <div className="panch__tithi">{day.tithiName}</div>
          <div className="panch__sub">
            Tithi until {day.tithiEndLabel}
            {endsTomorrow ? ' tomorrow' : ''} · then {day.nextTithi === 15 ? 'Pūrṇimā' : day.nextTithi === 30 ? 'Amāvasyā' : `tithi ${day.nextTithi}`}
          </div>
        </div>
        <Ring value={day.illumination} size={54} stroke={4} color="var(--accent)" track="var(--surface-3)">
          <MoonGlyph phase={phase} size={26} className="panch__moon" />
        </Ring>
      </div>

      {day.observance && (
        <div className="panch__obs">
          <span className="badge badge--accent">{day.observance}</span>
          <span>
            {day.vriddhi
              ? 'This tithi touches two sunrises — a vṛddhi day.'
              : day.kshaya
              ? 'The tithi after this one is skipped today (kṣaya).'
              : 'Observed today at sunrise.'}
          </span>
        </div>
      )}

      <div className="panch__grid">
        <Row label="Tithi" value={day.tithiName} sub={`${day.tithiStartLabel} → ${day.tithiEndLabel} · ${prettyDuration(tithiSpan)}`} />
        <Row label="Pakṣa" value={day.paksha === 'śukla' ? 'Śukla — waxing' : 'Kṛṣṇa — waning'} />
        <Row label="Nakṣatra" value={day.nakshatraName} />
        <Row label="Yoga" value={day.yogaName} />
        <Row label="Karaṇa" value={day.karana} />
      </div>

      <div className="panch__sun">
        <div className="panch__suncell">
          <Sun size={14} /> <span>Sunrise</span>
          <strong>{day.sunriseLabel ?? '—'}</strong>
        </div>
        <div className="panch__suncell">
          <Compass size={14} /> <span>Solar noon</span>
          <strong>{timeIn(day.solarNoon, zone)}</strong>
        </div>
        <div className="panch__suncell">
          <Sun size={14} /> <span>Sunset</span>
          <strong>{day.sunsetLabel ?? '—'}</strong>
        </div>
      </div>

      <div className="panch__sun">
        <div className="panch__suncell">
          <Moon size={14} /> <span>Moonrise</span>
          <strong>{moon?.rise ? timeIn(moon.rise, zone) : '—'}</strong>
        </div>
        <div className="panch__suncell">
          <Moon size={14} /> <span>Moonset</span>
          <strong>{moon?.set ? timeIn(moon.set, zone) : '—'}</strong>
        </div>
        <div className="panch__suncell">
          <Moon size={14} /> <span>Illumination</span>
          <strong>{Math.round(day.illumination * 100)}%</strong>
        </div>
      </div>

      <p className="mono-note" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <Info size={12} style={{ flex: 'none', marginTop: 2 }} />
        <span>
          Computed on this device for {day.place.label} — the Moon's 60-term series, Lahiri
          ayanāṁśa, NOAA sunrise. Tithi boundaries are typically within a minute of a printed
          pañcāṅga; sunset and moonrise within a minute or two.
        </span>
      </p>
    </Sheet>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panch__row">
      <span className="panch__label">{label}</span>
      <span className="panch__value">
        {value}
        {sub && <em>{sub}</em>}
      </span>
    </div>
  );
}
