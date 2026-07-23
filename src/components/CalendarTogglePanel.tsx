import type { CalendarInfo } from '../api/calendarList';
import { updateSettings, useSettings } from '../hooks/useSettings';
import styles from './togglePanel.module.css';

export function CalendarTogglePanel({ calendars }: { calendars: CalendarInfo[] }) {
  const settings = useSettings();
  const hidden = new Set(settings.hiddenCalendarIds);

  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateSettings({ hiddenCalendarIds: [...next] });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>My calendars</div>
      {calendars.map((cal) => (
        <label key={cal.id} className={styles.row}>
          <input
            type="checkbox"
            checked={!hidden.has(cal.id)}
            onChange={() => toggle(cal.id)}
            style={{ accentColor: cal.bg }}
          />
          <span className={styles.swatch} style={{ background: cal.bg }} />
          <span className={styles.name} title={cal.id}>
            {cal.summary}
          </span>
        </label>
      ))}
    </div>
  );
}
