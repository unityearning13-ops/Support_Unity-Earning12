import React, { useState } from 'react';
import {
  MessageSquare,
  Bot,
  Users,
  Send,
  ExternalLink,
  X,
  Check,
  Menu,
  Mail,
  Copy,
  Globe,
  Sparkles,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'bot' | 'community' | 'menu';
  onTabChange: (tab: 'home' | 'bot' | 'community' | 'menu') => void;
  onOpenCompanyInfo?: () => void;
  whatsappChannelUrl?: string;
  telegramUrl?: string;
  facebookPageUrl?: string;
  supportEmail?: string;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenCompanyInfo,
  whatsappChannelUrl = 'https://whatsapp.com/channel/0029VbB4RqI3mFY5nkzbCs0প',
  telegramUrl = 'https://t.me/unityearning12',
  facebookPageUrl = 'https://www.facebook.com/unityearning',
  supportEmail = 'unityearning13@gmail.com',
  unreadCount = 0,
}) => {
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const defaultWhatsapp = 'https://whatsapp.com/channel/0029VbB4RqI3mFY5nkzbCs0প';
  const defaultTelegram = 'https://t.me/unityearning12';
  const defaultFacebook = 'https://www.facebook.com/unityearning';
  const defaultEmail = 'unityearning13@gmail.com';

  const finalWhatsappUrl = whatsappChannelUrl || defaultWhatsapp;
  const finalTelegramUrl = telegramUrl || defaultTelegram;
  const finalFacebookUrl = facebookPageUrl || defaultFacebook;
  const finalEmail = supportEmail || defaultEmail;

  const handleCommunityClick = () => {
    onTabChange('community');
    setShowCommunityModal(true);
  };

  const handleMenuClick = () => {
    onTabChange('menu');
    if (onOpenCompanyInfo) {
      onOpenCompanyInfo();
    }
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(finalEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <>
      <div className="fixed md:relative bottom-0 left-0 right-0 z-40 md:z-10 bg-[#111b21] backdrop-blur-md border-t border-[#222d34] shadow-lg select-none shrink-0">
        <div className="mx-auto flex w-full max-w-md md:max-w-none items-center justify-around py-2 px-2 sm:px-3">
          {/* 1. HOME TAB */}
          <button
            onClick={() => onTabChange('home')}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-full transition cursor-pointer ${
              activeTab === 'home'
                ? 'text-white bg-[#00a884]/20 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MessageSquare className={`h-5 w-5 ${activeTab === 'home' ? 'text-[#00a884] fill-[#00a884]/20' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-md animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-0.5">হোম</span>
          </button>

          {/* 2. BOT TAB */}
          <button
            onClick={() => onTabChange('bot')}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-full transition cursor-pointer ${
              activeTab === 'bot'
                ? 'text-white bg-[#00a884]/20 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Bot className={`h-5 w-5 ${activeTab === 'bot' ? 'text-[#00a884] fill-[#00a884]/20' : ''}`} />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a884] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00a884]"></span>
              </span>
            </div>
            <span className="text-[11px] mt-0.5">চ্যাট বট</span>
          </button>

          {/* 3. COMMUNITY TAB (WhatsApp, Telegram, Email, Facebook) */}
          <button
            onClick={handleCommunityClick}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-full transition cursor-pointer ${
              activeTab === 'community'
                ? 'text-white bg-[#00a884]/20 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Users className={`h-5 w-5 ${activeTab === 'community' ? 'text-[#00a884]' : ''}`} />
            </div>
            <span className="text-[11px] mt-0.5">কমিউনিটি</span>
          </button>

          {/* 4. THREE-LINE MENU TAB (কোম্পানি পরিচিতি ও শর্তাবলী - replaces Telegram tab) */}
          <button
            onClick={handleMenuClick}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-full transition cursor-pointer ${
              activeTab === 'menu'
                ? 'text-white bg-[#00a884]/20 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="কোম্পানি সম্পর্কে ও শর্তাবলী"
          >
            <div className="relative flex items-center justify-center">
              <Menu className={`h-5 w-5 ${activeTab === 'menu' ? 'text-[#00a884]' : ''}`} />
            </div>
            <span className="text-[11px] mt-0.5">কোম্পানি</span>
          </button>
        </div>
      </div>

      {/* UNIFIED COMMUNITY MODAL: WHATSAPP, TELEGRAM, EMAIL, FACEBOOK */}
      {showCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#111b21] p-6 shadow-2xl border border-[#222d34] animate-in zoom-in-95 duration-150 text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#222d34] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00a884] text-slate-950 font-black shadow-xs">
                  <Users className="h-5 w-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>অফিশিয়াল কমিউনিটি হাব</span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    আমাদের অফিশিয়াল সোশ্যাল চ্যানেল ও হেল্পলাইন
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCommunityModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-[#202c33] hover:text-white transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content: 1. WhatsApp, 2. Telegram, 3. Facebook, 4. Email */}
            <div className="mt-4 space-y-2.5 max-h-[72vh] overflow-y-auto pr-0.5 pb-2">
              {/* 1. WHATSAPP */}
              <a
                href={finalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-emerald-500/20 bg-[#182a32] hover:bg-[#1e343f] hover:border-emerald-500/40 transition cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00a884] text-slate-950 shadow-xs group-hover:scale-105 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white leading-tight">হোয়াটসঅ্যাপ চ্যানেল</h4>
                    <p className="text-[11px] text-emerald-300/90 mt-0.5 font-medium">অফিশিয়াল কমিউনিটি</p>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#202c33] text-emerald-400 group-hover:bg-[#00a884] group-hover:text-slate-950 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </a>

              {/* 2. TELEGRAM */}
              <a
                href={finalTelegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-sky-500/20 bg-[#152430] hover:bg-[#1c3040] hover:border-sky-500/40 transition cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white leading-tight">টেলিগ্রাম সাপোর্ট</h4>
                    <p className="text-[11px] text-sky-300/90 mt-0.5 font-mono font-medium">@unityearning12</p>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#202c33] text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </a>

              {/* 3. FACEBOOK */}
              <a
                href={finalFacebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-blue-500/20 bg-[#162135] hover:bg-[#1d2c47] hover:border-blue-500/40 transition cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-white leading-tight">ফেসবুক পেজ</h4>
                    <p className="text-[11px] text-blue-300/90 mt-0.5 font-medium">লাইভ আপডেট</p>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#202c33] text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </a>

              {/* 4. EMAIL */}
              <div className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-rose-500/20 bg-[#251b22] hover:bg-[#32232e] hover:border-rose-500/40 transition shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <h4 className="text-sm font-bold text-white leading-tight">সাপোর্ট মেইল</h4>
                    <p className="text-[11px] text-rose-300/90 mt-0.5 font-mono truncate">{finalEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={handleCopyEmail}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#202c33] text-rose-300 hover:bg-[#2a3942] border border-[#222d34] transition cursor-pointer shadow-xs"
                    title="কপি করুন"
                  >
                    {copiedEmail ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a
                    href={`mailto:${finalEmail}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#202c33] text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="mt-4 pt-3 border-t border-[#222d34] flex items-center justify-end">
              <button
                onClick={() => setShowCommunityModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
