import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Phone, X, MessageSquare, GraduationCap, CheckCircle2 } from 'lucide-react';

interface PublicCounselorProfileModalProps {
  counselor: UserProfile;
  onClose: () => void;
  onStartChat?: () => void;
}

export const PublicCounselorProfileModal: React.FC<PublicCounselorProfileModalProps> = ({
  counselor,
  onClose,
  onStartChat,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 space-y-0">
        {/* Header banner */}
        <div className="relative bg-gradient-to-tr from-teal-600 to-emerald-500 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full bg-black/20 p-1.5 text-white hover:bg-black/40 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center text-teal-700 font-bold text-2xl">
            {counselor.photoURL ? (
              <img
                src={counselor.photoURL}
                alt={counselor.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <GraduationCap className="h-10 w-10 text-teal-600" />
            )}
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
          </div>

          <h3 className="mt-3 text-base font-bold text-white flex items-center justify-center gap-1.5">
            <span>{counselor.name}</span>
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
          </h3>
          <p className="text-xs text-teal-100 flex items-center justify-center gap-1 mt-0.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>অফিসিয়াল সেমিনার ও হেল্প কাউন্সিলর</span>
          </p>
        </div>

        {/* Profile Details */}
        <div className="p-5 space-y-4 bg-white">
          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium text-slate-500">অফিসিয়াল ফোন / হোয়াটসঅ্যাপ:</span>
              <span className="font-bold font-mono text-slate-800 flex items-center gap-1">
                <Phone className="h-3 w-3 text-teal-600" />
                {counselor.phone || 'অনির্ধারিত'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
              <span className="font-medium text-slate-500">অনলাইন স্ট্যাটাস:</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                সরাসরি সক্রিয়
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-teal-50/70 p-3.5 border border-teal-100 text-xs text-teal-900 leading-relaxed">
            <p className="font-semibold text-teal-950 mb-1">
              পরিচয় ও সহায়তা:
            </p>
            <p className="text-[11px] text-teal-800">
              আমি ইউনিটি আর্নিং এর একজন সার্টিফাইড কাউন্সিলর। আমাদের সেমিনার, প্রজেক্ট গাইডলাইন এবং পেমেন্ট সংক্রান্তযেকোনো সহায়তায় আপনাকে সাহায্য করতে প্রস্তুত।
            </p>
          </div>

          {onStartChat && (
            <button
              onClick={() => {
                onClose();
                onStartChat();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3 text-xs font-bold text-white hover:bg-teal-700 transition cursor-pointer shadow-md"
            >
              <MessageSquare className="h-4 w-4" />
              <span>সরাসরি চ্যাট শুরু করুন</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
