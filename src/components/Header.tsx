import React, { useState } from 'react';
import {
  MessageSquare,
  UserPlus,
  User,
  Shield,
  ShieldCheck,
  Link,
  Check,
  GraduationCap,
  LogOut,
  Menu,
} from 'lucide-react';
import { UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { generateCounselorLink } from '../utils/counselor';

interface HeaderProps {
  currentUser: UserProfile | null;
  companyLogoUrl?: string;
  onOpenAddContact: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenCounselorDashboard?: () => void;
  onOpenCompanyInfo?: () => void;
  onLogout: () => void;
  isAdminLoggedIn: boolean;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  companyLogoUrl,
  onOpenAddContact,
  onOpenProfile,
  onOpenAdmin,
  onOpenCounselorDashboard,
  onOpenCompanyInfo,
  onLogout,
  isAdminLoggedIn,
  isOnline,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleCopyCounselorLink = () => {
    if (!currentUser) return;
    const link = generateCounselorLink(currentUser.uid);
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const isCounselorAccount = currentUser?.isCounselor && !isAdminLoggedIn;
  const isAnyUserLoggedIn = !!currentUser || isAdminLoggedIn;

  return (
    <>
      <header
        id="main-header"
        className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#222d34] bg-[#111b21] px-3 sm:px-4 shadow-sm shrink-0 text-white select-none"
      >
        {/* Brand Title */}
        <div className="flex items-center gap-2.5 min-w-0 shrink sm:shrink-0">
          {companyLogoUrl ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden border border-[#222d34] bg-[#202c33] shadow-xs">
              <img src={companyLogoUrl} alt="Company Logo" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-slate-950 font-black shadow-xs">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate whitespace-nowrap">
                Unity Earning Live Chat
              </h1>
              {currentUser?.isCounselor && (
                <span className="hidden md:inline-flex items-center gap-0.5 rounded-full bg-[#00a884]/20 border border-[#00a884]/30 px-2 py-0.5 text-[9px] font-bold text-[#00a884] shrink-0">
                  <GraduationCap className="h-2.5 w-2.5" />
                  <span>কাউন্সিলর</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-slate-400 whitespace-nowrap">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  isOnline ? 'bg-[#00a884] animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-slate-300">{isOnline ? 'অনলাইন' : 'অফলাইন'}</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <PWAInstallButton />

          {/* If logged in as Counselor: Counselor Dashboard & Quick share link */}
          {currentUser?.isCounselor && (
            <>
              {onOpenCounselorDashboard && (
                <button
                  onClick={onOpenCounselorDashboard}
                  className="flex h-8 items-center gap-1 rounded-xl bg-gradient-to-r from-teal-600 to-[#00a884] px-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition cursor-pointer shrink-0"
                  title="কাউন্সিলর ড্যাশবোর্ড"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">ড্যাশবোর্ড</span>
                </button>
              )}

              <button
                onClick={handleCopyCounselorLink}
                className={`flex h-8 items-center gap-1 rounded-xl px-2 sm:px-2.5 text-xs font-bold transition cursor-pointer shrink-0 ${
                  linkCopied
                    ? 'bg-[#00a884] text-slate-950 font-extrabold'
                    : 'bg-[#202c33] text-teal-300 border border-[#222d34] hover:bg-[#2a3942]'
                }`}
                title="শেয়ার লিংক কপি করুন"
              >
                {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Link className="h-3.5 w-3.5 text-teal-400" />}
                <span className="hidden sm:inline">{linkCopied ? 'কপি হয়েছে!' : 'আমার লিংক'}</span>
              </button>
            </>
          )}

          {currentUser && !currentUser.counselorId && !currentUser.isCounselor && (
            <button
              id="header-add-contact-btn"
              onClick={onOpenAddContact}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-[#222d34] bg-[#202c33] hover:bg-[#2a3942] text-slate-200 px-2.5 text-xs font-semibold transition cursor-pointer shrink-0"
              title="নতুন চ্যাট"
            >
              <UserPlus className="h-3.5 w-3.5 text-[#00a884]" />
              <span className="hidden md:inline">নতুন চ্যাট</span>
            </button>
          )}

          {currentUser && (
            <button
              id="header-profile-btn"
              onClick={onOpenProfile}
              className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-[#222d34] bg-[#202c33] hover:ring-2 hover:ring-[#00a884] transition cursor-pointer shrink-0"
              title="আমার প্রোফাইল"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-slate-300" />
              )}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#111b21] bg-[#00a884]" />
            </button>
          )}

          {/* Admin Button */}
          {!isCounselorAccount && (
            <button
              id="header-admin-btn"
              onClick={onOpenAdmin}
              className={`flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
                isAdminLoggedIn
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'border border-[#222d34] bg-[#202c33] hover:bg-[#2a3942] text-slate-300'
              }`}
              title={isAdminLoggedIn ? 'এডমিন ড্যাশবোর্ড' : 'এডমিন লগইন'}
            >
              {isAdminLoggedIn ? (
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Shield className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">এডমিন</span>
            </button>
          )}

          {/* Top Logout Option */}
          {isAnyUserLoggedIn && (
            <button
              id="header-logout-btn"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex h-8 items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 sm:px-2.5 text-xs font-bold transition cursor-pointer shrink-0"
              title="লগআউট করুন"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">লগআউট</span>
            </button>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#111b21] p-5 shadow-2xl border border-[#222d34] space-y-4 text-slate-100">
            <div className="flex items-center gap-3 text-red-400">
              <div className="rounded-full bg-red-500/15 p-2.5 border border-red-500/30">
                <LogOut className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">লগআউট নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-400">
                  আপনি কি নিশ্চিত যে আপনার একাউন্ট থেকে বের হতে চান?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-[#222d34] bg-[#202c33] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-[#2a3942] transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer shadow-xs"
              >
                <span>ওকে</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
