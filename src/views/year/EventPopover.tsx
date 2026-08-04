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
  readOnlyReason?: 'recurring' | 'timed';
  htmlLink?: string;
  saving?: boolean;
  onSave: (title: string, startDate: IsoDate, endDate: IsoDate) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const READ_ONLY_COPY: Record<'recurring' | 'timed', string> = {
  recurring: 'This is a recurring event — edit it in Google Calendar to keep the series intact.',
  timed:
    'This event has a time of day, so the year grid leaves it alone — edit it in Google Calendar or the Week view.',
};

export function EventPopover({
  mode,
  anchor,
  initialTitle,
  initialStart,
  initialEnd,
  readOnlyReason,
  htmlLink,
  onSave,
  onDelete,
  onClose,
}: EventPopoverProps) {
  const [title, setTitle] = useState(initialTitle);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
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
    onSave(title.trim(), s, en);
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
