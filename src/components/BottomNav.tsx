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

  const openLinkDirectly = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(finalEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#111b21] backdrop-blur-md border-t border-[#222d34] shadow-lg">
        <div className="mx-auto flex max-w-md items-center justify-around py-2 px-3">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-xs">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>অফিশিয়াল কমিউনিটি হাব</span>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    আমাদের অফিশিয়াল সোশ্যাল চ্যানেল ও হেল্পলাইন
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCommunityModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content: 1. WhatsApp (Top), 2. Telegram (Bottom), 3. Email, 4. Facebook */}
            <div className="mt-4 space-y-3 max-h-[72vh] overflow-y-auto pr-0.5 pb-2">
              {/* 1. WHATSAPP */}
              <button
                onClick={() => openLinkDirectly(finalWhatsappUrl)}
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-200 transition cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-emerald-950 leading-tight">হোয়াটসঅ্যাপ চ্যানেল</h4>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5 font-medium">অফিশিয়াল কমিউনিটি</p>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </button>

              {/* 2. TELEGRAM */}
              <button
                onClick={() => openLinkDirectly(finalTelegramUrl)}
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-sky-100 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-200 transition cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Send className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-sky-950 leading-tight">টেলিগ্রাম সাপোর্ট</h4>
                    <p className="text-[11px] text-sky-700/80 mt-0.5 font-medium">@unityearning12</p>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </button>

              {/* 3. FACEBOOK */}
              <button
                onClick={() => openLinkDirectly(finalFacebookUrl)}
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-blue-950 leading-tight">ফেসবুক পেজ</h4>
                    <p className="text-[11px] text-blue-700/80 mt-0.5 font-medium">লাইভ আপডেট</p>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </div>
              </button>

              {/* 4. EMAIL */}
              <div className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-200 transition shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-rose-950 leading-tight">সাপোর্ট মেইল</h4>
                    <p className="text-[11px] text-rose-700/80 mt-0.5 font-medium">{finalEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyEmail}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-600 hover:bg-rose-100 border border-rose-200 transition cursor-pointer shadow-xs"
                    title="কপি করুন"
                  >
                    {copiedEmail ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a
                    href={`mailto:${finalEmail}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowCommunityModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
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
