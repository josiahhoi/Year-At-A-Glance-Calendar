import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Popover } from '../../components/Popover';
import { isValidIsoDate, type IsoDate } from '../../model/isoDate';
import type { AnchorRect } from './useGridDrag';
import styles from './yearView.module.css';

interface EventPopoverProps {
  mode: 'create' | 'edit';
  anchor: AnchorRect;
  initialTitle: string;
  initialStart: IsoDate;
  initialEnd: IsoDate;
  /** Present when the event can only be edited in Google Calendar. */
  readOnlyReason?: 'recurring' | 'timed' | 'shared';
  htmlLink?: string;
  saving?: boolean;
  initialTentative?: boolean;
  onSave: (title: string, startDate: IsoDate, endDate: IsoDate, tentative: boolean) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const READ_ONLY_COPY: Record<'recurring' | 'timed' | 'shared', string> = {
  recurring: 'This is a recurring event — edit it in Google Calendar to keep the series intact.',
  timed:
    'This event has a time of day, so the year grid leaves it alone — edit it in Google Calendar or the Week view.',
  shared: 'This event is from a calendar shared with you — view only here.',
};

export function EventPopover({
  mode,
  anchor,
  initialTitle,
  initialStart,
  initialEnd,
  readOnlyReason,
  htmlLink,
  initialTentative = false,
  onSave,
  onDelete,
  onClose,
}: EventPopoverProps) {
  const [title, setTitle] = useState(initialTitle);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [tentative, setTentative] = useState(initialTentative);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus after the popover is actually visible: it stays visibility:hidden
  // until positioned, and hidden elements silently refuse focus — so neither
  // autoFocus nor a plain mount effect works. rAF lands after that paint.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (readOnlyReason) {
    return (
      <Popover anchor={anchor} onClose={onClose}>
        <div className={styles.popTitle}>{initialTitle}</div>
        <div className={styles.popNote}>{READ_ONLY_COPY[readOnlyReason]}</div>
        <div className={styles.popActions}>
          {htmlLink && (
            <a className="btn" href={htmlLink} target="_blank" rel="noreferrer">
              Open in Google Calendar
            </a>
          )}
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </Popover>
    );
  }

  const valid = title.trim().length > 0 && isValidIsoDate(start) && isValidIsoDate(end);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    // Inverted ranges are swapped rather than rejected.
    const [s, en] = start <= end ? [start, end] : [end, start];
    onSave(title.trim(), s, en, tentative);
  };

  return (
    <Popover anchor={anchor} onClose={onClose}>
      <form onSubmit={submit} className={styles.popForm}>
        <input
          ref={titleRef}
          type="text"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Event title"
        />
        <div className={styles.popDates}>
          <label>
            <span>Start</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </label>
          <label>
            <span>End</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </label>
        </div>
        <label className={styles.popTentative}>
          <input
            type="checkbox"
            checked={tentative}
            onChange={(e) => setTentative(e.target.checked)}
          />
          <span>
            Tentative <em>— kept off your main calendar</em>
          </span>
        </label>
        <div className={styles.popActions}>
          {mode === 'edit' && onDelete && (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <span className={styles.popSpacer} />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </Popover>
  );
}
