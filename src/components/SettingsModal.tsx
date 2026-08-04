import type { CalendarInfo } from '../api/calendarList';
import { useAuth } from '../auth/AuthContext';
import { updateSettings, useSettings } from '../hooks/useSettings';
import styles from './settingsModal.module.css';

interface SettingsModalProps {
  calendars: CalendarInfo[];
  onClose: () => void;
}

export function SettingsModal({ calendars, onClose }: SettingsModalProps) {
  const settings = useSettings();
  const { signOut } = useAuth();
  const writable = calendars.filter((c) => c.writable);
  const account = calendars.find((c) => c.primary)?.id;

  return (
    <div className={styles.overlay} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-label="Settings">
        <h2 className={styles.title}>Settings</h2>

        <label className={styles.field}>
          <span className={styles.label}>Year-at-a-glance calendar</span>
          <select
            value={settings.glanceCalendarId ?? ''}
            onChange={(e) => updateSettings({ glanceCalendarId: e.target.value || null })}
          >
            <option value="" disabled>
              Choose a calendar…
            </option>
            {writable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.summary}
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            The year grid shows and edits this calendar's events. Pick a dedicated calendar (e.g.
            "Sheet Events"), not your primary one.
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Default view</span>
          <select
            value={settings.defaultView}
            onChange={(e) =>
              updateSettings({ defaultView: e.target.value as 'year' | 'month' | 'week' })
            }
          >
            <option value="year">Year at a glance</option>
            <option value="month">Month</option>
            <option value="week">Week</option>
          </select>
        </label>

        <div className={styles.footer}>
          <span className={styles.account}>{account}</span>
          <div className={styles.footerButtons}>
            <button
              className="btn"
              onClick={() => {
                signOut();
                onClose();
              }}
            >
              Sign out
            </button>
            <button className="btn btn-primary" onClick={onClose} disabled={!settings.glanceCalendarId}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
