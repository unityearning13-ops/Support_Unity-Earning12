import React, { useState, useRef } from 'react';
import { X, Camera, Check, Loader2, Phone, Fingerprint, LogOut, ShieldCheck, Copy } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { compressImage } from '../utils/media';

import { SubCounselorManager } from './SubCounselorManager';

interface ProfileModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onUpdate: (updated: Partial<UserProfile>) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUser,
  onClose,
  onUpdate,
  onLogout,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorText, setErrorText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorText('');
    try {
      // Compress image to lightweight JPEG Data URL
      const compressedDataUrl = await compressImage(file, 300, 0.7);
      setPhotoURL(compressedDataUrl);
    } catch (err: unknown) {
      console.error('Photo compression error:', err);
      setErrorText('ছবি প্রসেস করা সম্ভব হয়নি। অন্য ছবি দিয়ে চেষ্টা করুন।');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorText('নাম খালি রাখা যাবে না।');
      return;
    }

    const cleanedPhone = phone.trim().replace(/\s+/g, '');
    if (cleanedPhone.length < 10) {
      setErrorText('অনুগ্রহ করে সঠিক ফোন নাম্বার লিখুন।');
      return;
    }

    setSaving(true);
    setErrorText('');
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updates: Partial<UserProfile> = {
        name: name.trim(),
        phone: cleanedPhone,
        photoURL: photoURL || undefined,
        lastActiveAt: new Date().toISOString(),
      };

      try {
        await updateDoc(userRef, updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }

      onUpdate(updates);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: unknown) {
      console.error('Save profile error:', err);
      setErrorText(err instanceof Error ? err.message : 'প্রোফাইল সেভ করা সম্ভব হয়নি।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto select-none">
      <div
        id="profile-modal"
        className="w-full max-w-sm rounded-3xl bg-[#111b21] p-5 sm:p-6 shadow-2xl border border-[#222d34] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto text-white"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#222d34]">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-slate-100">আমার প্রোফাইল</h2>
            {currentUser.isCounselor && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#00a884]/20 border border-[#00a884]/30 px-2 py-0.5 text-[10px] font-bold text-[#00a884]">
                <ShieldCheck className="h-3 w-3" />
                <span>কাউন্সিলর</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-[#202c33] hover:text-slate-200 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center">
          {/* Avatar Upload */}
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[#00a884]/40 bg-[#202c33] flex items-center justify-center font-bold text-[#00a884] text-2xl shadow-md">
              {photoURL ? (
                <img src={photoURL} alt={name} className="h-full w-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase() || 'U'
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#00a884] text-slate-950 shadow-md hover:bg-[#00c298] transition cursor-pointer active:scale-95"
              title="প্রোফাইল ছবি পরিবর্তন করুন"
            >
              {uploadingPhoto ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
          <span className="mt-1.5 text-[11px] text-slate-400">
            ছবি সিলেক্ট করে প্রোফাইল পিকচার সেট করুন
          </span>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-3.5 pb-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              আপনার নাম
            </label>
            <input
              id="profile-name-input"
              type="text"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#222d34] bg-[#202c33] py-2 px-3 text-xs text-slate-100 placeholder-slate-500 focus:border-[#00a884] focus:bg-[#202c33] focus:outline-none transition shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              মোবাইল / হোয়াটসঅ্যাপ নাম্বার
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id="profile-phone-input"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] py-2 pl-9 pr-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-[#00a884] focus:bg-[#202c33] focus:outline-none transition shadow-2xs tabular-nums"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              আপনি চাইলে নাম ও ফোন নাম্বার পরিবর্তন করে নিতে পারবেন।
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              আইডি কোড
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-[#222d34] bg-[#182229] py-1.5 px-3 text-[11px] text-slate-400">
              <Fingerprint className="h-3.5 w-3.5 text-[#00a884] shrink-0" />
              <span className="font-mono truncate select-all">{currentUser.uid}</span>
            </div>
          </div>

          {(currentUser.isCounselor || currentUser.uid.startsWith('counselor')) && (
            <div className="rounded-xl border border-[#00a884]/30 bg-[#202c33]/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">আপনার নিজস্ব শেয়ার লিংক</span>
                <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] font-semibold px-2 py-0.5 rounded-full border border-[#00a884]/30">কাউন্সিলর</span>
              </div>
              <p className="text-[10px] text-slate-300">
                শিক্ষার্থীদের সাথে এই লিংক শেয়ার করলে তারা সরাসরি আপনার চ্যাটে যুক্ত হবে।
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/ref/${encodeURIComponent(currentUser.referralCode || currentUser.uid)}`}
                  className="flex-1 rounded-lg border border-[#2a3942] bg-[#111b21] px-2 py-1.5 text-[10px] font-mono text-slate-200 truncate select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/ref/${encodeURIComponent(currentUser.referralCode || currentUser.uid)}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="rounded-lg bg-[#00a884] hover:bg-[#00c298] px-2.5 py-1.5 text-[10px] font-bold text-slate-950 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedLink ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>
              </div>
            </div>
          )}

          {errorText && (
            <p className="text-xs text-rose-400 font-medium">{errorText}</p>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-[#00a884] font-semibold justify-center">
              <Check className="h-4 w-4" />
              <span>প্রোফাইল সফলভাবে আপডেট হয়েছে!</span>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#00a884] hover:bg-[#00c298] py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50 transition cursor-pointer shadow-xs active:scale-[0.98]"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>সংরক্ষণ করুন</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 px-3 py-2 text-xs font-semibold transition cursor-pointer"
              title="লগআউট"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>লগআউট</span>
            </button>
          </div>
        </form>

        {(currentUser.role === 'main_counselor' || (currentUser.isCounselor && currentUser.role !== 'sub_counselor')) && (
          <div className="pb-4 pt-2 border-t border-[#222d34] mt-2">
            <SubCounselorManager mainCounselor={currentUser} />
          </div>
        )}
      </div>
    </div>
  );
};
