# 📅 Year at a Glance Calendar

A web app that combines a **year-at-a-glance calendar** (the whole year in 12
columns, like a wall planner) with a **Google Calendar month/week view** — all
backed directly by Google Calendar. It replaces the old Google Sheet +
Apps Script sync workflow: the year grid is a live, editable view of your
**primary calendar**, so there is no syncing and nothing to drift.

## The `#` convention

The year grid shows every event on your primary calendar whose name starts
with `#`. That's the whole rule:

- Add `#` to the start of an event's name in Google Calendar → it appears on
  the year grid (the `#` itself is hidden there).
- Create an event on the year grid → it's written to your primary calendar
  with the `#` added automatically.
- Remove the `#` in Google Calendar → it drops off the year grid.

## Tentative items

Need to pencil something in (school breaks, maybe-trips) without it touching
your real calendar? Tick **Tentative** in the event popover. Tentative items:

- live on a separate **`Tentative (YAAG)`** calendar the app creates
  automatically and keeps *hidden* in Google Calendar's own UI — so they sync
  across your devices but never appear in your normal Google views
- render on the year grid in a **ghost style** (dashed outline, striped fill)
- can be flipped later: uncheck Tentative to move an item onto your primary
  calendar as a confirmed `#`-event, or check it to demote a confirmed one

## Sharing with your spouse (or anyone)

Each person signs into the app with their **own** Google account and sees
their own year grid. To see each other's events:

1. **Share calendars in Google Calendar** (both directions): Settings →
   your calendar → *Share with specific people* → add the other person with
   **"See all event details"**. (That's enough — the app never edits shared
   calendars.)
2. **Add them as an OAuth test user**: Google Cloud Console → OAuth consent
   screen → Test users → add their Gmail address, or they'll get
   `access_denied` at sign-in.
3. **In the app**, each person opens ⚙️ Settings → *"Also show # events
   from…"* and ticks the other's calendar.

Their `#`-events then appear on your year grid **outlined** (white fill,
month-color border) and strictly **view-only** — clicking shows details and
a link to Google Calendar. Month/Week views show shared calendars like
Google Calendar does, with toggles. If they share their `Tentative (YAAG)`
calendar too, ticking it shows their penciled-in items ghost-style.

## Views

- **Year** — 12 month columns with day rows, exactly like the spreadsheet
  layout. `#`-events render as colored blocks; multi-day events are
  contiguous vertical blocks; overlapping events sit side-by-side; events
  crossing a month boundary appear in both columns with dotted clip markers.
  - **Click** an empty day → create an event
  - **Drag** vertically on empty days → create a multi-day event
  - **Click** a block → edit title/dates or delete (cross-month ranges are
    edited here via the date fields)
  - **Drag** a block → move it; **drag its top/bottom edge** → resize
  - Changes save to Google Calendar instantly (optimistic, with rollback +
    a toast if the API call fails). `Esc` cancels an in-flight drag.
  - Timed `#`-events (ones with a clock time) and recurring events display
    on the grid but are edited in Google Calendar / the Week view, so the
    grid can never flatten a timed event into an all-day one.
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

### 3. Retire the old Apps Script sync ⚠️

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
