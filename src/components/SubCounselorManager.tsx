import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Shield, Key, Loader2, Phone, User, Trash2, ShieldAlert } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

interface SubCounselorManagerProps {
  mainCounselor: UserProfile;
}

export const SubCounselorManager: React.FC<SubCounselorManagerProps> = ({ mainCounselor }) => {
  const [subCounselor, setSubCounselor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password reset state
  const [showPassReset, setShowPassReset] = useState(false);
  const [newPass, setNewPass] = useState('');

  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (mainCounselor.counselorGroupId) {
      fetchSubCounselor();
    }
  }, [mainCounselor.counselorGroupId]);

  const initializeGroup = async () => {
    setIsInitializing(true);
    try {
      const groupId = `GROUP_${Math.floor(1000 + Math.random() * 9000)}`;
      await updateDoc(doc(db, 'users', mainCounselor.uid), {
        counselorGroupId: groupId,
        referralCode: groupId,
        role: 'main_counselor'
      });
      // Force a reload or update parent state if possible, 
      // but since we're using the prop, we might need the user to reopen the modal 
      // or we can just use a local state for the group ID to proceed.
      window.location.reload(); // Simplest way to ensure all state is consistent for this one-time setup
    } catch (err) {
      setError('সিস্টেম ইনিশিয়ালাইজ করা সম্ভব হয়নি।');
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchSubCounselor = async () => {
    if (!mainCounselor.counselorGroupId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('counselorGroupId', '==', mainCounselor.counselorGroupId),
        where('role', '==', 'sub_counselor')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSubCounselor(snap.docs[0].data() as UserProfile);
      } else {
        setSubCounselor(null);
      }
    } catch (err) {
      console.error('Error fetching sub counselor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError('সবগুলো তথ্য পূরণ করুন।');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const cleanPhone = phone.replace(/[^\d]/g, '');
      const subUid = `sub_counselor_${cleanPhone}`;
      const now = new Date().toISOString();

      const newSub: UserProfile = {
        uid: subUid,
        name: name.trim(),
        phone: phone.trim(),
        isBlocked: false,
        isOnline: false,
        isCounselor: true,
        role: 'sub_counselor',
        counselorGroupId: mainCounselor.counselorGroupId,
        parentCounselorId: mainCounselor.uid,
        referralCode: mainCounselor.referralCode,
        counselorPin: password.trim(),
        createdAt: now,
        lastActiveAt: now,
      };

      await setDoc(doc(db, 'users', subUid), newSub);
      setSubCounselor(newSub);
      setSuccess('Sub Counselor সফলভাবে তৈরি হয়েছে!');
      setShowCreateForm(false);
      setName('');
      setPhone('');
      setPassword('');
    } catch (err) {
      console.error('Create sub counselor error:', err);
      setError('তৈরি করা সম্ভব হয়নি।');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCounselor || !newPass.trim()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', subCounselor.uid), {
        counselorPin: newPass.trim()
      });
      setSubCounselor({ ...subCounselor, counselorPin: newPass.trim() });
      setSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!');
      setShowPassReset(false);
      setNewPass('');
    } catch (err) {
      setError('পাসওয়ার্ড পরিবর্তন করা যায়নি।');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!subCounselor) return;
    setSaving(true);
    const newStatus = !subCounselor.isBlocked;
    try {
      await updateDoc(doc(db, 'users', subCounselor.uid), {
        isBlocked: newStatus
      });
      setSubCounselor({ ...subCounselor, isBlocked: newStatus });
    } catch (err) {
      setError('স্ট্যাটাস পরিবর্তন করা যায়নি।');
    } finally {
      setSaving(false);
    }
  };

  if (!mainCounselor.counselorGroupId) {
    return (
      <div className="mt-4 border-t border-slate-100 pt-4 text-center">
        <p className="text-xs text-slate-500 mb-3">সাব কাউন্সিলর সিস্টেম চালু করতে আপনার একাউন্টটি আপডেট করুন।</p>
        <button
          onClick={initializeGroup}
          disabled={isInitializing}
          className="bg-sky-600 text-white rounded-xl px-4 py-2 text-xs font-bold hover:bg-sky-700 transition flex items-center gap-2 mx-auto"
        >
          {isInitializing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
          Setup Counselor Group
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Shield className="h-4 w-4 text-sky-600" />
          <span>Sub Counselor Account</span>
        </h3>
        {!subCounselor && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-sky-700 transition"
          >
            <UserPlus className="h-3 w-3" />
            <span>নতুন Sub Counselor তৈরি করুন</span>
          </button>
        )}
      </div>

      {success && (
        <p className="mb-2 text-xs text-emerald-600 font-semibold text-center">{success}</p>
      )}
      {error && (
        <p className="mb-2 text-xs text-red-600 font-semibold text-center">{error}</p>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-1">নাম</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-1.5 px-3 text-xs"
              placeholder="Sub Counselor-এর নাম"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-1">মোবাইল নাম্বার</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-1.5 px-3 text-xs"
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-1">পাসওয়ার্ড</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-1.5 px-3 text-xs"
              placeholder="লগইন পাসওয়ার্ড"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-sky-600 text-white rounded-xl py-2 text-xs font-bold hover:bg-sky-700"
            >
              {saving ? 'তৈরি হচ্ছে...' : 'Create Sub Counselor'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 border border-slate-200 rounded-xl text-xs"
            >
              বাতিল
            </button>
          </div>
        </form>
      )}

      {subCounselor && (
        <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-700">
              {subCounselor.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-900">{subCounselor.name}</h4>
              <p className="text-[10px] text-slate-500 font-mono">{subCounselor.phone}</p>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${subCounselor.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {subCounselor.isBlocked ? 'Inactive' : 'Active'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowPassReset(!showPassReset)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-white py-2 text-[10px] font-bold text-sky-700 hover:bg-sky-50"
            >
              <Key className="h-3 w-3" />
              Change Password
            </button>
            <button
              onClick={toggleStatus}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[10px] font-bold ${
                subCounselor.isBlocked 
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {subCounselor.isBlocked ? <UserCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {subCounselor.isBlocked ? 'Activate' : 'Deactivate'}
            </button>
          </div>

          {showPassReset && (
            <form onSubmit={handleUpdatePassword} className="mt-3 space-y-2 border-t border-sky-100 pt-3">
              <input
                type="text"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="নতুন পাসওয়ার্ড"
                className="w-full rounded-xl border border-sky-200 py-1.5 px-3 text-xs"
              />
              <button
                type="submit"
                className="w-full bg-sky-600 text-white rounded-xl py-1.5 text-[10px] font-bold"
              >
                পাসওয়ার্ড সেট করুন
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
