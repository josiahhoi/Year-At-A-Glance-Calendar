import { useAuth } from '../auth/AuthContext';
import styles from './reconnectBanner.module.css';
import { showToast } from './Toast';

/**
 * Non-blocking banner shown when the background token refresh fails (e.g.
 * Safari's Intelligent Tracking Prevention blocks the silent renewal iframe,
 * roughly every ~55 minutes). Unlike the sign-in splash, this never unmounts
 * the app underneath it — whatever the user was looking at stays visible,
 * and reconnecting is one click away.
 */
export function ReconnectBanner() {
  const { signIn } = useAuth();

  return (
    <div className={styles.banner} role="status">
      <span>Your Google session expired — reconnect to keep editing.</span>
      <button
        className="btn btn-primary"
        onClick={() => signIn().catch(() => showToast('Sign-in was cancelled.', 'error'))}
      >
        Reconnect
      </button>
    </div>
  );
}
