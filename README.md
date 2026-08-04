# 📅 Year at a Glance Calendar

A web app that combines a **year-at-a-glance calendar** (the whole year in 12
columns, like a wall planner) with a **Google Calendar month/week view** — all
backed directly by Google Calendar. It replaces the old Google Sheet +
Apps Script sync workflow: the year grid *is* a live, editable view of a
dedicated Google Calendar, so there is no syncing and nothing to drift.

## Views

- **Year** — 12 month columns with day rows, exactly like the spreadsheet
  layout. Events on the designated "glance" calendar (default: **Sheet
  Events**) render as colored blocks; multi-day events are contiguous vertical
  blocks; overlapping events sit side-by-side; events crossing a month
  boundary appear in both columns with dotted clip markers.
  - **Click** an empty day → create an event
  - **Drag** vertically on empty days → create a multi-day event
  - **Click** a block → edit title/dates or delete (cross-month ranges are
    edited here via the date fields)
  - **Drag** a block → move it; **drag its top/bottom edge** → resize
  - Changes save to Google Calendar instantly (optimistic, with rollback +
    a toast if the API call fails). `Esc` cancels an in-flight drag.
- **Month / Week** — overlays **all** your calendars with their Google colors
  and show/hide toggles (like Google Calendar itself). Read-only in v1; click
  any event for details and a link into Google Calendar.

Views are hash-routed (`#/year/2026`, `#/month/2026-07`, `#/week/2026-07-20`)
so URLs survive reloads and can be bookmarked.

## One-time setup

### 1. Google Cloud project (≈5 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) →
   create a project (e.g. `year-glance`).
2. **APIs & Services → Library** → search **Google Calendar API** → Enable.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**; fill in app name + support email.
   - Publishing status: **Testing** is fine.
   - **Add yourself as a test user** (your Gmail address) — sign-in fails
     with `access_denied` for anyone not listed. Add anyone else who'll use
     the app too.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `https://<your-github-username>.github.io`
   - No redirect URIs are needed (the app uses the GIS token flow).
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). It is
   public by design — there is no client secret anywhere in this app.

### 2. Configure & deploy

- **Local dev**: copy `.env.example` to `.env.local`, paste the client ID,
  then `npm install && npm run dev`.
- **GitHub Pages**:
  1. Repo **Settings → Secrets and variables → Actions → Variables** → new
     repository variable `GOOGLE_CLIENT_ID` with the client ID.
  2. Repo **Settings → Pages** → Source: **GitHub Actions**.
  3. Push to `main` — the workflow in `.github/workflows/deploy.yml` tests,
     builds, and deploys automatically.

### 3. Pick the glance calendar

On first sign-in the app looks for a writable calendar named **Sheet
Events** and uses it for the year view. If it isn't found (or you want a
different one), the settings dialog (⚙️) lets you pick any calendar you can
write to.

### 4. Retire the old Apps Script sync ⚠️

If you still have the Sheets ↔ Calendar sync script installed, **delete its
triggers** (Apps Script editor → Triggers → remove the `onSheetEdit` and
`syncCalendarToSheet` triggers). Otherwise the script and this app will
fight over the same events. Keep the spreadsheet as a read-only archive.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest unit tests (date math, segmentation, lane layout)
npm run build      # type-check + production build to dist/
```

### Architecture notes

- **No backend.** The browser talks to the Google Calendar API directly with
  a Google Identity Services access token (~1 h lifetime, held in memory
  only). The app renews it silently; if that needs interaction you get a
  one-click "Reconnect" prompt.
- **All-day dates are strings.** `'YYYY-MM-DD'` everywhere
  (`src/model/isoDate.ts`) — never `new Date('YYYY-MM-DD')`, which parses as
  UTC midnight and shifts a day in US timezones. The Google API's *exclusive*
  all-day end dates are converted to the app's *inclusive* model in exactly
  one place (`src/model/allDay.ts`).
- **Optimistic editing.** Mutations update the TanStack Query cache
  immediately and roll back on failure (`src/hooks/useEventMutations.ts`).
- **Recurring events** are shown but deliberately not editable here (a note
  links you to Google Calendar) so a stray drag can't corrupt a series.
