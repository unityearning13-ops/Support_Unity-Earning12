import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isSlow } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div
        id="offline-banner"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-red-600/95 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur transition-all animate-bounce"
        role="alert"
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span>ইন্টারনেট সংযোগ নেই। পুনরায় যুক্ত হওয়ার চেষ্টা করা হচ্ছে…</span>
      </div>
    );
  }

  if (isSlow) {
    return (
      <div
        id="slow-network-banner"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/90 px-4 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur transition-all"
        role="status"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>ইন্টারনেট ধীরগতির। অনুগ্রহ করে অপেক্ষা করুন…</span>
      </div>
    );
  }

  return null;
};
