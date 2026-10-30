import { BookOpen, CalendarRange, CircleDot, Compass, LayoutGrid } from 'lucide-react';
import { useNav, type Tab } from '../lib/nav';

const ITEMS: { tab: Tab; label: string; Icon: typeof CircleDot }[] = [
  { tab: 'today', label: 'Today', Icon: CircleDot },
  { tab: 'calendar', label: 'Calendar', Icon: CalendarRange },
  { tab: 'practices', label: 'Sankalp', Icon: LayoutGrid },
  { tab: 'diary', label: 'Diary', Icon: BookOpen },
  { tab: 'insights', label: 'Insights', Icon: Compass },
];

export function TabBar() {
  const { tab, setTab } = useNav();
  return (
    <nav className="tabbar">
      {ITEMS.map(({ tab: t, label, Icon }) => (
        <button
          key={t}
          className="tabbar__item"
          data-active={tab === t}
          onClick={() => setTab(t)}
          aria-current={tab === t ? 'page' : undefined}
          type="button"
        >
          <Icon />
          <span>{label}</span>
          <span className="tabbar__dot" />
        </button>
      ))}
    </nav>
  );
}
