import { useEffect, useState } from 'react';
import { Battery, Signal, Wifi } from 'lucide-react';
import { clockLabel } from '../lib/date';

export function StatusBar() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="statusbar" aria-hidden>
      <span>{clockLabel(now)}</span>
      <span className="statusbar__icons">
        <Signal size={13} strokeWidth={2.2} />
        <Wifi size={13} strokeWidth={2.2} />
        <Battery size={17} strokeWidth={1.9} />
      </span>
    </div>
  );
}
