import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { toMinutes } from '../lib/date';
import { upcomingWithin } from '../lib/schedule';

export type LiveReminder = {
  key: string;
  sankalpId: string;
  name: string;
  startsAt: Date;
  leadMinutes: number;
  snoozeMinutes: number;
};

function inQuietHours(hhmm: string, start: string, end: string): boolean {
  const t = toMinutes(hhmm);
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s <= e ? t >= s && t < e : t >= s || t < e;
}

/**
 * Watches for practices whose reminder lead time has arrived. Fires a system
 * notification when the user has granted permission, and always surfaces the
 * reminder in-app so it is snoozeable.
 */
export function useReminders() {
  const { state, snooze, acknowledge, pushToast } = useStore();
  const [tick, setTick] = useState(0);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const live = useMemo<LiveReminder[]>(() => {
    const now = new Date();
    const quiet = state.settings.notifications;
    const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    return upcomingWithin(state.sankalps, now, 45)
      .filter(({ key }) => {
        const until = state.snoozedUntil[key];
        if (until && until > now.getTime()) return false;
        const ack = state.acknowledged[key];
        if (ack && Date.now() - ack < 12 * 3600_000) return false;
        return true;
      })
      .filter(() => !inQuietHours(nowHm, quiet.quietStart, quiet.quietEnd))
      .map(({ sankalp, start, key }) => ({
        key,
        sankalpId: sankalp.id,
        name: sankalp.name,
        startsAt: start,
        leadMinutes: sankalp.reminder.leadMinutes,
        snoozeMinutes: sankalp.reminder.snoozeMinutes,
      }));
  }, [state.sankalps, state.snoozedUntil, state.acknowledged, state.settings.notifications, tick]);

  useEffect(() => {
    if (!state.settings.notifications.enabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    for (const r of live) {
      if (fired.current.has(r.key)) continue;
      fired.current.add(r.key);
      try {
        const n = new Notification(r.name, {
          body: `Your practice window opens at ${r.startsAt.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}. Snooze or mark it done in Sādhana.`,
          tag: r.key,
          silent: false,
        });
        n.onclick = () => window.focus();
      } catch {
        /* some platforms require a service worker; the in-app card still shows */
      }
    }
  }, [live, state.settings.notifications.enabled]);

  return { live, snooze, acknowledge, pushToast };
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
