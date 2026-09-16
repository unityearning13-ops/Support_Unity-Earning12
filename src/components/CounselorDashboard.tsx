import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Conversation } from '../types';
import {
  GraduationCap,
  Link as LinkIcon,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Camera,
  User,
  Phone,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Search,
  X,
  ChevronRight,
  LogOut,
  QrCode,
  KeyRound,
  Users,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  Calendar,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  ShieldAlert,
  SlidersHorizontal,
  Bot,
  UserX,
  Ban,
  Globe,
} from 'lucide-react';
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateCounselorLink } from '../utils/counselor';
import { compressImage, formatMessageTime } from '../utils/media';
import { sanitizeForFirestore } from '../utils/sanitize';
import { blockUserAndDevice, unblockUserAndDevice } from '../utils/security';

interface CounselorDashboardProps {
  counselor: UserProfile;
  onClose: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onLogout: () => void;
  onProfileUpdate: (updated: Partial<UserProfile>) => void;
}

export const CounselorDashboard: React.FC<CounselorDashboardProps> = ({
  counselor,
  onClose,
  onSelectConversation,
  onLogout,
  onProfileUpdate,
}) => {
  const isMainCounselor = counselor.role === 'main_counselor' || !counselor.parentCounselorId;
  const [activeTab, setActiveTab] = useState<'students' | 'sub_counselors' | 'blocked' | 'link' | 'profile' | 'password'>(
    'students'
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const [groupCopied, setGroupCopied] = useState(false);

  // Block management state
  const [blockedStudents, setBlockedStudents] = useState<UserProfile[]>([]);
  const [blockedSearchQuery, setBlockedSearchQuery] = useState('');
  const [studentToBlock, setStudentToBlock] = useState<UserProfile | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Group ID Initialization
  const effectiveGroupId =
    counselor.counselorGroupId ||
    counselor.referralCode ||
    `GROUP_${counselor.phone.replace(/[^\d]/g, '').slice(-4) || '2026'}`;

  // Automatically ensure counselor has counselorGroupId in Firestore
  useEffect(() => {
    if (!counselor.counselorGroupId) {
      updateDoc(doc(db, 'users', counselor.uid), {
        counselorGroupId: effectiveGroupId,
        referralCode: effectiveGroupId,
        role: counselor.role || 'main_counselor',
      })
        .then(() => {
          onProfileUpdate({
            counselorGroupId: effectiveGroupId,
            referralCode: effectiveGroupId,
            role: counselor.role || 'main_counselor',
          });
        })
        .catch((err) => console.warn('Counselor group init notice:', err));
    }
  }, [counselor.uid, counselor.counselorGroupId, effectiveGroupId, counselor.role, onProfileUpdate]);

  // Profile Edit State
  const [name, setName] = useState(counselor.name || '');
  const [photoURL, setPhotoURL] = useState(counselor.photoURL || '');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(counselor.autoReplyEnabled ?? false);
  const [isTrustedModeOn, setIsTrustedModeOn] = useState(counselor.isTrustedModeOn ?? false);
  const [autoReplyText, setAutoReplyText] = useState(
    counselor.autoReplyText ||
      'Hi {name}! অনুগ্রহ করে একটু অপেক্ষা করবেন। কিছুক্ষণের ভেতর আমাদের কাউন্সিলর সরাসরি আপনার সাথে লাইভ চ্যাটে যুক্ত হয়ে কথা বলবেন।'
  );
  const [aiReplyEnabled, setAiReplyEnabled] = useState(counselor.aiReplyEnabled ?? false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Password / PIN Management State
  const [newPin, setNewPin] = useState(counselor.counselorPin || '');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState('');
  const [pinError, setPinError] = useState('');

  // Assigned Students / Conversations (Combined Group & Direct)
  const [assignedConvs, setAssignedConvs] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'sub' | 'new'>('all');

  // Sub Counselors State
  const [subCounselors, setSubCounselors] = useState<UserProfile[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [showCreateSubModal, setShowCreateSubModal] = useState(false);

  // New Sub Counselor Form
  const [subName, setSubName] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [subPhotoURL, setSubPhotoURL] = useState('');
  const [subCreating, setSubCreating] = useState(false);
  const [subError, setSubError] = useState('');
  const [subSuccess, setSubSuccess] = useState('');
  const subPhotoInputRef = useRef<HTMLInputElement>(null);

  // Sub Counselor Password Edit State
  const [editingSubPinId, setEditingSubPinId] = useState<string | null>(null);
  const [editingSubPinValue, setEditingSubPinValue] = useState('');
  const [visiblePins, setVisiblePins] = useState<{ [uid: string]: boolean }>({});
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);

  // Shared Referral Link: Identical for Main Counselor and Sub Counselors
  const shareLink = generateCounselorLink(effectiveGroupId);

  // 1. Real-time Listener for Sub-Counselors
  useEffect(() => {
    if (!isMainCounselor) {
      setSubsLoading(false);
      return;
    }

    setSubsLoading(true);
    const q = query(
      collection(db, 'users'),
      where('counselorGroupId', '==', effectiveGroupId),
      where('role', '==', 'sub_counselor')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as UserProfile);
        });
        setSubCounselors(list);
        setSubsLoading(false);
      },
      (err) => {
        console.warn('Sub counselors fetch notice:', err);
        setSubsLoading(false);
      }
    );

    return () => unsub();
  }, [effectiveGroupId, isMainCounselor]);

  // 2. Real-time Listener for Group & Direct Conversations
  useEffect(() => {
    setConvsLoading(true);

    // Listener 1: Conversations where counselor is directly in participantIds
    const qDirect = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', counselor.uid)
    );

    // Listener 2: Conversations tagged with this group ID
    const qGroup = query(
      collection(db, 'conversations'),
      where('counselorGroupId', '==', effectiveGroupId)
    );

    let directList: Conversation[] = [];
    let groupList: Conversation[] = [];

    const mergeAndSet = () => {
      const convMap = new Map<string, Conversation>();
      // Prefer latest data
      directList.forEach((c) => convMap.set(c.id, c));
      groupList.forEach((c) => convMap.set(c.id, c));

      const merged = Array.from(convMap.values()).sort(
        (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')
      );

      setAssignedConvs(merged);
      setConvsLoading(false);
    };

    const unsubDirect = onSnapshot(
      qDirect,
      (snapshot) => {
        directList = [];
        snapshot.forEach((d) => directList.push({ id: d.id, ...d.data() } as Conversation));
        mergeAndSet();
      },
      (err) => {
        console.warn('Direct convs error:', err);
        setConvsLoading(false);
      }
    );

    const unsubGroup = onSnapshot(
      qGroup,
      (snapshot) => {
        groupList = [];
        snapshot.forEach((d) => groupList.push({ id: d.id, ...d.data() } as Conversation));
        mergeAndSet();
      },
      (err) => {
        console.warn('Group convs error:', err);
        setConvsLoading(false);
      }
    );

    return () => {
      unsubDirect();
      unsubGroup();
    };
  }, [counselor.uid, effectiveGroupId]);

  // Listen to blocked students in real-time
  useEffect(() => {
    const qBlocked = query(collection(db, 'users'), where('isBlocked', '==', true));
    const unsub = onSnapshot(
      qBlocked,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          const u = d.data() as UserProfile;
          if (
            u.counselorId === counselor.uid ||
            u.counselorGroupId === effectiveGroupId ||
            (u.blockedBy && (u.blockedBy === counselor.name || u.blockedBy.includes(counselor.name))) ||
            assignedConvs.some((conv) => conv.participantIds.includes(u.uid))
          ) {
            list.push(u);
          }
        });
        setBlockedStudents(list);
      },
      (err) => {
        console.warn('Blocked students query error:', err);
      }
    );
    return () => unsub();
  }, [counselor.uid, counselor.name, effectiveGroupId, assignedConvs]);

  // Handle Block Student and device
  const handleBlockStudent = async (student: UserProfile, reason?: string) => {
    setBlockActionLoading(true);
    try {
      await blockUserAndDevice(
        student,
        `কাউন্সিলর: ${counselor.name}`,
        reason || 'কাউন্সিলর দ্বারা শিক্ষার্থী ও ডিভাইস ব্লক করা হয়েছে'
      );
      setActionSuccess(`"${student.name}" এবং তার ডিভাইস সফলভাবে ব্লক করা হয়েছে।`);
      setStudentToBlock(null);
      setBlockReasonInput('');
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      console.error('Error blocking student:', err);
      setActionError('ব্লক করতে সমস্যা হয়েছে।');
      setTimeout(() => setActionError(''), 3500);
    } finally {
      setBlockActionLoading(false);
    }
  };

  // Handle Unblock Student and device
  const handleUnblockStudent = async (student: UserProfile) => {
    setBlockActionLoading(true);
    try {
      await unblockUserAndDevice(student, `কাউন্সিলর: ${counselor.name}`);
      setActionSuccess(`"${student.name}" একাউন্ট ও ডিভাইস সফলভাবে আনব্লক করা হয়েছে।`);
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      console.error('Error unblocking student:', err);
      setActionError('আনব্লক করতে সমস্যা হয়েছে।');
      setTimeout(() => setActionError(''), 3500);
    } finally {
      setBlockActionLoading(false);
    }
  };

  // Handle Copy Share Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  // Handle Copy Group Code
  const handleCopyGroupCode = () => {
    navigator.clipboard.writeText(effectiveGroupId);
    setGroupCopied(true);
    setTimeout(() => setGroupCopied(false), 3000);
  };

  // Photo Select for Counselor Profile
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const compressed = await compressImage(file, 400, 0.7);
      setPhotoURL(compressed);
    } catch {
      alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Photo Select for New Sub Counselor
  const handleSubPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 300, 0.7);
      setSubPhotoURL(compressed);
    } catch {
      alert('ছবি প্রসেস করা যায়নি।');
    }
  };

  // Save Counselor Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSavingProfile(true);
    setProfileMsg('');
    try {
      const updateData = {
        name: name.trim(),
        photoURL: photoURL || '',
        autoReplyEnabled,
        autoReplyText: autoReplyText.trim(),
        aiReplyEnabled,
        isTrustedModeOn,
      };

      await updateDoc(doc(db, 'users', counselor.uid), updateData);
      onProfileUpdate(updateData);
      setProfileMsg('প্রোফাইল ও অটো-মেসেজ সেটিংস সফলভাবে আপডেট করা হয়েছে।');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('আপডেট করা যায়নি, অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Counselor Password / PIN
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinMsg('');

    if (!newPin.trim() || newPin.trim().length < 4) {
      setPinError('কমপক্ষে ৪ সংখ্যার পাসওয়ার্ড বা পিন প্রদান করুন।');
      return;
    }

    if (confirmPin && confirmPin.trim() !== newPin.trim()) {
      setPinError('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!');
      return;
    }

    setSavingPin(true);
    try {
      await updateDoc(doc(db, 'users', counselor.uid), {
        counselorPin: newPin.trim(),
      });
      onProfileUpdate({ counselorPin: newPin.trim() });
      setPinMsg('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। পরবর্তী লগইনে এই পাসওয়ার্ড ব্যবহার করুন।');
      setConfirmPin('');
      setTimeout(() => setPinMsg(''), 4000);
    } catch {
      setPinError('পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSavingPin(false);
    }
  };

  // Create Sub-Counselor Account
  const handleCreateSubCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subPhone.trim() || !subPassword.trim()) {
      setSubError('নাম, মোবাইল নাম্বার এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    const cleanPhone = subPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 10) {
      setSubError('সঠিক মোবাইল নাম্বার প্রদান করুন (কমপক্ষে ১০ ডিজিট)।');
      return;
    }

    setSubCreating(true);
    setSubError('');
    setSubSuccess('');

    try {
      const subUid = `sub_counselor_${cleanPhone}`;
      const now = new Date().toISOString();

      const newSubProfile: UserProfile = {
        uid: subUid,
        name: subName.trim(),
        phone: subPhone.trim(),
        photoURL: subPhotoURL || '',
        isBlocked: false,
        isOnline: true,
        isCounselor: true,
        role: 'sub_counselor',
        parentCounselorId: counselor.uid,
        counselorGroupId: effectiveGroupId,
        referralCode: effectiveGroupId,
        counselorPin: subPassword.trim(),
        createdAt: now,
        lastActiveAt: now,
      };

      await setDoc(doc(db, 'users', subUid), sanitizeForFirestore(newSubProfile));

      setSubSuccess(`সাব-কাউন্সিলর "${subName.trim()}" সফলভাবে তৈরি হয়েছে!`);
      setSubName('');
      setSubPhone('');
      setSubPassword('');
      setSubPhotoURL('');
      setTimeout(() => {
        setSubSuccess('');
        setShowCreateSubModal(false);
      }, 2000);
    } catch (err: any) {
      console.error('Create sub counselor error:', err);
      setSubError(err?.message || 'সাব-কাউন্সিলর একাউন্ট তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setSubCreating(false);
    }
  };

  // Update Sub Counselor Password
  const handleSaveSubPin = async (subUid: string) => {
    if (!editingSubPinValue.trim()) return;
    try {
      await updateDoc(doc(db, 'users', subUid), {
        counselorPin: editingSubPinValue.trim(),
      });
      setEditingSubPinId(null);
      setEditingSubPinValue('');
    } catch {
      alert('পাসওয়ার্ড পরিবর্তন করা যায়নি।');
    }
  };

  // Toggle Sub Counselor Block Status
  const handleToggleSubStatus = async (sub: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', sub.uid), {
        isBlocked: !sub.isBlocked,
      });
    } catch {
      alert('স্ট্যাটাস পরিবর্তন করা যায়নি।');
    }
  };

  // Delete Sub Counselor Account
  const handleDeleteSubCounselor = async (subUid: string) => {
    try {
      await deleteDoc(doc(db, 'users', subUid));
      setDeletingSubId(null);
    } catch {
      alert('সাব-কাউন্সিলর একাউন্ট ডিলিট করা যায়নি।');
    }
  };

  // Filtered Students/Conversations
  const filteredConvs = assignedConvs
    .filter((conv) => {
      const studentUid = conv.participantIds.find((id) => id !== counselor.uid) || conv.participantIds[0];
      const details = conv.participantDetails?.[studentUid];
      const isDirectWithMe = conv.participantIds.includes(counselor.uid);
      const isNewMember = conv.labels?.includes('নিউ মেম্বার');

      // Tab Filter
      if (filterType === 'direct' && !isDirectWithMe) return false;
      if (filterType === 'sub' && isDirectWithMe) return false;
      if (filterType === 'new' && !isNewMember) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        details?.name?.toLowerCase().includes(q) ||
        details?.phone?.includes(q) ||
        conv.lastMessage?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const unreadA = a.unreadCounts?.[counselor.uid] || 0;
      const unreadB = b.unreadCounts?.[counselor.uid] || 0;
      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadA === 0 && unreadB > 0) return 1;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="flex h-full max-h-[92vh] sm:max-h-[90vh] my-auto w-full max-w-5xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-50 shadow-2xl border border-slate-200">
        {/* TOP HEADER BANNER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 px-5 py-4 text-white shrink-0 shadow-md">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            {/* Counselor Identity Box */}
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 rounded-2xl overflow-hidden border-2 border-white/30 bg-white/10 shrink-0 flex items-center justify-center text-white text-lg font-bold shadow-inner">
                {counselor.photoURL ? (
                  <img src={counselor.photoURL} alt={counselor.name} className="h-full w-full object-cover" />
                ) : (
                  <GraduationCap className="h-7 w-7 text-teal-200" />
                )}
                <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-teal-800" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {counselor.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                    <ShieldCheck className="h-3 w-3 text-emerald-300" />
                    <span>{isMainCounselor ? 'প্রধান কাউন্সিলর' : 'সাব-কাউন্সিলর'}</span>
                  </span>
                  <button
                    onClick={handleCopyGroupCode}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 px-2 py-0.5 text-[10px] font-mono text-teal-100 transition cursor-pointer"
                    title="গ্রুপ কোড কপি করুন"
                  >
                    <Users className="h-2.5 w-2.5" />
                    <span>{effectiveGroupId}</span>
                    {groupCopied ? <Check className="h-2.5 w-2.5 text-emerald-300" /> : <Copy className="h-2.5 w-2.5" />}
                  </button>
                </div>
                <p className="text-xs text-teal-100/90 font-mono mt-0.5 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-teal-300" />
                  <span>{counselor.phone}</span>
                  <span className="text-teal-300/50">•</span>
                  <span className="text-[11px] text-teal-200">কাউন্সিলিং ও শিক্ষার্থী সাপোর্ট হাব</span>
                </p>
              </div>
            </div>

            {/* Top Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-xl bg-white text-teal-800 hover:bg-teal-50 px-3 py-1.5 text-xs font-bold shadow-sm transition cursor-pointer"
              >
                {linkCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{linkCopied ? 'কপি হয়েছে!' : 'রেফারাল লিংক'}</span>
              </button>

              <button
                onClick={onClose}
                className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-white transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar (Boxed stats pattern) */}
          <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/15">
            <div className="bg-black/15 backdrop-blur-xs rounded-xl p-2 px-3 border border-white/10">
              <span className="text-[10px] text-teal-200 block font-medium">মোট শিক্ষার্থী</span>
              <span className="text-base font-black text-white">{assignedConvs.length} জন</span>
            </div>

            {isMainCounselor && (
              <div
                onClick={() => setActiveTab('sub_counselors')}
                className="bg-black/15 hover:bg-black/25 backdrop-blur-xs rounded-xl p-2 px-3 border border-white/10 cursor-pointer transition"
              >
                <span className="text-[10px] text-teal-200 block font-medium">সাব-কাউন্সিলর টিম</span>
                <span className="text-base font-black text-white">{subCounselors.length} জন</span>
              </div>
            )}

            <div className="bg-black/15 backdrop-blur-xs rounded-xl p-2 px-3 border border-white/10">
              <span className="text-[10px] text-teal-200 block font-medium">সক্রিয় চ্যাট সংযোগ</span>
              <span className="text-base font-black text-white">{assignedConvs.length} টি</span>
            </div>

            <div
              onClick={handleCopyGroupCode}
              className="bg-black/15 hover:bg-black/25 backdrop-blur-xs rounded-xl p-2 px-3 border border-white/10 cursor-pointer transition"
            >
              <span className="text-[10px] text-teal-200 block font-medium">শেয়ার্ড টিম কোড</span>
              <span className="text-xs font-mono font-bold text-white truncate block">{effectiveGroupId}</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 overflow-x-auto gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
              <span>শিক্ষার্থী অ্যাকাউন্টস ({assignedConvs.length})</span>
            </button>

            {isMainCounselor && (
              <button
                onClick={() => setActiveTab('sub_counselors')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                  activeTab === 'sub_counselors'
                    ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs font-bold'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-teal-600" />
                <span>সাব-কাউন্সিলর টিম ({subCounselors.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('link')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5 text-teal-600" />
              <span>শেয়ার লিংক</span>
            </button>

            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                activeTab === 'blocked'
                  ? 'bg-red-50 text-red-800 border border-red-200 shadow-2xs font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <UserX className="h-3.5 w-3.5 text-red-600" />
              <span>ব্লক ইউজার ({blockedStudents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <User className="h-3.5 w-3.5 text-teal-600" />
              <span>প্রোফাইল</span>
            </button>

            <button
              onClick={() => setActiveTab('password')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Lock className="h-3.5 w-3.5 text-teal-600" />
              <span>পাসওয়ার্ড</span>
            </button>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition shrink-0 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>লগআউট</span>
          </button>
        </div>

        {/* TAB CONTENTS BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 bg-slate-100/70 space-y-4">
          {/* ======================================================== */}
          {/* TAB 1: STUDENT ACCOUNTS IN BEAUTIFUL BOX PATTERN         */}
          {/* ======================================================== */}
          {activeTab === 'students' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Filter & Search Bar */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="শিক্ষার্থীর নাম, মোবাইল বা মেসেজ খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    সকল শিক্ষার্থী ({assignedConvs.length})
                  </button>

                  <button
                    onClick={() => setFilterType('direct')}
                    className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                      filterType === 'direct'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    আমার সাথে চ্যাট
                  </button>

                  {isMainCounselor && (
                    <button
                      onClick={() => setFilterType('sub')}
                      className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                        filterType === 'sub'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      সাব-কাউন্সিলর চ্যাট
                    </button>
                  )}

                  <button
                    onClick={() => setFilterType('new')}
                    className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                      filterType === 'new'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    নতুন মেম্বার
                  </button>
                </div>
              </div>

              {/* Accounts List (Box/Card Pattern Grid) */}
              {convsLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
                  <span className="font-semibold text-slate-700">শিক্ষার্থীদের অ্যাকাউন্ট লোড হচ্ছে...</span>
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
                  <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">কোনো শিক্ষার্থীর অ্যাকাউন্ট পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    আপনার এবং সাব-কাউন্সিলরের শেয়ার্ড রেফারাল লিংকের মাধ্যমে শিক্ষার্থীরা রেজিস্ট্রেশন করলে তাদের সম্পূর্ণ তথ্য ও চ্যাট বক্স আকারে এখানে প্রদর্শিত হবে।
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>রেফারাল লিংক কপি করুন</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredConvs.map((conv) => {
                    const studentUid =
                      conv.participantIds.find((id) => id !== counselor.uid) || conv.participantIds[0];
                    const studentDetails = conv.participantDetails?.[studentUid] || {
                      name: 'শিক্ষার্থী',
                      phone: '',
                    };

                    const isDirect = conv.participantIds.includes(counselor.uid);
                    const isNewMember = conv.labels?.includes('নিউ মেম্বার');
                    const cleanPhone = (studentDetails.phone || '').replace(/[^\d]/g, '');

                    // Determine assigned counselor name for badge
                    const assignedCounselorUid =
                      conv.counselorId ||
                      conv.participantIds.find((id) => id.startsWith('counselor') || id.startsWith('sub_counselor')) ||
                      '';
                    const assignedCounselorName =
                      conv.participantDetails?.[assignedCounselorUid]?.name ||
                      (isDirect ? 'আপনার সাথে সরাসরি চ্যাট' : 'সাব-কাউন্সিলর চ্যাট');

                    return (
                      <div
                        key={conv.id}
                        className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3 group relative ${
                          (conv.unreadCounts?.[counselor.uid] || 0) > 0
                            ? 'bg-teal-50/80 border-teal-400 shadow-md ring-2 ring-teal-500/20'
                            : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-300'
                        }`}
                      >
                        {/* Top: Student Profile Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-11 w-11 shrink-0 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm overflow-hidden border border-teal-200">
                                {studentDetails.photoURL ? (
                                  <img
                                    src={studentDetails.photoURL}
                                    alt={studentDetails.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  studentDetails.name.charAt(0).toUpperCase()
                                )}
                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition">
                                    {studentDetails.name}
                                  </h4>
                                  {(conv.unreadCounts?.[counselor.uid] || 0) > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-teal-600 px-2 py-0.5 text-[9px] font-black text-white shadow-2xs">
                                      নতুন মেসেজ
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                                  <span>{studentDetails.phone || 'মোবাইল নম্বর অপ্রাপ্ত'}</span>
                                  {studentDetails.phone && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(studentDetails.phone);
                                        alert('মোবাইল নম্বর কপি হয়েছে: ' + studentDetails.phone);
                                      }}
                                      className="text-slate-400 hover:text-teal-600 transition cursor-pointer"
                                      title="নম্বর কপি করুন"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {(conv.unreadCounts?.[counselor.uid] || 0) > 0 && (
                                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white shadow-2xs animate-pulse">
                                  নতুন মেসেজ ({(conv.unreadCounts?.[counselor.uid] || 0)})
                                </span>
                              )}
                              {isNewMember && (
                                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                                  নিউ মেম্বার
                                </span>
                              )}
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                                  isDirect
                                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}
                              >
                                {isDirect ? 'সরাসরি চ্যাট' : 'টিম চ্যাট'}
                              </span>
                            </div>
                          </div>

                          {/* Counseling Route Information Pill */}
                          <div className="bg-slate-50 rounded-xl p-2 px-2.5 border border-slate-100 flex items-center justify-between text-[11px] text-slate-600 mb-2">
                            <span className="font-medium flex items-center gap-1 text-slate-700">
                              <GraduationCap className="h-3.5 w-3.5 text-teal-600" />
                              <span className="truncate">{assignedCounselorName}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {conv.updatedAt ? formatMessageTime(conv.updatedAt) : ''}
                            </span>
                          </div>

                          {/* Last Message Box (Pattern) */}
                          <div className={`rounded-xl p-2.5 border transition-all ${
                            (conv.unreadCounts?.[counselor.uid] || 0) > 0
                              ? 'bg-[#00a884]/15 border-[#00a884] text-emerald-800 ring-1 ring-[#00a884]/30'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-[10px] font-black ${
                                (conv.unreadCounts?.[counselor.uid] || 0) > 0 ? 'text-[#00a884]' : 'text-slate-500'
                              }`}>
                                সর্বশেষ বার্তা:
                              </span>
                              {(conv.unreadCounts?.[counselor.uid] || 0) > 0 ? (
                                <span className="text-[9px] font-black bg-[#00a884] text-white px-1.5 py-0.2 rounded-full">
                                  আনরিড মেসেজ
                                </span>
                              ) : (conv as any).counselorRead ? (
                                <span className="text-[9px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded-full">
                                  রিড হয়েছে
                                </span>
                              ) : null}
                            </div>
                            <p className={`line-clamp-2 text-xs ${
                              (conv.unreadCounts?.[counselor.uid] || 0) > 0
                                ? 'text-slate-900 font-black'
                                : 'text-slate-600 italic font-normal'
                            }`}>
                              "{conv.lastMessage || 'স্বাগতম সেমিনার মেসেজ পাঠানো হয়েছে'}"
                            </p>
                          </div>
                        </div>

                        {/* Card Actions Bottom Row */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              onSelectConversation(conv);
                              onClose();
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white py-2 text-xs font-bold transition shadow-2xs cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>চ্যাট ওপেন করুন</span>
                          </button>

                          {studentDetails.phone && (
                            <>
                              <a
                                href={`tel:${studentDetails.phone}`}
                                className="flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                title="সরাসরি ফোন করুন"
                              >
                                <PhoneCall className="h-3.5 w-3.5 text-slate-600" />
                              </a>

                              <a
                                href={`https://wa.me/88${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                title="হোয়াটসঅ্যাপে চ্যাট করুন"
                              >
                                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                              </a>
                            </>
                          )}

                          <button
                            onClick={() =>
                              setStudentToBlock({
                                uid: studentUid,
                                name: studentDetails.name,
                                phone: studentDetails.phone || '',
                                isBlocked: false,
                                isOnline: false,
                                createdAt: conv.createdAt || '',
                              })
                            }
                            className="flex items-center justify-center p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition cursor-pointer"
                            title="শিক্ষার্থী ও তার ডিভাইস সম্পূর্ণ ব্লক করুন"
                          >
                            <UserX className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SUB COUNSELOR ACCOUNTS MANAGEMENT                 */}
          {/* ======================================================== */}
          {activeTab === 'sub_counselors' && isMainCounselor && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Card with Add Trigger */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-600" />
                    <span>সাব-কাউন্সিলর টিম অ্যাকাউন্টস</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    আপনার তৈরি করা সাব-কাউন্সিলরগণ একই রেফারাল লিংকে কাজ করবে এবং মেসেজের উত্তর দিতে পারবে।
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateSubModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>নতুন সাব-কাউন্সিলর তৈরি করুন</span>
                </button>
              </div>

              {/* Create Sub-Counselor Modal / Form Card */}
              {showCreateSubModal && (
                <div className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 rounded-2xl border-2 border-teal-300 p-5 shadow-sm space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
                    <div className="flex items-center gap-2 text-teal-900">
                      <UserPlus className="h-4 w-4 text-teal-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        নতুন সাব-কাউন্সিলর অ্যাকাউন্ট নিবন্ধন
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowCreateSubModal(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {subError && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                      {subError}
                    </p>
                  )}
                  {subSuccess && (
                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      {subSuccess}
                    </p>
                  )}

                  <form onSubmit={handleCreateSubCounselor} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          সাব-কাউন্সিলরের নাম <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: সোহেল রানা"
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          মোবাইল নাম্বার (লগইন আইডি) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="017XXXXXXXX"
                          value={subPhone}
                          onChange={(e) => setSubPhone(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 font-mono focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          লগইন পাসওয়ার্ড / পিন <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="কমপক্ষে ৪ সংখ্যার পিন"
                          value={subPassword}
                          onChange={(e) => setSubPassword(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 font-mono focus:border-teal-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          প্রোফাইল ছবি (ঐচ্ছিক)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => subPhotoInputRef.current?.click()}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5 text-teal-600" />
                            <span>{subPhotoURL ? 'ছবি সিলেক্টেড' : 'ছবি বেছে নিন'}</span>
                          </button>
                          {subPhotoURL && (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              আপলোড প্রস্তুত
                            </span>
                          )}
                          <input
                            ref={subPhotoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleSubPhotoSelect}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-teal-100/60 border border-teal-200 text-[11px] text-teal-800">
                      <strong>স্বয়ংক্রিয় লিংক ও গ্রুপ যুক্তকরণ:</strong> এই সাব-কাউন্সিলর তৈরি হলে স্বয়ংক্রিয়ভাবে আপনার গ্রুপ কোড <strong>({effectiveGroupId})</strong> এবং একই রেফারাল লিংক ধারণ করবে। শিক্ষার্থী লিংকে ঢুকলে আপনাদের উভয়ের সাথেই কথা বলতে পারবে।
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateSubModal(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        disabled={subCreating}
                        className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {subCreating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>{subCreating ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট নিশ্চিত করুন'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sub Counselors Box/Card Pattern Grid */}
              {subsLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-teal-600" />
                  <span>সাব-কাউন্সিলর তালিকা লোড হচ্ছে...</span>
                </div>
              ) : subCounselors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
                  <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">কোনো সাব-কাউন্সিলর যুক্ত করা হয়নি</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    কাজের চাপ কমাতে আপনার আন্ডারে সাব-কাউন্সিলর তৈরি করতে পারেন। শিক্ষার্থীরা তাদের সাথেও চ্যাট করতে পারবে।
                  </p>
                  <button
                    onClick={() => setShowCreateSubModal(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>প্রথম সাব-কাউন্সিলর তৈরি করুন</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subCounselors.map((sub) => {
                    const isPinVisible = !!visiblePins[sub.uid];

                    return (
                      <div
                        key={sub.uid}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition p-4 flex flex-col justify-between gap-3 relative"
                      >
                        <div>
                          {/* Top Identity */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base overflow-hidden border border-teal-200">
                                {sub.photoURL ? (
                                  <img src={sub.photoURL} alt={sub.name} className="h-full w-full object-cover" />
                                ) : (
                                  sub.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 truncate">{sub.name}</h4>
                                <p className="text-xs font-mono text-slate-500 mt-0.5">{sub.phone}</p>
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                                sub.isBlocked
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {sub.isBlocked ? 'স্থগিত (Blocked)' : 'সক্রিয় (Active)'}
                            </span>
                          </div>

                          {/* Login Password / PIN Box */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-600 flex items-center gap-1">
                                <KeyRound className="h-3 w-3 text-teal-600" />
                                <span>লগইন পিন / পাসওয়ার্ড:</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    setVisiblePins((prev) => ({ ...prev, [sub.uid]: !prev[sub.uid] }))
                                  }
                                  className="text-slate-400 hover:text-slate-600 p-0.5"
                                  title="পিন দেখুন/লুকান"
                                >
                                  {isPinVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(sub.counselorPin || '1234');
                                    alert('পিন কপি হয়েছে: ' + (sub.counselorPin || '1234'));
                                  }}
                                  className="text-slate-400 hover:text-teal-600 p-0.5"
                                  title="পিন কপি করুন"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {editingSubPinId === sub.uid ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <input
                                  type="text"
                                  placeholder="নতুন পিন"
                                  value={editingSubPinValue}
                                  onChange={(e) => setEditingSubPinValue(e.target.value)}
                                  className="flex-1 rounded-lg border border-teal-400 bg-white py-1 px-2 text-xs font-mono"
                                />
                                <button
                                  onClick={() => handleSaveSubPin(sub.uid)}
                                  className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700"
                                >
                                  সেভ
                                </button>
                                <button
                                  onClick={() => setEditingSubPinId(null)}
                                  className="rounded-lg bg-slate-200 px-2 py-1 text-xs text-slate-600"
                                >
                                  বাতিল
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between font-mono text-xs text-slate-800">
                                <span>
                                  {isPinVisible ? sub.counselorPin || '1234' : '••••••••'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingSubPinId(sub.uid);
                                    setEditingSubPinValue(sub.counselorPin || '');
                                  }}
                                  className="text-[11px] font-sans text-teal-700 hover:underline flex items-center gap-0.5"
                                >
                                  <Edit3 className="h-2.5 w-2.5" />
                                  <span>পিন পরিবর্তন</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Group & Team Details */}
                          <div className="text-[11px] text-slate-500 space-y-1">
                            <div className="flex items-center justify-between">
                              <span>রেফারাল গ্রুপ:</span>
                              <span className="font-mono text-slate-700 font-semibold">{sub.counselorGroupId}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>যোগদানের তারিখ:</span>
                              <span>{sub.createdAt ? sub.createdAt.split('T')[0] : 'সম্প্রতি'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleToggleSubStatus(sub)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                              sub.isBlocked
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                            }`}
                          >
                            {sub.isBlocked ? 'সক্রিয় করুন' : 'সাময়িক স্থগিত'}
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`আপনি কি "${sub.name}" সাব-কাউন্সিলর একাউন্টটি সম্পূর্ণ মুছে ফেলতে চান?`)) {
                                handleDeleteSubCounselor(sub.uid);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
                            title="সাব-কাউন্সিলর একাউন্ট ডিলিট করুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: BLOCKED USERS & DEVICE RESTRICTION                  */}
          {/* ======================================================== */}
          {activeTab === 'blocked' && (
            <div className="space-y-4 animate-in fade-in max-w-4xl mx-auto">
              {/* Header Box */}
              <div className="bg-white rounded-2xl border border-red-200 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-600" />
                      <span>ব্লক ইউজার তালিকা ও ডিভাইস নিষেধাজ্ঞা</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      এই শিক্ষার্থীদের একাউন্ট, ডিভাইস ও আইপি ব্লক রয়েছে। তারা কোনো রেফারাল লিংকে ক্লিক করে সিস্টেমে প্রবেশ করতে পারবে না।
                    </p>
                  </div>

                  <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-700 shrink-0 self-start sm:self-center">
                    মোট ব্লকড: {blockedStudents.length} জন
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ব্লকড শিক্ষার্থীর নাম, ফোন নম্বর বা আইপি দিয়ে খুঁজুন..."
                    value={blockedSearchQuery}
                    onChange={(e) => setBlockedSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Toast Alerts */}
              {actionSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800 flex items-center gap-2 animate-in fade-in">
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Blocked List */}
              {(() => {
                const filteredBlocked = blockedStudents.filter((s) => {
                  if (!blockedSearchQuery.trim()) return true;
                  const q = blockedSearchQuery.toLowerCase();
                  return (
                    s.name?.toLowerCase().includes(q) ||
                    s.phone?.toLowerCase().includes(q) ||
                    (s.ipAddress && s.ipAddress.toLowerCase().includes(q))
                  );
                });

                if (filteredBlocked.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {blockedSearchQuery
                          ? 'কোনো তথ্য মেলেনি'
                          : 'বর্তমানে কোনো ব্লক করা ইউজার নেই'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        {blockedSearchQuery
                          ? 'অন্য কোনো নাম বা নম্বর দিয়ে পুনরায় চেষ্টা করুন।'
                          : 'আপনার সকল শিক্ষার্থী সক্রিয় ও স্বাভাবিকভাবে চ্যাট তালিকায় রয়েছে। কোনো শিক্ষার্থীকে ব্লক করলে এখানে দেখা যাবে এবং প্রয়োজনে যে কোনো সময় আনব্লক করতে পারবেন।'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredBlocked.map((st) => (
                      <div
                        key={st.uid}
                        className="bg-white rounded-2xl border border-red-200 p-4 shadow-2xs space-y-3 relative hover:shadow-xs transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 shrink-0 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center font-bold text-sm overflow-hidden">
                              {st.photoURL ? (
                                <img src={st.photoURL} alt={st.name} className="h-full w-full object-cover" />
                              ) : (
                                st.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <span>{st.name}</span>
                                <span className="rounded bg-red-100 text-red-700 text-[10px] px-1.5 py-0.2 font-semibold">
                                  নিষিদ্ধ
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                {st.phone || 'ফোন নম্বর নেই'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Metadata Box */}
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-[11px] space-y-1">
                          {st.ipAddress && (
                            <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                              <Globe className="h-3 w-3 text-sky-600 shrink-0" />
                              <span>IP: {st.ipAddress}</span>
                            </div>
                          )}
                          <div className="text-slate-600">
                            ব্লক করেছেন: <span className="text-slate-900 font-semibold">{st.blockedBy || 'কাউন্সিলর'}</span>
                          </div>
                          {st.blockedAt && (
                            <div className="text-slate-400 text-[10px]">
                              তারিখ: {new Date(st.blockedAt).toLocaleString('bn-BD')}
                            </div>
                          )}
                        </div>

                        {/* Unblock Button */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                          <button
                            onClick={() => handleUnblockStudent(st)}
                            disabled={blockActionLoading}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>আনব্লক করুন</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SHARED REFERRAL LINK                              */}
          {/* ======================================================== */}
          {activeTab === 'link' && (
            <div className="space-y-4 animate-in fade-in max-w-3xl mx-auto">
              <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50/60 p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 text-teal-950">
                  <div className="rounded-2xl bg-teal-600 p-2.5 text-white shadow-xs">
                    <LinkIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">কাউন্সিলর ও সাব-কাউন্সিলরের অভিন্ন রেফারাল লিংক</h3>
                    <p className="text-xs text-teal-800 mt-0.5">
                      এই লিংকটি দিয়ে কোনো শিক্ষার্থী রেজিস্ট্রেশন করলে সে স্বয়ংক্রিয়ভাবে আপনার এবং আপনার সাব-কাউন্সিলর উভয়ের সাথে চ্যাট তালিকায় যুক্ত হবে।
                    </p>
                  </div>
                </div>

                {/* Link Box */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-teal-300 bg-white p-3 shadow-2xs">
                  <span className="flex-1 overflow-hidden truncate text-xs font-mono text-slate-800 select-all px-1 py-1">
                    {shareLink}
                  </span>

                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold transition cursor-pointer shadow-xs ${
                      linkCopied ? 'bg-emerald-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{linkCopied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <span className="text-teal-800 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    <span>গ্রুপ আইডি: <strong className="font-mono text-teal-950">{effectiveGroupId}</strong></span>
                  </span>

                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                  >
                    <span>লিংকটি টেস্ট করে দেখুন</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Instructions Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-xs text-slate-600 shadow-2xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  <span>কাউন্সিলর ও সাব-কাউন্সিলর যৌথ সংযোগ প্রক্রিয়া:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="h-5 w-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">১</span>
                    <h5 className="font-bold text-slate-800 text-xs">লিংক শেয়ার</h5>
                    <p className="text-[11px] text-slate-500">আপনার বা সাব-কাউন্সিলরের লিংক শিক্ষার্থীদের পাঠিয়ে দিন।</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="h-5 w-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">২</span>
                    <h5 className="font-bold text-slate-800 text-xs">যৌথ সংযোগ</h5>
                    <p className="text-[11px] text-slate-500">শিক্ষার্থী লিংকে ক্লিক করা মাত্রই আপনার ও সাব-কাউন্সিলরের চ্যাট তৈরি হয়ে যাবে।</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="h-5 w-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">৩</span>
                    <h5 className="font-bold text-slate-800 text-xs">উভয়ের সাথে কথা</h5>
                    <p className="text-[11px] text-slate-500">শিক্ষার্থী প্রয়োজনে আপনার অথবা সাব-কাউন্সিলর উভয়ের সাথেই কথা বলতে পারবে।</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: PROFILE MANAGEMENT                                */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="max-w-xl mx-auto space-y-4 animate-in fade-in bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs"
            >
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="h-4 w-4 text-teal-600" />
                <span>কাউন্সিলর প্রোফাইল তথ্য আপডেট</span>
              </h3>

              {profileMsg && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  {profileMsg}
                </p>
              )}

              {/* Photo Picker */}
              <div className="flex items-center gap-4">
                <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-2xl border-2 border-teal-300 bg-slate-100 flex items-center justify-center font-bold text-teal-700 text-2xl shadow-inner">
                  {photoURL ? (
                    <img src={photoURL} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <GraduationCap className="h-9 w-9 text-teal-600" />
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{photoUploading ? 'প্রসেসিং...' : 'নতুন ছবি আপলোড করুন'}</span>
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ক্লিয়ার ও স্পষ্ট প্রোফাইল পিকচার শিক্ষার্থীদের কাছে বিশ্বাসযোগ্যতা বাড়ায়।
                  </p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  আপনার নাম (কাউন্সিলর হিসেবে যা দেখাবে)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নিবন্ধিত মোবাইল নাম্বার (পরিবর্তন অযোগ্য)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    disabled
                    value={counselor.phone}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-9 pr-3 text-xs text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {/* ======================================================== */}
              {/* TRUSTED MODE SETTINGS                                   */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-5 mt-2 border-t-2 border-slate-200">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 shadow-xs">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    <span>ট্রাস্টেড অপশন (স্টুডেন্ট রিকোয়েস্ট)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    এটি অন করলে শিক্ষার্থীরা রেফারেল লিংক দিয়ে যুক্ত হওয়ার পর প্রথমে আপনার কাছে একটি রিকোয়েস্ট আসবে। আপনি একসেপ্ট না করা পর্যন্ত তারা চ্যাট করতে পারবে না।
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">ট্রাস্টেড অপশন (Trusted Mode)</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isTrustedModeOn ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isTrustedModeOn ? 'চালু (Active)' : 'বন্ধ (Off)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          অনুমতি ছাড়া নতুন শিক্ষার্থীরা চ্যাট করতে পারবে না।
                        </p>
                      </div>
                    </div>
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsTrustedModeOn(!isTrustedModeOn)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isTrustedModeOn ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isTrustedModeOn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* AUTO MESSAGE & AI MESSAGE SETTINGS                      */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-5 mt-2 border-t-2 border-slate-200">
                <div className="bg-gradient-to-r from-teal-50 to-indigo-50 p-4 rounded-2xl border border-teal-100/80 shadow-xs">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    <span>অটো রেসপন্ডার সেটিংস (অফলাইন / অনুপস্থিত সাপোর্ট)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    কাউন্সিলর যখন ওয়েবসাইট বা চ্যাটে উপস্থিত থাকবেন না (অফলাইনে থাকবেন), তখন এই স্বয়ংক্রিয় বটের মাধ্যমে শিক্ষার্থীর চ্যাটে অটোমেটিক মেসেজ চলে যাবে।
                  </p>
                </div>

                {/* 1. AUTO MESSAGE TOGGLE CARD */}
                <div className="p-5 rounded-2xl bg-white border border-teal-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-teal-600 text-white shrink-0 shadow-xs">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">অটো মেসেজ (Auto Message)</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              autoReplyEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {autoReplyEnabled ? 'চালু (Active)' : 'বন্ধ (Off)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          অনুপস্থিতিতে শিক্ষার্থী চ্যাট করলে স্বয়ংক্রিয় ওয়েটিং মেসেজ পাঠাবে।
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoReplyEnabled ? 'bg-teal-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          autoReplyEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {autoReplyEnabled && (
                    <div className="pt-1 animate-in fade-in space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        অটো মেসেজ বার্তাটি কাস্টমাইজ করুন:
                      </label>
                      <textarea
                        rows={3}
                        value={autoReplyText}
                        onChange={(e) => setAutoReplyText(e.target.value)}
                        placeholder="Hi {name}! অনুগ্রহ করে একটু অপেক্ষা করবেন..."
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none transition resize-none font-sans"
                      />
                      <p className="text-[11px] text-slate-500">
                        💡 ইউজারের নাম বসাতে লেখাটির ভেতরে <strong>{'{name}'}</strong> কোডটি ব্যবহার করুন।
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. AI MESSAGE TOGGLE CARD */}
                <div className="p-5 rounded-2xl bg-white border border-indigo-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">এআই মেসেজ (AI Auto Assistant)</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              aiReplyEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {aiReplyEnabled ? 'চালু (Active)' : 'বন্ধ (Off)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          কাজের তালিকা (১৩টি কাজ), মিটিং সময়সূচী (১১টা, ৩টা, ৭টা) ও গুগল মিট সহায়তা।
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setAiReplyEnabled(!aiReplyEnabled)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        aiReplyEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          aiReplyEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {aiReplyEnabled && (
                    <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-2 animate-in fade-in">
                      <p className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span>এআই স্বয়ংক্রিয়ভাবে যেসকল উত্তর প্রদান করবে:</span>
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-800 font-medium pl-1">
                        <li><strong>১৩টি কাজ:</strong> ইমেইল সেলিং, ফটো এডিটিং, ডাটা এন্ট্রি, ফর্ম ফিলাপ, টাইপিং জব, ডিজিটাল মার্কেটিং, ভিডিও এডিটিং, প্রোডাক্ট সেলিং, নেটওয়ার্ক মার্কেটিং, মাইক্রো জবস, মডারেটর জব, কোড বসানো, গেমিং মার্কেটিং।</li>
                        <li><strong>৩টি মিটিং সময়সূচী:</strong> বেলা ১১:০০ টা, বিকাল ৩:০০ টা এবং সন্ধ্যা ৭:০০ টা।</li>
                        <li><strong>গুগল মিট নির্দেশিকা:</strong> Google Meet ইনস্টলেশন গাইড ও সেমিনার নির্বাচন।</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingProfile ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল আপডেট করুন'}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 5: PASSWORD / PIN MANAGEMENT                         */}
          {/* ======================================================== */}
          {activeTab === 'password' && (
            <form
              onSubmit={handleSavePassword}
              className="max-w-xl mx-auto space-y-4 animate-in fade-in bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs"
            >
              <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
                <KeyRound className="h-4 w-4 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold">লগইন পাসওয়ার্ড পরিবর্তন</h3>
                  <p className="text-xs text-slate-500">
                    আপনার কাউন্সিলর একাউন্টে প্রবেশের পাসওয়ার্ড গোপনীয়তার সাথে আপডেট করুন।
                  </p>
                </div>
              </div>

              {pinMsg && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  {pinMsg}
                </p>
              )}

              {pinError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                  {pinError}
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নতুন পাসওয়ার্ড / পিন
                </label>
                <input
                  type="password"
                  required
                  placeholder="কমপক্ষে ৪ সংখ্যার পিন"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-800 font-mono focus:border-teal-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  কনফার্ম পাসওয়ার্ড / পিন
                </label>
                <input
                  type="password"
                  placeholder="পুনরায় নতুন পিন লিখুন"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-800 font-mono focus:border-teal-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={savingPin}
                className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingPin ? 'পাসওয়ার্ড সেভ হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
              </button>
            </form>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-200 bg-white p-3 px-5 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            ইউনিটি আর্নিং অফিশিয়াল কাউন্সিলিং পোর্টাল • গ্রুপ কোড: <strong className="font-mono text-slate-700">{effectiveGroupId}</strong>
          </span>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </div>

      {/* Block Student Confirmation Modal */}
      {studentToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">শিক্ষার্থী ও ডিভাইস ব্লক নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-500">ইউজার এবং তার ব্যবহৃত ডিভাইস সম্পূর্ণ ব্লক করা হবে</p>
              </div>
            </div>

            <div className="rounded-xl bg-red-50/70 border border-red-200/80 p-3 text-xs text-red-800 space-y-1">
              <p>
                আপনি কি নিশ্চিতভাবে <strong>"{studentToBlock.name}"</strong> ({studentToBlock.phone || 'নম্বরবিহীন'})-কে ব্লক করতে চান?
              </p>
              <p className="text-[11px] text-red-700">
                ⚠️ ব্লক করার সাথে সাথে তার একাউন্ট, ডিভাইস আইডি এবং আইপি অ্যাড্রেস ব্লকলিস্টে যুক্ত হবে। সে কোনো রেফারাল লিংক দিয়েও ওয়েবসাইটে প্রবেশ করতে পারবে না।
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ব্লক করার কারণ (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                placeholder="যেমন: নিয়ম লঙ্ঘন বা অনুপযুক্ত আচরণ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStudentToBlock(null);
                  setBlockReasonInput('');
                }}
                disabled={blockActionLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleBlockStudent(studentToBlock, blockReasonInput)}
                disabled={blockActionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {blockActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>ব্লক হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-3.5 w-3.5" />
                    <span>হ্যাঁ, ব্লক করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
