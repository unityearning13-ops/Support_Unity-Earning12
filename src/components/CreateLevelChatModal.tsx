import React, { useState } from 'react';
import { X, Plus, Layers, Loader2, Sparkles, FileText, Hash } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, LevelChat } from '../types';

interface CreateLevelChatModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onCreated: (newLevelChat: LevelChat) => void;
}

const LEVEL_PRESETS = [
  { label: 'Level 1', name: 'লেভেল ১: প্রাথমিক আর্নিং প্রশিক্ষণ' },
  { label: 'Level 2', name: 'লেভেল ২: অ্যাডভান্সড ফ্রিল্যান্সিং' },
  { label: 'Level 3', name: 'লেভেল ৩: স্কিল ডেভেলপমেন্ট ও মাস্টারক্লাস' },
  { label: 'VIP Level', name: 'ভিআইপি স্পেশাল আর্নিং গ্রুপ' },
];

const COLOR_PRESETS = [
  'from-teal-600 to-emerald-600',
  'from-sky-600 to-indigo-600',
  'from-violet-600 to-purple-600',
  'from-amber-600 to-orange-600',
  'from-rose-600 to-pink-600',
];

export const CreateLevelChatModal: React.FC<CreateLevelChatModalProps> = ({
  currentUser,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [levelNumber, setLevelNumber] = useState('Level 1');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectPreset = (preset: { label: string; name: string }) => {
    setLevelNumber(preset.label);
    setName(preset.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('অনুগ্রহ করে লেভেল চ্যাটের নাম লিখুন।');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const levelChatId = `level_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newChat: LevelChat = {
        id: levelChatId,
        name: name.trim(),
        levelNumber: levelNumber.trim() || 'Level 1',
        description: description.trim() || 'ইউনিটি আর্নিং অফিশিয়াল লেভেল ট্রেনিং চ্যাট।',
        createdByCounselorId: currentUser.uid,
        createdByCounselorName: currentUser.name,
        createdAt: now,
        updatedAt: now,
        coverColor: selectedColor,
        memberCount: 1,
      };

      await setDoc(doc(db, 'level_chats', levelChatId), newChat);

      onCreated(newChat);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create level chat:', err);
      setError(err instanceof Error ? err.message : 'লেভেল চ্যাট তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                নতুন লেভেল চ্যাট তৈরি করুন
              </h2>
              <p className="text-[11px] text-teal-700 font-medium">
                কাউন্সিলর কন্ট্রোল: {currentUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Quick Presets */}
        <div className="mt-3">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
            সহজ প্রিসেট নির্বাচন করুন
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {LEVEL_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold border transition cursor-pointer ${
                  levelNumber === preset.label
                    ? 'border-teal-500 bg-teal-50 text-teal-900'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-teal-600" />
                  <span className="font-bold">{preset.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              লেভেল নম্বর / ব্যাজ ট্যাগ *
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                maxLength={30}
                placeholder="যেমন: Level 1 বা VIP Batch"
                value={levelNumber}
                onChange={(e) => setLevelNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              লেভেল চ্যাটের পুরো নাম বা বিষয়বস্তু *
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                maxLength={80}
                placeholder="যেমন: লেভেল ১: লাইভ ট্রেনিং ও সাপোর্ট"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              বিবরণ বা দিকনির্দেশনা (ঐচ্ছিক)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <textarea
                rows={2}
                maxLength={200}
                placeholder="এই লেভেলের শিক্ষার্থীদের উদ্দেশ্য ও দিকনির্দেশনা লিখুন..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Color theme selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ব্যানার থিম কালার
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`h-7 w-7 rounded-full bg-gradient-to-tr ${color} transition cursor-pointer ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>লেভেল চ্যাট তৈরি করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
