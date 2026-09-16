import { useEffect, useState } from 'react';

export interface NetworkState {
  isOnline: boolean;
  isSlow: boolean;
  effectiveType?: string;
}

export function useOnlineStatus(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let isSlow = false;
    let effectiveType = 'unknown';

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
      if (conn?.effectiveType) {
        effectiveType = conn.effectiveType;
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          isSlow = true;
        }
      }
    }

    return { isOnline, isSlow, effectiveType };
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const isOnline = navigator.onLine;
      let isSlow = false;
      let effectiveType = 'unknown';

      if ('connection' in navigator) {
        const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
        if (conn?.effectiveType) {
          effectiveType = conn.effectiveType;
          if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
            isSlow = true;
          }
        }
      }

      setNetworkState({ isOnline, isSlow, effectiveType });
    };

    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    if ('connection' in navigator) {
      const conn = (navigator as unknown as { connection?: { addEventListener: (t: string, fn: () => void) => void } }).connection;
      conn?.addEventListener?.('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
    };
  }, []);

  return networkState;
}
