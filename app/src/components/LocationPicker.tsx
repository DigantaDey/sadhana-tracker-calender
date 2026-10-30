import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { CITIES, guessLocation, locationById, timeIn } from '../lib/location';
import { riseSet, solarNoon } from '../lib/astro';
import { prettyDuration } from '../lib/location';
import { todayISO } from '../lib/date';
import type { PanchangSettings } from '../lib/types';

/** Sunrise and sunset for a place, computed right here so the preview updates
 *  the instant you pick a city (the engine singleton follows the store). */
export function placePreview(place: {
  latitude: number;
  longitude: number;
  timeZone: string;
}): { sunrise: string | null; sunset: string | null; noon: string } {
  const [y, m, d] = todayISO().split('-').map(Number);
  const anchor = Date.UTC(y, m - 1, d);
  const rise = riseSet(anchor, place.latitude, place.longitude, true);
  const set = riseSet(anchor, place.latitude, place.longitude, false);
  return {
    sunrise: rise != null ? timeIn(rise, place.timeZone) : null,
    sunset: set != null ? timeIn(set, place.timeZone) : null,
    noon: timeIn(solarNoon(anchor, place.longitude), place.timeZone),
  };
}

export function LocationPicker({
  value,
  onChange,
  compact,
}: {
  value: PanchangSettings;
  onChange: (next: PanchangSettings) => void;
  compact?: boolean;
}) {
  const auto = useMemo(() => guessLocation(), []);
  const preview = useMemo(
    () =>
      placePreview({
        latitude: value.latitude,
        longitude: value.longitude,
        timeZone: value.timeZone,
      }),
    [value.latitude, value.longitude, value.timeZone]
  );

  const dayLength = useMemo(() => {
    if (!preview.sunrise || !preview.sunset) return null;
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const len = toMin(preview.sunset) - toMin(preview.sunrise);
    return len > 0 ? prettyDuration(len) : null;
  }, [preview]);

  return (
    <div className="place">
      <label className="place__field">
        <span className="field__label">
          <MapPin size={11} /> Pañcāṅga place
        </span>
        <select
          className="input select"
          value={value.presetId}
          onChange={(e) => {
            const id = e.target.value;
            if (id === 'auto') {
              const place = guessLocation();
              onChange({
                presetId: 'auto',
                label: place.label,
                latitude: place.latitude,
                longitude: place.longitude,
                timeZone: place.timeZone,
              });
              return;
            }
            const city = locationById(id, auto);
            onChange({
              presetId: id,
              label: city.label,
              latitude: city.latitude,
              longitude: city.longitude,
              timeZone: city.timeZone,
            });
          }}
        >
          <option value="auto">Automatic — {auto.label}</option>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <p className={`place__note${compact ? ' place__note--tight' : ''}`}>
        {preview.sunrise && preview.sunset ? (
          <>
            Sunrise {preview.sunrise} · sunset {preview.sunset}
            {dayLength ? ` · ${dayLength} of daylight` : ''}
          </>
        ) : (
          <>No sunrise or sunset today at this latitude — the tithi is read at solar noon.</>
        )}
      </p>
      {value.presetId === 'auto' && (
        <p className="place__note place__note--tight">
          Inferred from this device’s time zone. Pick your city for an exact sunrise.
        </p>
      )}
    </div>
  );
}
