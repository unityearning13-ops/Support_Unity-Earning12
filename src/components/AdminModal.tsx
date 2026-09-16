import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, AdminStats } from '../types';
import {
  X as CloseIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  Loader2 as LoaderIcon,
  Users as UsersIcon,
  UserCheck as UserCheckIcon,
  UserX as UserXIcon,
  Radio as RadioIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as AlertTriangleIcon,
  RefreshCw as RefreshCwIcon,
  Link as LinkIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  Plus as PlusIcon,
  Camera as CameraIcon,
  Trash2 as TrashIcon,
  GraduationCap as CounselorIcon,
  ExternalLink as ExternalLinkIcon,
  Edit2 as EditIcon,
  Key as KeyIcon,
  Bell as BellIcon,
} from 'lucide-react';
import { compressImage } from '../utils/media';
import { generateCounselorLink, COUNSELOR_UID, COUNSELOR_PROFILE } from '../utils/counselor';
import { AdminPushNotificationManager } from './AdminPushNotificationManager';

interface AdminModalProps {
  currentUid: string;
  isAdminLoggedIn: boolean;
  onAdminLoginSuccess: (token: string) => void;
  onAdminLogout: () => void;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  currentUid,
  isAdminLoggedIn,
  onAdminLoginSuccess,
  onAdminLogout,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'counselors' | 'users' | 'links' | 'stats' | 'notifications'>('counselors');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // System Links state (WhatsApp Channel, Telegram, Email, Facebook)
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState('https://whatsapp.com/channel/0029VbB4RqI3mFY5nkzbCs0প');
  const [telegramUrl, setTelegramUrl] = useState('https://t.me/unityearning12');
  const [facebookPageUrl, setFacebookPageUrl] = useState('https://www.facebook.com/unityearning');
  const [supportEmail, setSupportEmail] = useState('unityearning13@gmail.com');
  const [savingLinks, setSavingLinks] = useState(false);

  // Dashboard state
  const [loadingData, setLoadingData] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [counselorsList, setCounselorsList] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    onlineUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    newRegistrationsToday: 0,
    totalCounselors: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [copiedCounselorId, setCopiedCounselorId] = useState<string | null>(null);

  // New Counselor Form state
  const [showAddCounselor, setShowAddCounselor] = useState(true);
  const [counselorName, setCounselorName] = useState('');
  const [counselorPhone, setCounselorPhone] = useState('');
  const [counselorPin, setCounselorPin] = useState('1234');
  const [counselorPhoto, setCounselorPhoto] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [savingCounselor, setSavingCounselor] = useState(false);
  const [counselorFormError, setCounselorFormError] = useState('');
  const counselorPhotoInputRef = useRef<HTMLInputElement>(null);

