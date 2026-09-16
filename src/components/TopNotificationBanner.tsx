import React, { useEffect, useState } from 'react';
import {
  Bell,
  MessageSquare,
  Sparkles,
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import {
  InAppNotification,
  subscribeToInAppNotifications,
  isNotificationSupported,
  requestPushPermission,
  triggerAppNotification,
} from '../utils/notifications';

interface TopNotificationBannerProps {
  onOpenConversation?: (conversationId: string) => void;
}

export const TopNotificationBanner: React.FC<TopNotificationBannerProps> = ({
  onOpenConversation,
}) => {
  const [currentNotif, setCurrentNotif] = useState<InAppNotification | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionSuccess, setPermissionSuccess] = useState(false);

  // Check if browser permission is 'default' (not yet asked)
  useEffect(() => {
    if (isNotificationSupported()) {
      if (Notification.permission === 'default') {
        // Show non-intrusive prompt after a short delay
        const timer = setTimeout(() => {
          const dismissed = sessionStorage.getItem('ue_notif_prompt_dismissed');
          if (!dismissed) {
            setShowPermissionPrompt(true);
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Listen for incoming in-app notifications
  useEffect(() => {
    const unsubscribe = subscribeToInAppNotifications((notif) => {
      setCurrentNotif(notif);
    });
    return () => unsubscribe();
  }, []);

  // Auto-dismiss top notification after 6 seconds
  useEffect(() => {
    if (!currentNotif) return;
    const timer = setTimeout(() => {
      setCurrentNotif(null);
    }, 6500);
    return () => clearTimeout(timer);
  }, [currentNotif]);

  const handleGrantPermission = async () => {
    const result = await requestPushPermission();
    if (result === 'granted') {
      setShowPermissionPrompt(false);
      setPermissionSuccess(true);
      // Immediately trigger a test Chrome notification
      triggerAppNotification({
        title: 'Unity Earning',
        message: 'ক্রোম নোটিফিকেশন সফলভাবে চালু হয়েছে! মেসেজ আসলে সরাসরি আপনার ফোনে আসবে।',
        type: 'system',
      });
      setTimeout(() => setPermissionSuccess(false), 4000);
    } else {
      setShowPermissionPrompt(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowPermissionPrompt(false);
    try {
      sessionStorage.setItem('ue_notif_prompt_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* 1. TOP IN-APP NOTIFICATION BANNER (Slides down from top) */}
      {currentNotif && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-top-6 duration-300">
          <div
            onClick={() => {
              if (currentNotif.conversationId && onOpenConversation) {
                onOpenConversation(currentNotif.conversationId);
              }
              setCurrentNotif(null);
            }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md cursor-pointer hover:border-sky-400 transition"
          >
            {/* Avatar or Icon */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white font-bold shadow-md overflow-hidden">
              {currentNotif.senderPhoto ? (
                <img
                  src={currentNotif.senderPhoto}
                  alt={currentNotif.senderName || 'Sender'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-base">{currentNotif.avatarText || '🔔'}</span>
              )}
            </div>

            {/* Notification Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  {currentNotif.type === 'broadcast'
                    ? 'অফিশিয়াল নোটিফিকেশন'
                    : 'নতুন মেসেজ'}
                </span>
                <span className="text-[9px] text-slate-400">• এইমাত্র</span>
              </div>

              <h4 className="truncate text-xs font-bold text-white">
                {currentNotif.title}
              </h4>
              <p className="truncate text-[11px] text-slate-300 font-medium">
                {currentNotif.message}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {currentNotif.conversationId && (
                <button
                  type="button"
                  className="rounded-xl bg-sky-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow hover:bg-sky-400 transition"
                >
                  দেখুন
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentNotif(null);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FRIENDLY NOTIFICATION PERMISSION PROMPT BANNER */}
      {showPermissionPrompt && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-top-6 duration-300">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-teal-500/40 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-teal-300">
                ক্রোম ব্রাউজার নোটিফিকেশন চালু করুন
              </h4>
              <p className="text-[11px] text-slate-300 leading-tight">
                মেসেজ আসলে সরাসরি ফোনের ক্রোম নোটিফিকেশন বারে চলে আসবে।
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleGrantPermission}
                className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-500 transition cursor-pointer"
              >
                অনুমতি দিন
              </button>
              <button
                onClick={handleDismissPrompt}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                title="পরে"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PERMISSION SUCCESS TOAST */}
      {permissionSuccess && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 p-3 text-emerald-200 shadow-xl backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">
              নোটিফিকেশন সফলভাবে চালু হয়েছে! মেসেজ আসলে উপর থেকে নোটিফিকেশন পাবেন।
            </span>
          </div>
        </div>
      )}
    </>
  );
};
