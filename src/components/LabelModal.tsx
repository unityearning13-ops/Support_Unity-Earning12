import React, { useState } from 'react';
import { ChatLabel, Conversation } from '../types';
import { LABEL_COLORS, createCustomLabel, deleteCustomLabel } from '../utils/labels';
import { Tag, Plus, Check, X, Trash2, Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface LabelModalProps {
  conversation: Conversation;
  labels: ChatLabel[];
  onLabelsUpdated: (newLabels: ChatLabel[]) => void;
  onConversationLabelsChanged: (convId: string, updatedLabels: string[]) => void;
  onClose: () => void;
  counselorId?: string;
}

export const LabelModal: React.FC<LabelModalProps> = ({
  conversation,
  labels,
  onLabelsUpdated,
  onConversationLabelsChanged,
  onClose,
  counselorId,
}) => {
  const [selectedLabels, setSelectedLabels] = useState<string[]>(conversation.labels || []);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('blue');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const availableColors = ['blue', 'emerald', 'amber', 'purple', 'teal', 'rose'];

  const [showManageCategories, setShowManageCategories] = useState(false);

  const handleDeleteLabelCategory = async (lbl: ChatLabel) => {
    if (!confirm(`আপনি কি সত্যি '${lbl.name}' লেবেল ক্যাটাগরিটি স্থায়ীভাবে ডিলিট করতে চান?`)) return;

    setDeletingId(lbl.id);
    try {
      await deleteCustomLabel(lbl.id);
      const updated = labels.filter((l) => l.id !== lbl.id);
      onLabelsUpdated(updated);

      if (selectedLabels.includes(lbl.name)) {
        const next = selectedLabels.filter((l) => l !== lbl.name);
        setSelectedLabels(next);
        await setDoc(
          doc(db, 'conversations', conversation.id),
          {
            id: conversation.id,
            participantIds: conversation.participantIds || [],
            labels: next,
          },
          { merge: true }
        );
        onConversationLabelsChanged(conversation.id, next);
      }
    } catch (err) {
      console.error('Error deleting label category:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllLabelCategories = async () => {
    if (!confirm('আপনি কি সত্যি সবগুলো লেবেল ক্যাটাগরি স্থায়ীভাবে ডিলিট করতে চান?')) return;

    setSaving(true);
    try {
      for (const lbl of labels) {
        await deleteCustomLabel(lbl.id);
      }
      onLabelsUpdated([]);
      setSelectedLabels([]);
      await setDoc(
        doc(db, 'conversations', conversation.id),
        {
          id: conversation.id,
          participantIds: conversation.participantIds || [],
          labels: [],
        },
        { merge: true }
      );
      onConversationLabelsChanged(conversation.id, []);
    } catch (err) {
      console.error('Error clearing all label categories:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLabel = async (labelName: string) => {
    let next: string[];
    if (selectedLabels.includes(labelName)) {
      next = selectedLabels.filter((l) => l !== labelName);
    } else {
      next = [...selectedLabels, labelName];
    }
    setSelectedLabels(next);

    try {
      await setDoc(
        doc(db, 'conversations', conversation.id),
        {
          id: conversation.id,
          participantIds: conversation.participantIds || [],
          labels: next,
        },
        { merge: true }
      );
      onConversationLabelsChanged(conversation.id, next);
    } catch (err) {
      console.error('Failed to update labels on conversation:', err);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    setSaving(true);
    try {
      const created = await createCustomLabel(newLabelName.trim(), newLabelColor, counselorId);
      const updated = [...labels, created];
      onLabelsUpdated(updated);

      // Auto-assign to current conversation
      const next = [...selectedLabels, created.name];
      setSelectedLabels(next);
      await setDoc(
        doc(db, 'conversations', conversation.id),
        {
          id: conversation.id,
          participantIds: conversation.participantIds || [],
          labels: next,
        },
        { merge: true }
      );
      onConversationLabelsChanged(conversation.id, next);

      setNewLabelName('');
      setShowAddCustom(false);
    } catch (err) {
      console.error('Error creating custom label:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">হোয়াটসঅ্যাপ লেবেল সেট করুন</h3>
              <p className="text-[11px] text-slate-500">চ্যাটটি নির্দিষ্ট গ্রুপ বা ক্যাটাগরিতে রাখুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher Header Info */}
        <div className="mt-3 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-[11px] font-bold text-slate-700">
            {showManageCategories ? 'ক্যাটাগরি ম্যানেজমেন্ট' : 'ইউজারের লেবেল পরিবর্তন'}
          </span>
          <button
            type="button"
            onClick={() => {
              setShowManageCategories(!showManageCategories);
              setShowAddCustom(false);
            }}
            className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-lg transition cursor-pointer border border-teal-200"
          >
            {showManageCategories ? '← লেবেল সিলেক্টে ফিরুন' : 'ক্যাটাগরি ডিলিট অপশন (আলাদা)'}
          </button>
        </div>

        {/* 1. SEPARATE CATEGORY MANAGEMENT MODE */}
        {showManageCategories ? (
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-800 font-medium">
              সতর্কতা: এখান থেকে লেবেল ডিলিট করলে সম্পূর্ণ সিস্টেম থেকে ওই লেবেল ক্যাটাগরিটি মুছে যাবে।
            </div>

            {labels.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">কোনো লেবেল ক্যাটাগরি তৈরি করা নেই।</p>
            ) : (
              labels.map((lbl) => {
                const colorConfig = LABEL_COLORS[lbl.color] || LABEL_COLORS.blue;
                const isDeletingThis = deletingId === lbl.id;

                return (
                  <div key={lbl.id} className="flex items-center justify-between rounded-xl p-2 bg-white border border-slate-200 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${colorConfig.badge.split(' ')[0]}`} />
                      <span className="text-slate-800 font-bold">{lbl.name}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isDeletingThis}
                      onClick={() => handleDeleteLabelCategory(lbl)}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                      title="লেবেল ক্যাটাগরিটি স্থায়ীভাবে ডিলিট করুন"
                    >
                      {isDeletingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>ক্যাটাগরি ডিলিট</span>
                    </button>
                  </div>
                );
              })
            )}

            {labels.length > 0 && (
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteAllLabelCategories}
                className="mt-3 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center justify-center gap-1 w-full py-1 transition cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>সবগুলো লেবেল ক্যাটাগরি ডিলিট করুন</span>
              </button>
            )}
          </div>
        ) : (
          /* 2. REGULAR USER LABEL ASSIGNMENT MODE */
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
            {labels.length === 0 && !showAddCustom && (
              <p className="text-center text-xs text-slate-500 py-4">
                কোনো লেবেল তৈরি করা হয়নি। নিচে ক্লিক করে নতুন লেবেল যুক্ত করুন।
              </p>
            )}
            {labels.map((lbl) => {
              const isSelected = selectedLabels.includes(lbl.name);
              const colorConfig = LABEL_COLORS[lbl.color] || LABEL_COLORS.blue;

              return (
                <button
                  key={lbl.id}
                  type="button"
                  onClick={() => handleToggleLabel(lbl.name)}
                  className={`w-full flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-semibold border transition cursor-pointer active:scale-98 ${
                    isSelected
                      ? `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} shadow-2xs`
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title={isSelected ? 'লেবেল থেকে ইউজার সরাতে ক্লিক করুন' : 'ইউজারকে এই লেবেলে যুক্ত করতে ক্লিক করুন'}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-3 w-3 rounded-full shrink-0 ${colorConfig.badge.split(' ')[0]}`} />
                    <span className="truncate font-bold">{lbl.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-white/80 px-2 py-0.5 rounded-full border border-teal-300 text-teal-800">
                        <Check className="h-3 w-3 text-teal-600" />
                        <span>সংযুক্ত আছে (সরাতে চাপুন)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        যুক্ত করতে চাপুন
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Add Custom Label Toggle */}
        {!showAddCustom ? (
          <button
            onClick={() => setShowAddCustom(true)}
            className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/40 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>নতুন লেবেল তৈরি করুন</span>
          </button>
        ) : (
          <form onSubmit={handleCreateNew} className="mt-3.5 rounded-2xl border border-teal-200 bg-teal-50/50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-900">নতুন লেবেল নাম</span>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                বাতিল
              </button>
            </div>

            <input
              type="text"
              required
              maxLength={30}
              placeholder="লেবেল নাম (যেমন: VIP স্টুডেন্ট)"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
            />

            {/* Color picker */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-medium">রং:</span>
              <div className="flex items-center gap-1.5">
                {availableColors.map((color) => {
                  const cfg = LABEL_COLORS[color] || LABEL_COLORS.blue;
                  const isColorSelected = newLabelColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      className={`h-5 w-5 rounded-full ${cfg.badge.split(' ')[0]} flex items-center justify-center transition cursor-pointer ${
                        isColorSelected ? 'ring-2 ring-offset-1 ring-slate-700 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {isColorSelected && <Check className="h-3 w-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition cursor-pointer shadow-xs"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>লেবেল যুক্ত করুন</span>
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            সম্পন্ন
          </button>
        </div>
      </div>
    </div>
  );
};
