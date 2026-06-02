// Lightweight Web Notifications + sound helper.
// Falls back silently if the API is unavailable or permission is denied.

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export const getNotifPermission = (): NotifPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifPermission;
};

export const requestNotifPermission = async (): Promise<NotifPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission as NotifPermission;
  }
  try {
    const res = await Notification.requestPermission();
    return res as NotifPermission;
  } catch {
    return 'denied';
  }
};

const playPing = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* ignore */
  }
};

export interface NotifyOptions {
  title: string;
  body?: string;
  tag?: string;
  silent?: boolean;
  /** Only fire when document is hidden (avoids double-notifying foreground users). */
  onlyWhenHidden?: boolean;
}

export const notify = ({ title, body, tag, silent, onlyWhenHidden }: NotifyOptions) => {
  if (typeof window === 'undefined') return;
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if (onlyWhenHidden && !hidden) return;

  if (!silent) playPing();

  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag, icon: '/favicon.ico' });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
};
