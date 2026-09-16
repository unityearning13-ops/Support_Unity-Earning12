import React, { useState, useRef } from 'react';
import { X, Camera, Check, Loader2, Phone, Fingerprint, LogOut, ShieldCheck } from 'lucide-react';
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
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: unknown) {
      console.error('Save profile error:', err);
      setErrorText(err instanceof Error ? err.message : 'প্রোফাইল সেভ করা সম্ভব হয়নি।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div
        id="profile-modal"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-slate-900">আমার প্রোফাইল</h2>
            {currentUser.isCounselor && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                <ShieldCheck className="h-3 w-3" />
                <span>কাউন্সিলর</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center">
          {/* Avatar Upload */}
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-slate-200 bg-sky-100 flex items-center justify-center font-bold text-sky-700 text-2xl shadow-sm">
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
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white shadow-md hover:bg-sky-700 transition cursor-pointer"
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

        <form onSubmit={handleSave} className="mt-4 space-y-3 pb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              আপনার নাম
            </label>
            <input
              id="profile-name-input"
              type="text"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-mono text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition shadow-2xs"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              আপনি চাইলে নাম ও ফোন নাম্বার পরিবর্তন করে নিতে পারবেন।
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              আইডি কোড
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 py-1.5 px-3 text-[11px] text-slate-500">
              <Fingerprint className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-mono truncate">{currentUser.uid}</span>
            </div>
          </div>

          {(currentUser.isCounselor || currentUser.uid.startsWith('counselor')) && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900">আপনার নিজস্ব শেয়ার লিংক</span>
                <span className="text-[10px] bg-teal-200 text-teal-800 font-semibold px-2 py-0.5 rounded-full">কাউন্সিলর</span>
              </div>
              <p className="text-[10px] text-teal-700">
                শিক্ষার্থীদের সাথে এই লিংক শেয়ার করলে তারা সরাসরি আপনার চ্যাটে যুক্ত হবে।
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/ref/${encodeURIComponent(currentUser.referralCode || currentUser.uid)}`}
                  className="flex-1 rounded-lg border border-teal-200 bg-white px-2 py-1 text-[10px] font-mono text-teal-900 truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/ref/${encodeURIComponent(currentUser.referralCode || currentUser.uid)}`);
                    alert('কাউন্সিলর শেয়ার লিংক কপি করা হয়েছে!');
                  }}
                  className="rounded-lg bg-teal-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-teal-700 transition cursor-pointer"
                >
                  কপি
                </button>
              </div>
            </div>
          )}

          {errorText && (
            <p className="text-xs text-red-600 font-medium">{errorText}</p>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold justify-center">
              <Check className="h-4 w-4" />
              <span>প্রোফাইল সফলভাবে আপডেট হয়েছে!</span>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>সংরক্ষণ করুন</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-200 px-3 py-2 text-xs font-medium text-slate-600 transition cursor-pointer"
              title="লগআউট"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>লগআউট</span>
            </button>
          </div>
        </form>

        {(currentUser.role === 'main_counselor' || (currentUser.isCounselor && currentUser.role !== 'sub_counselor')) && (
          <div className="pb-8">
            <SubCounselorManager mainCounselor={currentUser} />
          </div>
        )}
      </div>
    </div>
  );
};
