import React from 'react';
import { ShieldAlert, Ban, AlertTriangle, Lock, RefreshCw } from 'lucide-react';

interface BlockedScreenProps {
  userName?: string;
  ipAddress?: string;
  deviceId?: string;
  blockedAt?: string;
  reason?: string;
  supportPhone?: string;
  onLogout?: () => void;
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
  userName,
  ipAddress,
  deviceId,
  blockedAt,
  reason,
  supportPhone,
  onLogout,
}) => {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[#070b0e] p-4 select-none">
      <div className="relative flex w-full max-w-md flex-col items-center justify-center rounded-2xl bg-[#111b21] p-6 text-center border border-red-500/30 shadow-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Security Ban Icon */}
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-950/70 border border-red-500/40 text-red-500 shadow-inner">
          <Ban className="h-10 w-10 stroke-[2.2]" />
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
            <Lock className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">
          আপনার আইপিটি ব্লক করা হয়েছে
        </h1>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/20 mb-4">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>ডিভাইস ও আইপি সম্পূর্ণ স্থগিত</span>
        </div>

        {/* Notice Message */}
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300 mb-5">
          নিরাপত্তাজনিত কারণে আপনার এই ডিভাইস এবং আইপি অ্যাড্রেস থেকে আমাদের প্ল্যাটফর্মের ওয়েবসাইট ও যেকোনো রেফারাল লিংকে প্রবেশাধিকার নিষিদ্ধ করা হয়েছে।
        </p>

        {/* Device & IP Details Card */}
        <div className="w-full rounded-xl bg-[#202c33]/70 border border-white/5 p-3.5 text-left text-xs space-y-2 mb-5">
          <div className="flex justify-between items-center text-slate-400">
            <span>আইপি অ্যাড্রেস:</span>
            <span className="font-mono text-slate-200 font-semibold">{ipAddress || 'Checking IP...'}</span>
          </div>
          {deviceId && (
            <div className="flex justify-between items-center text-slate-400">
              <span>ডিভাইস আইডি:</span>
              <span className="font-mono text-slate-300 text-[11px] truncate max-w-[180px]">
                {deviceId.slice(0, 18)}...
              </span>
            </div>
          )}
          {blockedAt && (
            <div className="flex justify-between items-center text-slate-400">
              <span>ব্লকের সময়:</span>
              <span className="text-slate-300">
                {new Date(blockedAt).toLocaleDateString('bn-BD', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-400">
            <span>স্ট্যাটাস:</span>
            <span className="text-red-400 font-bold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              স্থায়ীভাবে স্থগিত
            </span>
          </div>
        </div>

        {/* Security Policy Reminder */}
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-300 text-left mb-5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            কোনো ভিপিএন (VPN) বা অন্য কোনো ব্রাউজার ব্যবহার করলেও এই ডিভাইস থেকে আর প্রবেশ করা সম্ভব হবে না।
          </span>
        </div>

        {/* Support or Reload */}
        <div className="flex flex-col w-full gap-2">
          {supportPhone && (
            <a
              href={`https://wa.me/${supportPhone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a884] py-2.5 text-xs font-bold text-white hover:bg-[#009071] transition cursor-pointer"
            >
              <span>এডমিন সাপোর্টে যোগাযোগ করুন</span>
            </a>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#202c33] py-2.5 text-xs font-semibold text-slate-300 hover:bg-[#2a3942] transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>পেজ রিফ্রেশ করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