  // Edit Counselor state
  const [editingCounselor, setEditingCounselor] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Counselor / Users state
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Delete All Normal Users Handler
  const handleDeleteAllUsers = async () => {
    setDeletingAll(true);
    setDeleteError('');
    try {
      const normalUsers = usersList.filter((u) => !u.isCounselor && u.uid !== 'admin_root');
      
      if (normalUsers.length === 0) {
        setActionSuccess('মুছে ফেলার মতো কোনো সাধারণ ব্যবহারকারী পাওয়া যায়নি।');
        setShowDeleteAllConfirm(false);
        setTimeout(() => setActionSuccess(''), 3000);
        return;
      }

      // Use a loop to delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < normalUsers.length; i += batchSize) {
        const batch = normalUsers.slice(i, i + batchSize);
        // We could use writeBatch here, but since we are in a loop and potentially have many, 
        // individual deletes or a more complex batching strategy is needed.
        // For simplicity and to avoid hitting the 500 limit across the whole loop if not careful,
        // we'll use Promise.all for smaller chunks.
        await Promise.all(batch.map(u => deleteDoc(doc(db, 'users', u.uid))));
      }

      setActionSuccess(`সকল সাধারণ ব্যবহারকারী একাউন্ট (${normalUsers.length}টি) সফলভাবে মুছে ফেলা হয়েছে।`);
      setShowDeleteAllConfirm(false);
      await fetchAdminData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: unknown) {
      console.error('Delete all users error:', err);
      setDeleteError(err instanceof Error ? err.message : 'সকল সাধারণ ব্যবহারকারী মুছতে সমস্যা হয়েছে।');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleSaveSystemLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLinks(true);
    try {
      await setDoc(
        doc(db, 'settings', 'systemConfig'),
        {
          whatsappChannelUrl: whatsappChannelUrl.trim(),
          telegramUrl: telegramUrl.trim(),
          facebookPageUrl: facebookPageUrl.trim(),
          supportEmail: supportEmail.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setActionSuccess('কমিউনিটি হোয়াটসঅ্যাপ ও টেলিগ্রাম লিংক সফলভাবে সেভ হয়েছে!');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Save links error:', err);
    } finally {
      setSavingLinks(false);
    }
  };

  // Fetch admin dashboard data
  const fetchAdminData = async () => {
    setLoadingData(true);
    try {
      try {
        const cfgSnap = await getDoc(doc(db, 'settings', 'systemConfig'));
        if (cfgSnap.exists()) {
          const cfg = cfgSnap.data();
          if (cfg.whatsappChannelUrl) setWhatsappChannelUrl(cfg.whatsappChannelUrl);
          if (cfg.telegramUrl) setTelegramUrl(cfg.telegramUrl);
          if (cfg.facebookPageUrl) setFacebookPageUrl(cfg.facebookPageUrl);
          if (cfg.supportEmail) setSupportEmail(cfg.supportEmail);
        }
      } catch (err) {
        console.warn('System config load notice:', err);
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      const users: UserProfile[] = [];
      const counselors: UserProfile[] = [];
      let online = 0;
      let blocked = 0;
      let newToday = 0;
      let active = 0;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      let hasOfficialCounselor = false;

      usersSnap.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        users.push(u);

        if (u.isCounselor || u.uid === COUNSELOR_UID) {
          counselors.push(u);
          if (u.uid === COUNSELOR_UID) hasOfficialCounselor = true;
        }

        if (u.isOnline) online++;
        if (u.isBlocked) blocked++;
        if (u.createdAt && u.createdAt >= oneDayAgo) newToday++;
        if (u.lastActiveAt && u.lastActiveAt >= sevenDaysAgo) active++;
      });

      if (!hasOfficialCounselor) {
        counselors.unshift(COUNSELOR_PROFILE);
      }

      let totalConvs = 0;
      try {
        const convSnap = await getDocs(collection(db, 'conversations'));
        totalConvs = convSnap.size;
      } catch {
        // Fallback
      }

      setUsersList(users);
      setCounselorsList(counselors);
      setStats({
        totalUsers: users.length,
        activeUsers: active,
        blockedUsers: blocked,
        onlineUsers: online,
        totalConversations: totalConvs,
        totalMessages: totalConvs * 8,
        newRegistrationsToday: newToday,
        totalCounselors: counselors.length,
      });
    } catch (err: unknown) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminData();
    }
  }, [isAdminLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, uid: currentUid }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'পাসওয়ার্ড সঠিক নয়।');
      }

      try {
        await setDoc(doc(db, 'admins', currentUid), {
          uid: currentUid,
          role: 'admin',
          createdAt: new Date().toISOString(),
        });
      } catch {
        // If already admin
      }

      onAdminLoginSuccess(data.token);
    } catch (err: unknown) {
      console.error('Admin login error:', err);
      setLoginError(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে।');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Counselor Photo Upload
  const handleCounselorPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setCounselorFormError('');
    try {
      const compressedData = await compressImage(file, 400, 0.75);
      setCounselorPhoto(compressedData);
    } catch (err) {
      console.error('Photo compress error:', err);
      setCounselorFormError('ছবি প্রসেস করা সম্ভব হয়নি।');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Create Counselor Account
  const handleCreateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselorName.trim() || !counselorPhone.trim() || !counselorPin.trim()) {
      setCounselorFormError('নাম, নাম্বার এবং পাসওয়ার্ড তিনটি তথ্যই আবশ্যক।');
      return;
    }

    setSavingCounselor(true);
    setCounselorFormError('');

    try {
      const cleanPhone = counselorPhone.replace(/[^\d]/g, '');
      const counselorUid = `counselor_${cleanPhone}`;
      const now = new Date().toISOString();
      const groupId = `GROUP_${Math.floor(1000 + Math.random() * 9000)}`;

      const newCounselorProfile: UserProfile = {
        uid: counselorUid,
        name: counselorName.trim(),
        phone: counselorPhone.trim(),
        photoURL: counselorPhoto || '',
        isBlocked: false,
        isOnline: true,
        isCounselor: true,
        role: 'main_counselor',
        counselorGroupId: groupId,
        referralCode: groupId,
        counselorPin: counselorPin.trim(),
        createdAt: now,
        lastActiveAt: now,
      };

      await setDoc(doc(db, 'users', counselorUid), newCounselorProfile);

      setActionSuccess(`কাউন্সিলর "${counselorName}" সফলভাবে তৈরি হয়েছে! তার পাসওয়ার্ড: ${counselorPin}`);
      setShowAddCounselor(false);
      setCounselorName('');
      setCounselorPhone('');
      setCounselorPin('1234');
      setCounselorPhoto('');
      await fetchAdminData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: unknown) {
      console.error('Create counselor error:', err);
      setCounselorFormError(err instanceof Error ? err.message : 'কাউন্সিলর একাউন্ট তৈরি করা যায়নি।');
    } finally {
      setSavingCounselor(false);
    }
  };

  // Edit Counselor & Change Password
  const handleSaveEditCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounselor) return;
    if (!editName.trim() || !editPhone.trim() || !editPin.trim()) {
      setEditError('নাম, ফোন ও পাসওয়ার্ড খালি রাখা যাবে না।');
      return;
    }

    setSavingEdit(true);
    setEditError('');
    try {
      const updates = {
        name: editName.trim(),
        phone: editPhone.trim(),
        counselorPin: editPin.trim(),
        lastActiveAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'users', editingCounselor.uid), updates);

      setCounselorsList((prev) =>
        prev.map((c) => (c.uid === editingCounselor.uid ? { ...c, ...updates } : c))
      );

      setActionSuccess(`কাউন্সিলর "${editName}" এর তথ্য ও পাসওয়ার্ড আপডেট হয়েছে।`);
      setEditingCounselor(null);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Edit counselor error:', err);
      setEditError(err instanceof Error ? err.message : 'কাউন্সিলর আপডেট করা যায়নি।');
    } finally {
      setSavingEdit(false);
    }
  };

  // Copy Counselor Link to clipboard
  const handleCopyLink = (counselor: UserProfile) => {
    const link = generateCounselorLink(counselor.referralCode || counselor.uid);
    navigator.clipboard.writeText(link);
    setCopiedCounselorId(counselor.uid);
    setTimeout(() => setCopiedCounselorId(null), 2500);
  };

  // Toggle user block status
  const handleToggleBlock = async (user: UserProfile) => {
    setActionLoading(user.uid);
    setActionSuccess('');
    const newStatus = !user.isBlocked;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBlocked: newStatus,
        lastActiveAt: new Date().toISOString(),
      });

      setUsersList((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, isBlocked: newStatus } : u))
      );

      setStats((prev) => ({
        ...prev,
        blockedUsers: newStatus ? prev.blockedUsers + 1 : Math.max(0, prev.blockedUsers - 1),
      }));

      setActionSuccess(
        newStatus
          ? `ব্যবহারকারী "${user.name}" এর একাউন্ট স্থগিত করা হয়েছে।`
          : `ব্যবহারকারী "${user.name}" এর একাউন্ট পুনরায় সক্রিয় করা হয়েছে।`
      );

      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: unknown) {
      console.error('Failed to toggle block:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete User / Counselor Account Execution
  const confirmDeleteUser = async () => {
    if (!deletingUser) return;

    setActionLoading(deletingUser.uid);
    setDeleteError('');
    try {
      await deleteDoc(doc(db, 'users', deletingUser.uid));

      setUsersList((prev) => prev.filter((u) => u.uid !== deletingUser.uid));
      setCounselorsList((prev) => prev.filter((u) => u.uid !== deletingUser.uid));

      setActionSuccess(`"${deletingUser.name}" একাউন্টটি সম্পূর্ণ মুছে ফেলা হয়েছে।`);
      setDeletingUser(null);
      await fetchAdminData();
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err: unknown) {
      console.error('Delete user error:', err);
      setDeleteError(err instanceof Error ? err.message : 'একাউন্ট মুছতে সমস্যা হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-5 backdrop-blur-xs">
      <div
        id="admin-modal"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <ShieldIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                এডমিন ও কাউন্সিলর নিয়ন্ত্রণ প্যানেল
              </h2>
              <p className="text-[11px] text-slate-500">
                Unity Earning Live Chat Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminLoggedIn && (
              <button
                onClick={fetchAdminData}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                title="তথ্য রিফ্রেশ করুন"
              >
                <RefreshCwIcon className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              id="close-admin-modal-btn"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Admin Login View */}
        {!isAdminLoggedIn ? (
          <div className="p-6 sm:p-8">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <LockIcon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">এডমিন প্রমাণীকরণ</h3>
              <p className="mt-1 text-xs text-slate-500">
                এডমিন পাসওয়ার্ড দিন। সার্ভারে নিরাপদে যাচাই করা হবে।
              </p>

              {loginError && (
                <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertTriangleIcon className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-4 space-y-3">
                <input
                  id="admin-password-input"
                  type="password"
                  required
                  placeholder="এডমিন পাসওয়ার্ড দিন"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                />

                <button
                  id="admin-login-btn"
                  type="submit"
                  disabled={loginLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {loginLoading ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <LockIcon className="h-4 w-4" />}
                  <span>ড্যাশবোর্ডে প্রবেশ করুন</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Admin Dashboard & Management Tabs */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 pt-3 bg-white">
              <button
                onClick={() => setActiveTab('counselors')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'counselors'
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CounselorIcon className="h-4 w-4" />
                <span>কাউন্সিলর একাউন্ট ও লিংক ({counselorsList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'users'
                    ? 'border-sky-600 text-sky-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UsersIcon className="h-4 w-4" />
                <span>সকল ব্যবহারকারী ({filteredUsers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('links')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'links'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                <span>কমিউনিটি ও সোশ্যাল লিংক</span>
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'stats'
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <RadioIcon className="h-4 w-4" />
                <span>পরিসংখ্যান</span>
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BellIcon className="h-4 w-4" />
                <span>নোটিফিকেশন ও শিডিউলার</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 flex-1 space-y-4">
              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 animate-in fade-in">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* TAB 1: COUNSELORS MANAGEMENT */}
              {activeTab === 'counselors' && (
                <div className="space-y-4">
                  {/* Create Counselor Button & Form */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        কাউন্সিলর তালিকা ও রেফারেল লিংক
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        কাউন্সিলর তৈরি করুন এবং তাদের আলাদা লিংক শেয়ার করতে পারেন।
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddCounselor(!showAddCounselor)}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition cursor-pointer shadow-xs"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      <span>{showAddCounselor ? 'ফর্ম বন্ধ করুন' : 'নতুন কাউন্সিলর একাউন্ট'}</span>
                    </button>
                  </div>

                  {/* Add Counselor Form Drawer */}
                  {showAddCounselor && (
                    <form
                      onSubmit={handleCreateCounselor}
                      className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-3 animate-in fade-in zoom-in-95"
                    >
                      <h4 className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <CounselorIcon className="h-4 w-4 text-teal-700" />
                        <span>কাউন্সিলর একাউন্ট তৈরি করুন</span>
                      </h4>

                      {counselorFormError && (
                        <p className="text-xs text-red-600 font-semibold">{counselorFormError}</p>
                      )}

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Photo Picker */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-teal-300 bg-white flex items-center justify-center font-bold text-teal-700 text-lg shadow-xs">
                            {counselorPhoto ? (
                              <img src={counselorPhoto} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                              <CounselorIcon className="h-7 w-7 text-teal-600" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => counselorPhotoInputRef.current?.click()}
                            disabled={photoUploading}
                            className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline cursor-pointer"
                          >
                            <CameraIcon className="h-3 w-3" />
                            <span>{photoUploading ? 'প্রসেসিং...' : 'ছবি যুক্ত করুন'}</span>
                          </button>
                          <input
                            ref={counselorPhotoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCounselorPhotoSelect}
                          />
                        </div>

                        {/* Name, Phone, and Password Inputs */}
                        <div className="flex-1 w-full space-y-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              কাউন্সিলরের পুরো নাম *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="যেমন: মোঃ সাব্বির আহমেদ (কাউন্সিলর)"
                              value={counselorName}
                              onChange={(e) => setCounselorName(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none transition"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                মোবাইল নাম্বার (লগইনের জন্য) *
                              </label>
                              <input
                                type="tel"
                                required
                                placeholder="যেমন: 01799887766"
                                value={counselorPhone}
                                onChange={(e) => setCounselorPhone(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none transition font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                লগইন পাসওয়ার্ড / পিন *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="যেমন: 123456"
                                value={counselorPin}
                                onChange={(e) => setCounselorPin(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none transition font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-teal-200/60">
                        <button
                          type="button"
                          onClick={() => setShowAddCounselor(false)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          disabled={savingCounselor}
                          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                        >
                          {savingCounselor ? <LoaderIcon className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
                          <span>কাউন্সিলর সংরক্ষণ করুন</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Edit Counselor Modal */}
                  {editingCounselor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <KeyIcon className="h-4 w-4 text-amber-600" />
                            <span>কাউন্সিলর তথ্য ও পাসওয়ার্ড পরিবর্তন</span>
                          </h4>
                          <button
                            onClick={() => setEditingCounselor(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <CloseIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {editError && (
                          <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg">
                            {editError}
                          </div>
                        )}

                        <form onSubmit={handleSaveEditCounselor} className="mt-4 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              কাউন্সিলরের নাম
                            </label>
                            <input
                              type="text"
                              required
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              লগইন মোবাইল নাম্বার
                            </label>
                            <input
                              type="tel"
                              required
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              নতুন পাসওয়ার্ড / পিন
                            </label>
                            <input
                              type="text"
                              required
                              value={editPin}
                              onChange={(e) => setEditPin(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-800 font-mono bg-amber-50/50 border-amber-200"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingCounselor(null)}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                            >
                              বাতিল
                            </button>
                            <button
                              type="submit"
                              disabled={savingEdit}
                              className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
                            >
                              {savingEdit ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Counselors Cards List */}
                  <div className="grid grid-cols-1 gap-3">
                    {counselorsList.map((counselor) => {
                      const shareLink = generateCounselorLink(counselor.referralCode || counselor.uid);
                      const isCopied = copiedCounselorId === counselor.uid;

                      return (
                        <div
                          key={counselor.uid}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-teal-300 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-teal-300 bg-teal-100 flex items-center justify-center font-bold text-teal-800 shadow-xs">
                                {counselor.photoURL ? (
                                  <img
                                    src={counselor.photoURL}
                                    alt={counselor.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  counselor.name.charAt(0).toUpperCase()
                                )}
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                    {counselor.name}
                                  </h4>
                                  <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                    counselor.role === 'sub_counselor' 
                                      ? 'bg-teal-50 text-teal-600 border border-teal-100' 
                                      : 'bg-teal-100 text-teal-800'
                                  }`}>
                                    {counselor.role === 'sub_counselor' ? 'Sub Counselor' : 'কাউন্সিলর'}
                                  </span>
                                  {counselor.counselorGroupId && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[9px] font-medium text-slate-500 border border-slate-200">
                                      Group: {counselor.counselorGroupId}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-mono text-slate-600">
                                  <span>নাম্বার: <strong>{counselor.phone}</strong></span>
                                  <span>•</span>
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                                    পাসওয়ার্ড: <strong>{counselor.counselorPin || '1234'}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions: Edit Password & Delete Counselor */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingCounselor(counselor);
                                  setEditName(counselor.name);
                                  setEditPhone(counselor.phone);
                                  setEditPin(counselor.counselorPin || '1234');
                                  setEditError('');
                                }}
                                className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                                title="পাসওয়ার্ড পরিবর্তন ও সম্পাদনা"
                              >
                                <EditIcon className="h-3.5 w-3.5" />
                                <span>পাসওয়ার্ড চেঞ্জ</span>
                              </button>

                              <button
                                onClick={() => setDeletingUser(counselor)}
                                disabled={actionLoading === counselor.uid}
                                className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
                                title="কাউন্সিলর একাউন্ট সম্পূর্ণ মুছে ফেলুন"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                <span>ডিলিট</span>
                              </button>
                            </div>
                          </div>

                          {/* Unique Counselor Referral Link Box */}
                          <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/60 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1 text-xs font-mono text-teal-900 truncate">
                              <LinkIcon className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                              <span className="truncate">{shareLink}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleCopyLink(counselor)}
                                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-teal-600 text-white hover:bg-teal-700 shadow-2xs'
                                }`}
                              >
                                {isCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                                <span>{isCopied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
                              </button>

                              <a
                                href={shareLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-teal-200 bg-white p-1 text-teal-700 hover:bg-teal-50 transition"
                                title="লিংকটি টেস্ট করুন"
                              >
                                <ExternalLinkIcon className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: USERS MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <UsersIcon className="h-4 w-4 text-sky-600" />
                      <span>নিবন্ধিত ব্যবহারকারী তালিকা ({filteredUsers.length})</span>
                    </h3>

                    <div className="flex items-center gap-2">
                      {/* Delete All Users Button */}
                      <button
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer shadow-2xs"
                        title="সকল সাধারণ ইউজার একাউন্ট ডিলিট করুন"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        <span>সকল ইউজার ডিলিট</span>
                      </button>

                      {/* Fast Search */}
                      <div className="relative w-full sm:w-52">
                        <SearchIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          id="admin-search-users"
                          type="text"
                          placeholder="নাম, ফোন বা আইডি দিয়ে খুঁজুন..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        কোনো তথ্য পাওয়া যায়নি।
                      </div>
                    ) : (
                      filteredUsers.map((u) => {
                        const connectedCounselor = counselorsList.find((c) => c.uid === u.counselorId);
                        const counselorDisplayName = connectedCounselor
                          ? connectedCounselor.name
                          : (u.counselorId ? `কাউন্সিলর আইডি: ${u.counselorId}` : 'অফিসিয়াল সেমারিং পোর্টাল');
                        const createdAtFormatted = u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('bn-BD', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'তারিখ তথ্য নাই';

                        return (
                          <div
                            key={u.uid}
                            className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-sky-100 flex items-center justify-center font-bold text-sky-700 text-xs shadow-2xs">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.name} className="h-full w-full object-cover" />
                                ) : (
                                  u.name.charAt(0).toUpperCase()
                                )}
                                <span
                                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                                    u.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                  }`}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {u.name}
                                  </span>
                                  {u.isCounselor && (
                                    <span className="rounded-sm bg-teal-100 px-1 py-0.2 text-[9px] font-bold text-teal-800">
                                      কাউন্সিলর
                                    </span>
                                  )}
                                  {u.isBlocked && (
                                    <span className="rounded-sm bg-red-100 px-1 py-0.2 text-[9px] font-bold text-red-700">
                                      স্থগিত
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono truncate">
                                  {u.phone} • ID: {u.uid.slice(0, 10)}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span className="text-teal-700 font-medium">
                                    সংযুক্ত: {counselorDisplayName}
                                  </span>
                                  <span>•</span>
                                  <span className="text-slate-400">
                                    নিবন্ধন: {createdAtFormatted}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                              <button
                                id={`block-toggle-${u.uid}`}
                                onClick={() => handleToggleBlock(u)}
                                disabled={actionLoading === u.uid}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                  u.isBlocked
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                } disabled:opacity-50`}
                              >
                                {actionLoading === u.uid ? (
                                  <LoaderIcon className="h-3 w-3 animate-spin" />
                                ) : u.isBlocked ? (
                                  <UserCheckIcon className="h-3 w-3" />
                                ) : (
                                  <UserXIcon className="h-3 w-3" />
                                )}
                                <span>{u.isBlocked ? 'সক্রিয় করুন' : 'স্থগিত'}</span>
                              </button>

                              <button
                                onClick={() => setDeletingUser(u)}
                                disabled={actionLoading === u.uid}
                                className="rounded-lg border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100 transition cursor-pointer"
                                title="একাউন্ট ডিলিট করুন"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: COMMUNITY & SOCIAL LINKS */}
              {activeTab === 'links' && (
                <form onSubmit={handleSaveSystemLinks} className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                    <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <LinkIcon className="h-4 w-4 text-emerald-600" />
                      <span>হোয়াটসঅ্যাপ কমিউনিটি ও টেলিগ্রাম সোশ্যাল চ্যানেল সেটিং</span>
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      মোবাইল বা পিসির নিচের নেভিগেশন বারের 'কমিউনিটি' এবং 'টেলিগ্রাম' বাটনে ক্লিক করলে যে লিংকগুলোতে ইউজারদের নিয়ে যাওয়া হবে তা এখান থেকে লাইভ পরিবর্তন করতে পারবেন।
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        হোয়াটসঅ্যাপ অফিশিয়াল চ্যানেল / কমিউনিটি লিংক:
                      </label>
                      <input
                        type="text"
                        required
                        value={whatsappChannelUrl}
                        onChange={(e) => setWhatsappChannelUrl(e.target.value)}
                        placeholder="https://whatsapp.com/channel/..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        টেলিগ্রাম ইউজার আইডি বা চ্যানেল লিংক:
                      </label>
                      <input
                        type="text"
                        required
                        value={telegramUrl}
                        onChange={(e) => setTelegramUrl(e.target.value)}
                        placeholder="https://t.me/unityearning12"
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        অফিশিয়াল সাপোর্ট ইমেইল:
                      </label>
                      <input
                        type="email"
                        required
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        placeholder="unityearning13@gmail.com"
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        অফিশিয়াল ফেসবুক পেজ লিংক:
                      </label>
                      <input
                        type="text"
                        required
                        value={facebookPageUrl}
                        onChange={(e) => setFacebookPageUrl(e.target.value)}
                        placeholder="https://www.facebook.com/unityearning"
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={savingLinks}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                      >
                        {savingLinks ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                        <span>লিংকসমূহ সেভ করুন</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 3: STATS OVERVIEW */}
              {activeTab === 'stats' && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-medium">মোট ব্যবহারকারী</span>
                      <UsersIcon className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{stats.totalUsers}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-medium">কাউন্সিলর সংখ্যা</span>
                      <CounselorIcon className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="mt-1 text-lg font-bold text-teal-700">{counselorsList.length}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-medium">অনলাইন আছেন</span>
                      <RadioIcon className="h-4 w-4 text-emerald-600 animate-pulse" />
                    </div>
                    <div className="mt-1 text-lg font-bold text-emerald-700">{stats.onlineUsers}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-[11px] font-medium">স্থগিত একাউন্ট</span>
                      <UserXIcon className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="mt-1 text-lg font-bold text-red-600">{stats.blockedUsers}</div>
                  </div>
                </div>
              )}

              {/* TAB 5: PUSH NOTIFICATIONS & AUTOMATION */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <AdminPushNotificationManager />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-400">
                এডমিন অ্যাক্সেস সুরক্ষিত রয়েছে
              </span>
              <button
                id="admin-logout-btn"
                onClick={onAdminLogout}
                className="rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                এডমিন লগআউট
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Modal for Individual User */}
      {deletingUser && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="rounded-full bg-red-100 p-2.5">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">একাউন্ট মুছে ফেলুন</h3>
                <p className="text-xs text-slate-500">
                  আপনি কি নিশ্চিত যে এই একাউন্টটি ডিলিট করতে চান?
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p><strong>নাম:</strong> {deletingUser.name}</p>
              <p><strong>ফোন:</strong> {deletingUser.phone}</p>
              <p><strong>আইডি:</strong> {deletingUser.uid}</p>
            </div>

            {deleteError && (
              <p className="text-xs text-red-600 font-semibold">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDeletingUser(null);
                  setDeleteError('');
                }}
                disabled={actionLoading === deletingUser.uid}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={actionLoading === deletingUser.uid}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <TrashIcon className="h-4 w-4" />
                <span>{actionLoading === deletingUser.uid ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Users Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="rounded-full bg-red-100 p-2.5">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">সকল সাধারণ ইউজার ডিলিট করুন</h3>
                <p className="text-xs text-slate-500">
                  আপনি কি নিশ্চিত যে সকল সাধারণ ব্যবহারকারীর একাউন্ট একসঙ্গে মুছে ফেলতে চান?
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-bold">⚠️ সতর্কবার্তা:</p>
              <p>
                সকল সাধারণ শিক্ষার্থীর একাউন্ট মুছে ফেলা হবে। কোনো কাউন্সিলর বা এডমিন একাউন্ট ডিলিট হবে না।
              </p>
            </div>

            {deleteError && (
              <p className="text-xs text-red-600 font-semibold">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAllConfirm(false);
                  setDeleteError('');
                }}
                disabled={deletingAll}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteAllUsers}
                disabled={deletingAll}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <TrashIcon className="h-4 w-4" />
                <span>{deletingAll ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
