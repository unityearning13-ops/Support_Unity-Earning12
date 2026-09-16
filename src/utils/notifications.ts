// Web Push and Sound Notification Utility
// Uses native Web Notifications API + Web Audio API for guaranteed chime playback

type NotificationListener = (banner: InAppNotification) => void;

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  senderName?: string;
  senderPhoto?: string;
  avatarText?: string;
  conversationId?: string;
  type?: 'chat' | 'broadcast' | 'system';
  timestamp: string;
}

const listeners = new Set<NotificationListener>();

export const subscribeToInAppNotifications = (fn: NotificationListener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const dispatchInAppNotification = (notif: InAppNotification) => {
  listeners.forEach((fn) => {
    try {
      fn(notif);
    } catch (e) {
      console.warn('In-app notification dispatch error:', e);
    }
  });
};

// Play a pleasant, high quality notification chime using browser Web Audio API
export const playNotificationSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic dual-tone chime (high ding + soft resonant bell)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33, now); // D5
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  } catch {
    // AudioContext autoplay restrictions fallback
  }
};

// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

// Auto register service worker for Chrome
export const initServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return reg;
    } catch (err) {
      console.warn('Service worker registration failed:', err);
      return null;
    }
  }
  return null;
};

// Call immediately on client
if (typeof window !== 'undefined') {
  initServiceWorker();
}

// Request Notification Permission
export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return 'denied';
  try {
    await initServiceWorker();
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        localStorage.setItem('ue_push_permission_granted', 'true');
      } catch {
        // storage ignore
      }
    }
    return permission;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return 'denied';
  }
};

// Display Native Web Notification + Top In-App banner + Chime
export const triggerAppNotification = ({
  title,
  message,
  senderName,
  senderPhoto,
  conversationId,
  type = 'chat',
  onClick,
}: {
  title: string;
  message: string;
  senderName?: string;
  senderPhoto?: string;
  conversationId?: string;
  type?: 'chat' | 'broadcast' | 'system';
  onClick?: () => void;
}) => {
  // 1. Play Sound Chime
  playNotificationSound();

  // 2. Dispatch In-App Banner (Slides in from top)
  const notifObj: InAppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    senderName,
    senderPhoto,
    avatarText: senderName ? senderName.charAt(0).toUpperCase() : 'U',
    conversationId,
    type,
    timestamp: new Date().toISOString(),
  };
  dispatchInAppNotification(notifObj);

  // 3. Trigger Browser Web Notification directly in Chrome / System
  if (isNotificationSupported() && Notification.permission === 'granted') {
    const notifOptions: any = {
      body: message,
      icon: senderPhoto || '/icon.svg',
      badge: '/icon.svg',
      tag: conversationId ? `conv_${conversationId}` : `ue_notif_${Date.now()}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: {
        url: conversationId ? `/?conv=${conversationId}` : '/',
        conversationId,
      },
    };

    // Primary for Chrome (Desktop & Android): Service Worker showNotification
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, notifOptions);
          } else {
            fallbackDesktopNotification(title, notifOptions, onClick);
          }
        })
        .catch(() => {
          fallbackDesktopNotification(title, notifOptions, onClick);
        });
    } else {
      fallbackDesktopNotification(title, notifOptions, onClick);
    }
  }
};

// Fallback for desktop browsers without serviceWorker
const fallbackDesktopNotification = (
  title: string,
  options: NotificationOptions,
  onClick?: () => void
) => {
  try {
    const nativeNotification = new Notification(title, options);
    nativeNotification.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      if (onClick) onClick();
      nativeNotification.close();
    };
  } catch (e) {
    console.warn('Desktop notification constructor notice:', e);
  }
};
