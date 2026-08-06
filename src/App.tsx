import { useEffect, useState } from 'react';
import styles from './app.module.css';
import { useAuth } from './auth/AuthContext';
import { showToast, ToastHost } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';
import { GOOGLE_CLIENT_ID, TENTATIVE_CALENDAR_NAME } from './config';
import { useCalendars } from './hooks/useCalendars';
import { updateSettings, useSettings } from './hooks/useSettings';
import { monthOf, today, yearOf } from './model/isoDate';
import { useRoute, type Route } from './route';
import { MonthView } from './views/monthweek/MonthView';
import { WeekView } from './views/monthweek/WeekView';
import { YearView } from './views/year/YearView';

export function App() {
  const { status, signIn } = useAuth();

  if (!GOOGLE_CLIENT_ID) return <SetupNotice />;

  if (status === 'init' || status === 'signing-in') {
    return <div className={styles.splash}>Connecting to Google Calendar…</div>;
  }

  if (status === 'signed-out' || status === 'needs-signin') {
    return (
      <div className={styles.splash}>
        <h1 className={styles.splashTitle}>📅 Year at a Glance</h1>
        <p className={styles.splashText}>
          {status === 'needs-signin'
            ? 'Your Google session needs to be reconnected.'
            : 'See and edit your whole year alongside your Google Calendar.'}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => signIn().catch(() => showToast('Sign-in was cancelled.', 'error'))}
        >
          {status === 'needs-signin' ? 'Reconnect Google Calendar' : 'Sign in with Google'}
        </button>
      </div>
    );
  }

  return <SignedInApp />;
}

function SignedInApp() {
  const [route, navigate] = useRoute();
  const settings = useSettings();
  const calendars = useCalendars();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Remember the last viewed year for the default route.
  useEffect(() => {
    if (route.view === 'year' && route.year !== settings.lastYear) {
      updateSettings({ lastYear: route.year });
    }
  }, [route, settings.lastYear]);

  // Recognize an existing tentative calendar (e.g. created on another device).
  // A stored id that's missing from the list is left alone — the list may be
  // momentarily stale right after auto-creation, and a truly dangling id is
  // harmless (the calendar just resolves as absent until recreated).
  useEffect(() => {
    if (!calendars.data) return;
    const stored = settings.tentativeCalendarId;
    if (stored && calendars.data.some((c) => c.id === stored)) return;
    const byName = calendars.data.find((c) => c.summary === TENTATIVE_CALENDAR_NAME && c.writable);
    if (byName && byName.id !== stored) updateSettings({ tentativeCalendarId: byName.id });
  }, [calendars.data, settings.tentativeCalendarId]);

  const primaryCalendar = calendars.data?.find((c) => c.primary) ?? null;
  const tentativeCalendar =
    calendars.data?.find((c) => c.id === settings.tentativeCalendarId) ?? null;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <span className={styles.brand}>📅 Year at a Glance</span>
        <nav className={styles.tabs}>
          <ViewTab label="Year" active={route.view === 'year'} onClick={() => navigate(toYear(route))} />
          <ViewTab label="Month" active={route.view === 'month'} onClick={() => navigate(toMonth(route))} />
          <ViewTab label="Week" active={route.view === 'week'} onClick={() => navigate(toWeek(route))} />
        </nav>
        <div className={styles.topbarRight}>
          <button
            className="btn btn-ghost"
            title="Settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙️
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {calendars.isLoading && <div className={styles.splash}>Loading calendars…</div>}
        {calendars.error != null && (
          <div className={styles.splash}>
            Couldn't load your calendars. <br />
            <button className="btn" onClick={() => calendars.refetch()}>
              Retry
            </button>
          </div>
        )}
        {calendars.data && route.view === 'year' && (
          <YearView
            year={route.year}
            primaryCalendar={primaryCalendar}
            tentativeCalendar={tentativeCalendar}
            calendars={calendars.data}
            onNavigate={navigate}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {calendars.data && route.view === 'month' && (
          <MonthView
            year={route.year}
            month={route.month}
            calendars={calendars.data}
            onNavigate={navigate}
          />
        )}
        {calendars.data && route.view === 'week' && (
          <WeekView date={route.date} calendars={calendars.data} onNavigate={navigate} />
        )}
      </main>

      {settingsOpen && calendars.data && (
        <SettingsModal calendars={calendars.data} onClose={() => setSettingsOpen(false)} />
      )}
      <ToastHost />
    </div>
  );
}

function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`${styles.tab} ${active ? styles.tabActive : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

/** Route conversions keep the user's temporal context when switching views. */
function toYear(route: Route): Route {
  if (route.view === 'year') return route;
  if (route.view === 'month') return { view: 'year', year: route.year };
  return { view: 'year', year: yearOf(route.date) };
}

function toMonth(route: Route): Route {
  const now = today();
  if (route.view === 'month') return route;
  if (route.view === 'week') {
    return { view: 'month', year: yearOf(route.date), month: monthOf(route.date) };
  }
  return {
    view: 'month',
    year: route.year,
    month: route.year === yearOf(now) ? monthOf(now) : 1,
  };
}

function toWeek(route: Route): Route {
  const now = today();
  if (route.view === 'week') return route;
  if (route.view === 'month') {
    const sameMonth = yearOf(now) === route.year && monthOf(now) === route.month;
    return { view: 'week', date: sameMonth ? now : `${route.year}-${String(route.month).padStart(2, '0')}-01` };
  }
  return { view: 'week', date: route.year === yearOf(now) ? now : `${route.year}-01-01` };
}

function SetupNotice() {
  return (
    <div className={styles.splash}>
      <h1 className={styles.splashTitle}>📅 Year at a Glance</h1>
      <p className={styles.splashText}>
        No Google OAuth client is configured. Set <code>VITE_GOOGLE_CLIENT_ID</code> in{' '}
        <code>.env.local</code> (local dev) or the <code>GOOGLE_CLIENT_ID</code> repository
        variable (deploys), then rebuild. See the README for the one-time Google Cloud setup.
      </p>
    </div>
  );
}
