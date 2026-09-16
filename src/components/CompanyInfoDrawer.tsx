import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  Headphones,
  FileText,
  Video,
  MessageSquare,
  Sparkles,
  BookOpen,
  TrendingUp,
  Building2,
  Check,
  ChevronRight,
  Layers,
  ArrowUpRight,
  GraduationCap,
} from 'lucide-react';

interface CompanyInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCounselorChat?: () => void;
  companyLogoUrl?: string;
}

export const CompanyInfoDrawer: React.FC<CompanyInfoDrawerProps> = ({
  isOpen,
  onClose,
  onOpenCounselorChat,
  companyLogoUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'benefits' | 'terms'>('about');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-slate-950/70 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="flex h-full max-h-screen sm:max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden bg-white sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200/80 animate-in slide-in-from-right duration-200">
        {/* EXECUTIVE HEADER */}
        <div className="relative border-b border-slate-100 bg-slate-900 px-6 py-5 text-white shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {companyLogoUrl ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-lg shadow-teal-500/10">
                  <img src={companyLogoUrl} alt="Company Logo" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-black shadow-lg shadow-teal-500/20">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                    Unity Earning
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    <span>ভেরিফাইড প্ল্যাটফর্ম</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  স্কিল ডেভেলপমেন্ট ও ডিজিটাল ক্যারিয়ার নেটওয়ার্ক
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
              title="বন্ধ করুন"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* PROFESSIONAL SEGMENTED TABS */}
          <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-800/90 p-1 border border-slate-700/60">
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">কোম্পানি পরিচিতি</span>
            </button>

            <button
              onClick={() => setActiveTab('benefits')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'benefits'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">সুবিধা ও সাপোর্ট</span>
            </button>

            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">টার্মস ও নীতিমালা</span>
            </button>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50 text-slate-800 text-sm leading-relaxed space-y-6">
          {/* TAB 1: ABOUT COMPANY */}
          {activeTab === 'about' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Mission Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider mb-2">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  <span>আমাদের লক্ষ্য ও পরিচয়</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  দক্ষতা উন্নয়ন ও কর্মসংস্থানের সমন্বয়ে তৈরি একটি প্রফেশনাল ই-লার্নিং নেটওয়ার্ক
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-normal">
                  Unity Earning একটি আধুনিক প্ল্যাটফর্ম যা শিক্ষার্থীদের বাস্তব কাজের উপযোগী স্কিল শেখায় এবং নিয়মিত তত্ত্বাবধানের মাধ্যমে তাদেরকে ডিজিটাল ক্যারিয়ারে স্বাবলম্বী হওয়ার পূর্ণ দিকনির্দেশনা দেয়।
                </p>
              </div>

              {/* BENTO STATS GRID */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                  <span>মূল পরিসংখ্যান ও অভিজ্ঞতা</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">৬,৫০০+</div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">সক্রিয় লার্নার</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">সফলভাবে স্কিল অর্জন ও কাজে যুক্ত</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">১,০০০+</div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">টিম ও মেন্টর প্যানেল</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">প্রশিক্ষক ও সার্বক্ষণিক সহায়ক টিম</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="text-2xl font-black text-teal-700 tracking-tight">৪০০ - ৫০০+ ৳</div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">দৈনিক ইনকাম সুযোগ</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">নিয়মিত কাজের ভিত্তিতে অর্জিত</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">লাইফটাইম</div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">রিসোর্স এক্সেস</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">আপডেটেড ফাইল ও গাইডলাইন</div>
                  </div>
                </div>
              </div>

              {/* CORE PILLARS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>আমাদের মূল ভিত্তি ও বৈশিষ্ট্য</span>
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="h-5 w-5 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      ১
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">সরকারি সনদ ও অনুমোদন সাপেক্ষে পরিচালিত</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        আমাদের সকল প্রাতিষ্ঠানিক কার্যক্রম নিয়মমাফিক ও বৈধ নীতিমালার অধীনে পরিচালিত।
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="h-5 w-5 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      ২
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">হাতে-কলমে কাজের অভিজ্ঞতা</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        থিওরির পাশাপাশি সরাসরি প্র্যাকটিক্যাল অ্যাসাইনমেন্ট ও রিয়েল লাইফ টাস্ক করানো হয়।
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="h-5 w-5 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      ৩
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">উন্মুক্ত কাজের সুযোগ</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        বয়স বা পূর্ব অভিজ্ঞতার সীমাবদ্ধতা নেই; শুধুমাত্র আগ্রহ ও পরিশ্রমের মাধ্যমে ঘরে বসেই শেখা সম্ভব।
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEMINAR & COUNSELOR ACTION */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 p-5 text-white shadow-lg border border-slate-800">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      লাইভ সেমিনার ও কাউন্সিলিং সহায়তা
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-normal">
                      কোর্সের রূপরেখা এবং ইনকামের ধাপগুলো সরাসরি দেখতে আপনার নির্ধারিত কাউন্সিলরের সাথে কথা বলে আমাদের গুগল মিট বা জুম মিটিংয়ে যুক্ত হতে পারেন।
                    </p>
                  </div>
                </div>

                {onOpenCounselorChat && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCounselorChat();
                    }}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 py-2.5 px-4 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>কাউন্সিলরের সাথে কথা বলুন</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BENEFITS & SUPPORT */}
          {activeTab === 'benefits' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Courses Advantages */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                  <BookOpen className="h-4 w-4 text-teal-600" />
                  <span>কোর্সের প্রধান সুবিধাসমূহ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>আপডেটেড সিলেবাস</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      বর্তমান ডিজিটাল মার্কেটপ্লেস ও কাজের চাহিদানুযায়ী মডিউল সাজানো।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>প্র্যাকটিক্যাল প্রজেক্ট</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      ক্লাসের প্রতিটি বিষয়ে সরাসরি হাতে-কলমে অনুশীলন করানো হয়।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>লাইফটাইম রিসোর্স এক্সেস</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      প্রয়োজনীয় টুলস, ডকুমেন্ট ও মেটেরিয়াল যেকোনো সময় ব্যবহারের সুবিধা।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>ইনকাম রোডম্যাপ</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                      স্কিল শেখার পর কীভাবে ক্লায়েন্ট পাবেন ও আয় শুরু করবেন তার বিস্তারিত গাইড।
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-TIER SUPPORT ARCHITECTURE */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <Headphones className="h-4 w-4 text-emerald-600" />
                    <span>৩ স্তরের ডেডিকেটেড সাপোর্ট সিস্টেম</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    সার্বক্ষণিক সক্রিয়
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Level 1: Trainer */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
                    <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ১
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Trainer (প্রশিক্ষক)</span>
                        <span className="text-[10px] font-medium text-emerald-700">স্কিল মেন্টরিং</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        স্টেপ-বাই-স্টেপ স্কিল শেখানো, বাড়ির কাজ মূল্যায়ন এবং ক্লাসের যেকোনো দুর্বলতা দূরীকরণে সরাসরি সাহায্য করেন।
                      </p>
                    </div>
                  </div>

                  {/* Level 2: Team Leader */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-teal-50/50 border border-teal-100/80">
                    <div className="h-9 w-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ২
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Team Leader (টিম লিডার)</span>
                        <span className="text-[10px] font-medium text-teal-700">অগ্রগতি তদারকি</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        আপনার নিয়মিত কাজের আপডেট নেওয়া, ক্যারিয়ার গাইডলাইন প্রদান এবং দলগত কাজের সঠিক সমন্বয় নিশ্চিত করেন।
                      </p>
                    </div>
                  </div>

                  {/* Level 3: Live Support */}
                  <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-sky-50/50 border border-sky-100/80">
                    <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ৩
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Live Support Team (লাইভ সাপোর্ট)</span>
                        <span className="text-[10px] font-medium text-sky-700">তাৎক্ষণিক সমাধান</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        ইনবক্স ও লাইভ চ্যাট গ্রুপে যেকোনো কারিগরি সমস্যা বা প্ল্যাটফর্ম সংক্রান্ত জিজ্ঞাসায় তাৎক্ষণিক সহায়তা প্রদান করেন।
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <FileText className="h-4 w-4 text-teal-600" />
                  <span>নীতিমালা ও ব্যবহারের শর্তাবলী</span>
                </div>

                <div className="space-y-3.5 text-xs text-slate-600">
                  {/* Rule 1 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-teal-600">১.</span>
                      <span>ভর্তির সাথে অন্তর্ভুক্ত সুবিধাসমূহ</span>
                    </div>
                    <p className="pl-4 text-slate-600">
                      ভর্তির পর শিক্ষার্থী সম্পূর্ণ কোর্স মডিউল, নিয়মিত লাইভ ক্লাস, প্র্যাকটিক্যাল প্রজেক্ট ফাইল এবং টিম সাপোর্ট পাওয়ার সম্পূর্ণ অধিকারী হবেন।
                    </p>
                  </div>

                  {/* Rule 2 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-teal-600">২.</span>
                      <span>নিয়মিত উপস্থিতি ও দায়িত্বশীলতা</span>
                    </div>
                    <p className="pl-4 text-slate-600">
                      কোর্স থেকে ভালো ফলাফল অর্জন করতে হলে ট্রেইনারের দেওয়া নির্দেশনা ও অ্যাসাইনমেন্ট সময়মতো সম্পন্ন করা প্রত্যেক শিক্ষার্থীর দায়িত্ব।
                    </p>
                  </div>

                  {/* Rule 3 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-teal-600">৩.</span>
                      <span>ইনকাম সংক্রান্ত বাস্তবতা ও সততা</span>
                    </div>
                    <p className="pl-4 text-slate-600">
                      আমাদের প্ল্যাটফর্মে কোনো শর্টকাট বা অলৌকিক উপায়ে আয়ের সুযোগ নেই। স্কিল অর্জন এবং নিয়মিত প্র্যাকটিক্যাল কাজের মাধ্যমেই প্রতিটি শিক্ষার্থী আয়ের সুযোগ তৈরি করতে পারবেন।
                    </p>
                  </div>

                  {/* Rule 4 */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-teal-600">৪.</span>
                      <span>একাউন্টের নিরাপত্তা ও শালীনতা</span>
                    </div>
                    <p className="pl-4 text-slate-600">
                      প্ল্যাটফর্মের সহপাঠী ও মেন্টরদের সাথে মার্জিত আচরণ বজায় রাখতে হবে। প্ল্যাটফর্মের কোনো নিয়ম ভঙ্গ করলে কর্তৃপক্ষ যথাযথ ব্যবস্থা নেওয়ার অধিকার সংরক্ষণ করে।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* REFINED CLEAN FOOTER */}
        <div className="border-t border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            <span>Unity Earning</span>
            <span className="mx-1.5 text-slate-300">•</span>
            <span>২০২১ সাল থেকে পরিচালিত</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
