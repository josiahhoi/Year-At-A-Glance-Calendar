import type { CalendarInfo } from '../../api/calendarList';
import { Popover } from '../../components/Popover';
import type { AppEvent } from '../../model/eventModel';
import { formatEventRange } from '../../model/format';
import type { AnchorRect } from '../year/useGridDrag';
import styles from './monthWeek.module.css';

interface EventDetailPopoverProps {
  event: AppEvent;
  calendar: CalendarInfo | undefined;
  anchor: AnchorRect;
  onClose: () => void;
}

export function EventDetailPopover({ event, calendar, anchor, onClose }: EventDetailPopoverProps) {
  return (
    <Popover anchor={anchor} onClose={onClose}>
      <div className={styles.detailTitle}>{event.title}</div>
      <div className={styles.detailWhen}>{formatEventRange(event)}</div>
      {calendar && (
        <div className={styles.detailCal}>
          <span className={styles.detailSwatch} style={{ background: calendar.bg }} />
          {calendar.summary}
        </div>
      )}
      {event.htmlLink && (
        <a className={styles.detailLink} href={event.htmlLink} target="_blank" rel="noreferrer">
          Open in Google Calendar ↗
        </a>
      )}
    </Popover>
  );
}
