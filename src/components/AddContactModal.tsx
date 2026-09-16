import React, { useState } from 'react';
import { X, Search, Phone, MessageSquare, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface AddContactModalProps {
  currentUserId: string;
  onClose: () => void;
  onStartChat: (targetUser: UserProfile) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  currentUserId,
  onClose,
  onStartChat,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [errorText, setErrorText] = useState('');

  const cleanPhone = (val: string) => val.replace(/[^\d+]/g, '').trim();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setFoundUser(null);
    setSearched(false);

    const formatted = cleanPhone(phoneNumber);
    if (!formatted || formatted.length < 8) {
      setErrorText('অনুগ্রহ করে সঠিক মোবাইল বা হোয়াটসঅ্যাপ নাম্বার লিখুন।');
      return;
    }

    setLoading(true);
    try {
      // Query users collection strictly matching phone
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', formatted), limit(1));

      let snap;
      try {
        snap = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }

      setSearched(true);
      if (snap && !snap.empty) {
        const user = snap.docs[0].data() as UserProfile;
        if (user.uid === currentUserId) {
          setErrorText('আপনি নিজের নাম্বারে চ্যাট শুরু করতে পারবেন না।');
          return;
        }
        if (user.isBlocked) {
          setErrorText('এই একাউন্টটি বর্তমানে স্থগিত রয়েছে।');
          return;
        }
        setFoundUser(user);
      } else {
        setFoundUser(null);
      }
    } catch (err: unknown) {
      console.error('Search error:', err);
      setErrorText(err instanceof Error ? err.message : 'খুঁজতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        id="add-contact-modal"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <UserCheck className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">নতুন যোগাযোগ যোগ করুন</h2>
          </div>
          <button
            id="close-add-contact-btn"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            নিবন্ধিত মোবাইল / হোয়াটসঅ্যাপ নাম্বার
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-contact-input"
                type="tel"
                placeholder="যেমন: 01712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
            <button
              id="search-contact-btn"
              type="submit"
              disabled={loading}
              className="flex items-center gap-1 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>খুঁজুন</span>
            </button>
          </div>
        </form>

        {errorText && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorText}</span>
          </div>
        )}

        {searched && !foundUser && !errorText && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
            <p className="text-xs font-medium text-slate-500">কোনো সদস্য পাওয়া যায়নি।</p>
            <p className="mt-1 text-[11px] text-slate-400">
              নাম্বারটি দিয়ে তিনি Unity Earning-এ নিবন্ধিত কিনা তা নিশ্চিত করুন।
            </p>
          </div>
        )}

        {foundUser && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-sky-100 flex items-center justify-center font-bold text-sky-700">
                {foundUser.photoURL ? (
                  <img
                    src={foundUser.photoURL}
                    alt={foundUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  foundUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">{foundUser.name}</h4>
                <p className="text-xs text-slate-500 truncate">{foundUser.phone}</p>
              </div>
            </div>

            <button
              id="start-chat-modal-btn"
              onClick={() => onStartChat(foundUser)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.99] transition cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              <span>চ্যাট শুরু করুন</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
