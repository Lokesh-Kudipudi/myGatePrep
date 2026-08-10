import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { usePomodoro } from '../store/usePomodoro';
import { useStopwatch } from '../store/useStopwatch';

const IconToday = () => (
  <svg className={styles.icon} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
  </svg>
);

const IconCalendar = () => (
  <svg className={styles.icon} viewBox="0 0 24 24">
    <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
    <path d="M3.5 10h17" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </svg>
);

const IconProgress = () => (
  <svg className={styles.icon} viewBox="0 0 24 24">
    <path d="M4 19V11" />
    <path d="M10 19V7" />
    <path d="M16 19V13" />
    <path d="M22 19V4" />
  </svg>
);

const IconTests = () => (
  <svg className={styles.icon} viewBox="0 0 24 24">
    <rect x="5" y="4" width="14" height="17" rx="1.5" />
    <path d="M9 3h6v3H9z" />
    <path d="M8.5 11l1.5 1.5L13 9.5" />
    <path d="M8.5 16.5h7" />
  </svg>
);

const IconPomodoro = () => (
  <svg className={styles.icon} viewBox="0 0 24 24">
    <path d="M9 3h6" />
    <path d="M12 3v3" />
    <circle cx="12" cy="14" r="7" />
    <path d="M12 10v4l2.5 2" />
  </svg>
);

const IconStopwatch = () => (
  <svg className={styles.icon} viewBox="0 0 24 24">
    <path d="M9 3h6" />
    <path d="M12 3v3" />
    <path d="M18.5 7.5l1.5-1.5" />
    <circle cx="12" cy="14" r="7" />
    <path d="M12 10v4h4" />
  </svg>
);

const NAV = [
  { to: '/today', label: 'Today', Icon: IconToday },
  { to: '/calendar', label: 'Calendar', Icon: IconCalendar },
  { to: '/progress', label: 'Progress', Icon: IconProgress },
  { to: '/tests', label: 'Tests', Icon: IconTests },
  { to: '/pomodoro', label: 'Pomodoro', Icon: IconPomodoro },
  { to: '/stopwatch', label: 'Stopwatch', Icon: IconStopwatch },
];

export default function Sidebar() {
  const running = usePomodoro((s) => s.phase !== 'idle');
  const stopwatchRunning = useStopwatch((s) => s.phase !== 'idle');

  return (
    <nav className={styles.sidebar}>
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <Icon />
          {to === '/pomodoro' && running && <span className={styles.runningDot} />}
          {to === '/stopwatch' && stopwatchRunning && <span className={styles.runningDot} />}
          <span className={styles.tooltip}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
