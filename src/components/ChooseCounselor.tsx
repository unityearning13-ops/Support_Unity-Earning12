import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { MessageSquare, ShieldCheck, User, Loader2, Sparkles, GraduationCap } from 'lucide-react';

interface ChooseCounselorProps {
  counselorGroupId: string;
  onSelect: (counselor: UserProfile) => void;
}

export const ChooseCounselor: React.FC<ChooseCounselorProps> = ({ counselorGroupId, onSelect }) => {
  const [counselors, setCounselors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupCounselors = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('counselorGroupId', '==', counselorGroupId),
          where('isCounselor', '==', true)
        );
        const snap = await getDocs(q);
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as UserProfile);
        });
        
        // Sort: main_counselor first
        list.sort((a, b) => (a.role === 'main_counselor' ? -1 : 1));
        
        setCounselors(list);
      } catch (err) {
        console.error('Error fetching group counselors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupCounselors();
  }, [counselorGroupId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white p-6">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-4" />
        <p className="text-slate-600 font-medium">কাউন্সিলরদের তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  if (counselors.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
           <GraduationCap className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">কাউন্সিলর পাওয়া যায়নি</h2>
        <p className="text-slate-500 text-sm max-w-xs">
          দুঃখিত, এই রেফারেল কোডের বিপরীতে কোনো একটিভ কাউন্সিলর পাওয়া যায়নি।
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 overflow-y-auto">
      <div className="w-full max-w-md mx-auto p-6 sm:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Choose Your Counselor</h1>
          <p className="text-slate-500 text-sm">
            ইউনিটি আর্নিং-এ আপনাকে স্বাগতম! আপনার পছন্দের কাউন্সিলর নির্বাচন করে সরাসরি চ্যাট শুরু করুন।
          </p>
        </div>

        <div className="space-y-4">
          {counselors.map((counselor) => (
            <div 
              key={counselor.uid}
              className="relative group bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition-all cursor-pointer"
              onClick={() => onSelect(counselor)}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden bg-sky-100 border-2 border-slate-100">
                    {counselor.photoURL ? (
                      <img src={counselor.photoURL} alt={counselor.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sky-700 text-2xl font-black">
                        {counselor.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {counselor.isOnline && (
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{counselor.name}</h3>
                    <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-teal-600" />
                      <span>কাউন্সিলর</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                    <span>অফিশিয়াল কাউন্সিলিং প্রতিনিধি</span>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl py-3 text-sm font-bold shadow-md shadow-teal-600/20 transition cursor-pointer">
                <MessageSquare className="h-4 w-4" />
                <span>চ্যাট শুরু করুন</span>
              </button>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          সুরক্ষার স্বার্থে সবসময় অফিশিয়াল কাউন্সিলরের সাথেই যোগাযোগ করুন।
        </p>
      </div>
    </div>
  );
};
