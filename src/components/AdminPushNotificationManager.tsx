import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Volume2,
  Radio,
  Eye,
} from 'lucide-react';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  isNotificationSupported,
  requestPushPermission,
  triggerAppNotification,
  playNotificationSound,
} from '../utils/notifications';

interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  targetRole?: 'all' | 'students' | 'counselors';
  senderName?: string;
  createdAt: string;
}

export const AdminPushNotificationManager: React.FC = () => {
  // 1. Instant Push Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'students' | 'counselors'>('all');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  // 2. Auto Push Scheduler State
  const [autoPushEnabled, setAutoPushEnabled] = useState(false);
  const [autoPushInterval, setAutoPushInterval] = useState(60); // minutes (60 min = 1 hour)
  const [autoPushTitle, setAutoPushTitle] = useState('Unity Earning লাইভ আপডেট');
  const [autoPushMessage, setAutoPushMessage] = useState(
    '🔥 আজকের ফ্রি লাইভ ট্রেনিং ক্লাস ও ইনকাম প্রজেক্ট দেখতে আপনার কাউন্সিলরের ইনবক্সে মেসেজ দিন!'
  );
  const [savingAutoPush, setSavingAutoPush] = useState(false);
  const [autoPushSuccess, setAutoPushSuccess] = useState('');

  // 3. History State
  const [historyList, setHistoryList] = useState<BroadcastNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 4. Permission State
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermissionState(Notification.permission);
    }
    loadAutoPushConfig();
    loadHistory();
  }, []);

  const loadAutoPushConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'autoPushConfig'));
      if (snap.exists()) {
        const data = snap.data();
        setAutoPushEnabled(!!data.enabled);
        if (data.intervalMinutes) setAutoPushInterval(data.intervalMinutes);
        if (data.title) setAutoPushTitle(data.title);
        if (data.message) setAutoPushMessage(data.message);
      }
    } catch (e) {
      console.warn('Auto push config load notice:', e);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'broadcast_notifications'),
        orderBy('createdAt', 'desc'),
        limit(15)
      );
      const snap = await getDocs(q);
      const list: BroadcastNotification[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BroadcastNotification);
      });
      setHistoryList(list);
    } catch (e) {
      console.warn('History load notice:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Test notification on admin's device
  const handleTestNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert('টেস্ট করার জন্য প্রথমে একটি শিরোনাম এবং বার্তা লিখুন।');
      return;
    }
    if (!isNotificationSupported()) {
      alert('আপনার ব্রাউজার পুশ নোটিফিকেশন সাপোর্ট করে না।');
      return;
    }
    if (Notification.permission !== 'granted') {
      const p = await requestPushPermission();
      setPermissionState(p);
      if (p !== 'granted') {
        alert('অনুগ্রহ করে ব্রাউজারে নোটিফিকেশন পারমিশন দিন।');
        return;
      }
    }

    triggerAppNotification({
      title: title.trim(),
      message: message.trim(),
      senderName: 'চিফ এডমিন',
      type: 'broadcast',
    });
  };

  // Send Broadcast Push Notification to all users
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setSendError('অনুগ্রহ করে নোটিফিকেশনের শিরোনাম এবং বার্তা লিখুন।');
      return;
    }

    setSending(true);
    setSendSuccess('');
    setSendError('');

    try {
      const now = new Date().toISOString();
      const newDoc = {
        title: title.trim(),
        message: message.trim(),
        targetRole,
        senderName: 'Unity Earning Admin',
        createdAt: now,
      };

      const docRef = await addDoc(collection(db, 'broadcast_notifications'), newDoc);

      // Trigger locally as well
      triggerAppNotification({
        title: title.trim(),
        message: message.trim(),
        senderName: 'Unity Earning Admin',
        type: 'broadcast',
      });

      setSendSuccess('সবার ব্রাউজারে সফলভাবে পুশ নোটিফিকেশন পাঠানো হয়েছে!');
      setTitle('');
      setMessage('');
      setHistoryList((prev) => [{ id: docRef.id, ...newDoc }, ...prev]);
      setTimeout(() => setSendSuccess(''), 5000);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'নোটিফিকেশন পাঠানো ব্যর্থ হয়েছে');
    } finally {
      setSending(false);
    }
  };

  // Save Auto Push Schedule
  const handleSaveAutoPush = async () => {
    setSavingAutoPush(true);
    setAutoPushSuccess('');
    try {
      await setDoc(
        doc(db, 'settings', 'autoPushConfig'),
        {
          enabled: autoPushEnabled,
          intervalMinutes: Number(autoPushInterval),
          title: autoPushTitle.trim(),
          message: autoPushMessage.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setAutoPushSuccess('অটো পুশ নোটিফিকেশন শিডিউল সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setAutoPushSuccess(''), 4000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'শিডিউল সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setSavingAutoPush(false);
    }
  };

  // Delete notification from history
  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'broadcast_notifications', id));
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.warn('Delete error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PERMISSION & STATUS HEADER */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  ক্রোম ব্রাউজার পুশ নোটিফিকেশন সিস্টেম
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    permissionState === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {permissionState === 'granted' ? 'ক্রোমে সক্রিয় (Allowed)' : 'অনুমতি প্রয়োজন (Default)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                সরাসরি ব্যবহারকারীর ফোনের ক্রোম নোটিফিকেশন বারে ও লক স্ক্রিনে পুশ মেসেজ পৌঁছাবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {permissionState !== 'granted' && (
              <button
                type="button"
                onClick={async () => {
                  const p = await requestPushPermission();
                  setPermissionState(p);
                  if (p === 'granted') {
                    triggerAppNotification({
                      title: 'Unity Earning',
                      message: 'ক্রোম ব্রাউজারে নোটিফিকেশন সফলভাবে চালু হয়েছে!',
                      type: 'system',
                    });
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-500 transition cursor-pointer shadow-md shadow-teal-600/30"
              >
                <Bell className="h-4 w-4" />
                <span>ক্রোমে অনুমতি দিন</span>
              </button>
            )}

            <button
              onClick={handleTestNotification}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            >
              <Volume2 className="h-4 w-4 text-sky-400" />
              <span>ক্রোম টেস্ট নোটিফিকেশন পাঠান</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* 2. INSTANT BROADCAST PUSH NOTIFICATION */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="h-4 w-4 text-rose-400 animate-pulse" />
              <span>তাৎক্ষণিক পুশ নোটিফিকেশন ব্রডকাস্ট</span>
            </h4>
            <span className="text-[11px] text-slate-400">সবার ডিভাইসে লাইভ পৌঁছাবে</span>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                নোটিফিকেশন শিরোনাম (Title):
              </label>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="যেমন: আজকের লাইভ স্পেশাল সেমিনার রাত ৯টায়!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                নোটিফিকেশন বার্তা (Message / Body):
              </label>
              <textarea
                required
                rows={3}
                maxLength={250}
                placeholder="যেমন: সম্মানিত শিক্ষার্থী, আজকের লাইভ জুম সেমিনারে জয়েন করতে এখনই আপনার অফিশিয়াল কাউন্সিলরকে ইনবক্সে মেসেজ দিন।"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-500 focus:outline-none transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                প্রাপক নির্বাচন (Target Audience):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'সবার কাছে' },
                  { id: 'students', label: 'শুধু স্টুডেন্ট' },
                  { id: 'counselors', label: 'শুধু কাউন্সিলর' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTargetRole(opt.id as 'all' | 'students' | 'counselors')}
                    className={`rounded-xl border py-2 text-center text-xs font-bold transition cursor-pointer ${
                      targetRole === opt.id
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Card */}
            {(title.trim() || message.trim()) && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-1 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                  <Eye className="h-3 w-3" />
                  <span>ডিভাইসের স্ক্রিনে যেমন নোটিফিকেশন দেখাবে:</span>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white font-bold text-xs">
                    UE
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {title || 'নোটিফিকেশন শিরোনাম'}
                    </p>
                    <p className="text-[11px] text-slate-300 truncate">
                      {message || 'নোটিফিকেশন বিস্তারিত বার্তা...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {sendSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{sendSuccess}</span>
              </div>
            )}

            {sendError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 p-3 text-xs text-red-400 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>সবার ব্রাউজারে নোটিফিকেশন পাঠান (Send Push)</span>
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* 3. AUTO SCHEDULED PUSH NOTIFICATIONS */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>অটোমেটিক পুশ নোটিফিকেশন শিডিউলার</span>
            </h4>
            <span className="text-[11px] text-slate-400">নিয়মিত ইন্টারভেলে শো করবে</span>
          </div>

          <div className="space-y-4">
            {/* Toggle switch */}
            <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 p-3.5">
              <div>
                <span className="text-xs font-bold text-white block">
                  অটো পুশ নোটিফিকেশন স্ট্যাটাস
                </span>
                <span className="text-[11px] text-slate-400">
                  {autoPushEnabled
                    ? 'বর্তমানে সক্রিয় — ইউজারদের নির্দিষ্ট সময় পরপর নোটিফিকেশন দেওয়া হবে।'
                    : 'বর্তমানে বন্ধ রয়েছে।'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAutoPushEnabled(!autoPushEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                  autoPushEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    autoPushEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Interval selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                কত সময় পর পর অটো নোটিফিকেশন আসবে:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 30, label: '৩০ মিনিট' },
                  { value: 60, label: '১ ঘণ্টা' },
                  { value: 120, label: '২ ঘণ্টা' },
                  { value: 180, label: '৩ ঘণ্টা' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setAutoPushInterval(item.value)}
                    className={`rounded-xl border py-2 text-center text-xs font-bold transition cursor-pointer ${
                      autoPushInterval === item.value
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                অটো নোটিফিকেশন শিরোনাম:
              </label>
              <input
                type="text"
                value={autoPushTitle}
                onChange={(e) => setAutoPushTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:border-amber-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                অটো নোটিফিকেশন বার্তা:
              </label>
              <textarea
                rows={3}
                value={autoPushMessage}
                onChange={(e) => setAutoPushMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:border-amber-500 focus:outline-none transition resize-none"
              />
            </div>

            {autoPushSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{autoPushSuccess}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveAutoPush}
              disabled={savingAutoPush}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-600/30 hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
            >
              {savingAutoPush ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>অটো পুশ শিডিউল সংরক্ষণ করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. RECENT BROADCAST HISTORY */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="h-4 w-4 text-sky-400" />
            <span>সাম্প্রতিক পাঠানো নোটিফিকেশনের হিস্ট্রি</span>
          </h4>
          <span className="text-xs text-slate-400">মোট: {historyList.length} টি</span>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>হিস্ট্রি লোড হচ্ছে...</span>
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            এখনো কোনো ব্রডকাস্ট নোটিফিকেশন পাঠানো হয়নি।
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {historyList.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {item.title}
                    </span>
                    <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                      {item.targetRole === 'students'
                        ? 'স্টুডেন্ট'
                        : item.targetRole === 'counselors'
                        ? 'কাউন্সিলর'
                        : 'সকলের জন্য'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.message}
                  </p>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(item.createdAt).toLocaleString('bn-BD')}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteHistory(item.id)}
                  className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
