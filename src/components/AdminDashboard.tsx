import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  Plus,
  Key,
  LogOut,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  MessageSquare,
  Lock,
  Loader2,
  CheckSquare,
  Square,
  Sparkles,
  Link as LinkIcon,
  Phone,
  User as UserIcon,
  Upload,
  ChevronDown,
  Filter,
  Bell,
  MessageCircle,
  Image as ImageIcon,
  Youtube,
  Ban,
  Globe,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { generateCounselorLink, COUNSELOR_UID } from '../utils/counselor';
import { AdminPushNotificationManager } from './AdminPushNotificationManager';
import { TopNotificationBanner } from './TopNotificationBanner';
import { getYouTubeEmbedUrl } from '../utils/youtube';
import { blockUserAndDevice, unblockUserAndDevice, unblockAllUsersAndEntities } from '../utils/security';

interface AdminDashboardProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  companyLogoUrl?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  companyLogoUrl: initialLogoUrl = '',
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'students' | 'counselors' | 'blocked' | 'links' | 'notifications'>('students');
  const [blockedSearchQuery, setBlockedSearchQuery] = useState('');

  // Data state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [counselorsList, setCounselorsList] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('all');

  // Multi-selection state for students
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Action status state
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // New Counselor / Sub-Counselor Form state
  const [showCreateCounselor, setShowCreateCounselor] = useState(false);
  const [counselorRole, setCounselorRole] = useState<'main_counselor' | 'sub_counselor'>('main_counselor');
  const [counselorName, setCounselorName] = useState('');
  const [counselorPhone, setCounselorPhone] = useState('');
  const [counselorPin, setCounselorPin] = useState('1234');
  const [counselorPhoto, setCounselorPhoto] = useState('');
  const [selectedParentCounselorId, setSelectedParentCounselorId] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [savingCounselor, setSavingCounselor] = useState(false);
  const [counselorFormError, setCounselorFormError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Edit Counselor PIN state
  const [editingCounselor, setEditingCounselor] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Deletion modals
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // System Links & Security state
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(initialLogoUrl);
  const [blockMultipleAccountsPerDevice, setBlockMultipleAccountsPerDevice] = useState(true);
  const [unblockAllUsers, setUnblockAllUsers] = useState(false);
  const [unblockAllToggling, setUnblockAllToggling] = useState(false);
  const [unblockAllDbLoading, setUnblockAllDbLoading] = useState(false);
  const [showUnblockAllConfirm, setShowUnblockAllConfirm] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);

  // Fetch all admin data
  const fetchAdminData = async () => {
    setLoadingData(true);
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(query(usersRef, limit(800)));

      const fetchedUsers: UserProfile[] = [];
      const fetchedCounselors: UserProfile[] = [];

      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        u.uid = d.id;

        const isCounselor =
          u.isCounselor ||
          u.role === 'main_counselor' ||
          u.role === 'sub_counselor' ||
          d.id.startsWith('counselor_') ||
          d.id.startsWith('sub_counselor_') ||
          d.id === COUNSELOR_UID;

        if (isCounselor && u.uid !== 'admin_root') {
          fetchedCounselors.push(u);
        } else if (u.uid !== 'admin_root') {
          fetchedUsers.push(u);
        }
      });

      // Sort students by creation date desc
      fetchedUsers.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setUsersList(fetchedUsers);
      setCounselorsList(fetchedCounselors);

      // Fetch system links
      try {
        const configSnap = await getDoc(doc(db, 'settings', 'systemConfig'));
        if (configSnap.exists()) {
          const cfg = configSnap.data();
          if (cfg.whatsappChannelUrl) setWhatsappChannelUrl(cfg.whatsappChannelUrl);
          if (cfg.telegramUrl) setTelegramUrl(cfg.telegramUrl);
          if (cfg.facebookPageUrl) setFacebookPageUrl(cfg.facebookPageUrl);
          if (cfg.supportEmail) setSupportEmail(cfg.supportEmail);
          if (cfg.youtubeVideoUrl) setYoutubeVideoUrl(cfg.youtubeVideoUrl);
          if (cfg.companyLogoUrl) setCompanyLogoUrl(cfg.companyLogoUrl);
          if (cfg.blockMultipleAccountsPerDevice !== undefined) {
            setBlockMultipleAccountsPerDevice(Boolean(cfg.blockMultipleAccountsPerDevice));
          }
          if (cfg.unblockAllUsers !== undefined) {
            setUnblockAllUsers(Boolean(cfg.unblockAllUsers));
          }
        }
      } catch {}
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setActionError('তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    // Real-time listener for system configuration & logo
    const unsub = onSnapshot(
      doc(db, 'settings', 'systemConfig'),
      (snap) => {
        if (snap.exists()) {
          const cfg = snap.data();
          if (cfg.whatsappChannelUrl !== undefined) setWhatsappChannelUrl(cfg.whatsappChannelUrl);
          if (cfg.telegramUrl !== undefined) setTelegramUrl(cfg.telegramUrl);
          if (cfg.facebookPageUrl !== undefined) setFacebookPageUrl(cfg.facebookPageUrl);
          if (cfg.supportEmail !== undefined) setSupportEmail(cfg.supportEmail);
          if (cfg.youtubeVideoUrl !== undefined) setYoutubeVideoUrl(cfg.youtubeVideoUrl);
          if (cfg.companyLogoUrl !== undefined) setCompanyLogoUrl(cfg.companyLogoUrl);
          if (cfg.blockMultipleAccountsPerDevice !== undefined) {
            setBlockMultipleAccountsPerDevice(Boolean(cfg.blockMultipleAccountsPerDevice));
          }
          if (cfg.unblockAllUsers !== undefined) {
            setUnblockAllUsers(Boolean(cfg.unblockAllUsers));
          }
        }
      },
      (err) => console.warn('Admin systemConfig listener notice:', err)
    );

    return () => unsub();
  }, []);

  // Filtered students
  const filteredStudents = usersList.filter((u) => {
    const matchesSearch =
      !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCounselor =
      counselorFilter === 'all' ||
      u.counselorId === counselorFilter ||
      (counselorFilter === 'unassigned' && !u.counselorId);

    return matchesSearch && matchesCounselor;
  });

  // Multi-selection handlers
  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredStudents.map((u) => u.uid)));
    }
  };

  const handleToggleSelectUser = (uid: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // Delete Single User or Counselor
  const handleConfirmSingleDelete = async () => {
    if (!userToDelete) return;
    setActionLoading(userToDelete.uid);
    try {
      // First, block the user permanently so they cannot return even after deletion
      await blockUserAndDevice(
        userToDelete,
        'চিফ এডমিন',
        'একাউন্টটি ডিলিট ও ডিভাইস স্থায়ীভাবে ব্লক করা হয়েছে'
      );
      
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      setUsersList((prev) => prev.filter((u) => u.uid !== userToDelete.uid));
      setCounselorsList((prev) => prev.filter((u) => u.uid !== userToDelete.uid));
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userToDelete.uid);
        return next;
      });

      setActionSuccess(`"${userToDelete.name}" একাউন্টটি সফলভাবে মুছে ফেলা হয়েছে।`);
      setUserToDelete(null);
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      console.error('Delete error:', err);
      setActionError('মুছে ফেলতে ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Selected Students
  const handleConfirmDeleteSelected = async () => {
    if (selectedUserIds.size === 0) return;
    setBulkDeleting(true);
    setActionError('');
    try {
      const uidsToDelete: string[] = Array.from(selectedUserIds);
      // We need to map UID to UserProfile to block them properly
      const usersToDeleteProfiles = usersList.filter(u => selectedUserIds.has(u.uid));

      const batchSize = 25;
      for (let i = 0; i < usersToDeleteProfiles.length; i += batchSize) {
        const chunk = usersToDeleteProfiles.slice(i, i + batchSize);
        await Promise.all(
          chunk.map(async (u) => {
            await blockUserAndDevice(u, 'চিফ এডমিন', 'এডমিন দ্বারা সিলেক্টেড ডিলিট ও ব্লক');
            await deleteDoc(doc(db, 'users', u.uid));
          })
        );
      }

      setUsersList((prev) => prev.filter((u) => !selectedUserIds.has(u.uid)));
      setActionSuccess(`নির্বাচিত ${uidsToDelete.length} জন শিক্ষার্থীর ডাটা সফলভাবে মুছে ফেলা হয়েছে!`);
      setSelectedUserIds(new Set());
      setShowDeleteSelectedModal(false);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Delete selected error:', err);
      setActionError('নির্বাচিত ডাটা মুছতে সমস্যা হয়েছে।');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Delete All Normal Students
  const handleConfirmDeleteAll = async () => {
    setBulkDeleting(true);
    setActionError('');
    try {
      const normalStudents = usersList.filter(
        (u) => !u.isCounselor && u.role !== 'main_counselor' && u.role !== 'sub_counselor' && u.uid !== 'admin_root'
      );

      if (normalStudents.length === 0) {
        setActionSuccess('মুছে ফেলার মতো কোনো শিক্ষার্থীর তথ্য পাওয়া যায়নি।');
        setShowDeleteAllModal(false);
        setBulkDeleting(false);
        return;
      }

      const batchSize = 25;
      for (let i = 0; i < normalStudents.length; i += batchSize) {
        const chunk = normalStudents.slice(i, i + batchSize);
        await Promise.all(
          chunk.map(async (u) => {
            await blockUserAndDevice(u, 'চিফ এডমিন', 'এডমিন দ্বারা সম্পূর্ণ ডিলিট ও ব্লক');
            await deleteDoc(doc(db, 'users', u.uid));
          })
        );
      }

      setUsersList([]);
      setSelectedUserIds(new Set());
      setActionSuccess(`সকল সাধারণ শিক্ষার্থীর ডাটা (${normalStudents.length}টি) সফলভাবে ডিলিট করা হয়েছে!`);
      setShowDeleteAllModal(false);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Delete all error:', err);
      setActionError('সকল ডাটা ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Block / Unblock User and device infrastructure
  const handleToggleBlock = async (user: UserProfile) => {
    setActionLoading(user.uid);
    try {
      const newStatus = !user.isBlocked;
      const now = new Date().toISOString();

      if (newStatus) {
        await blockUserAndDevice(user, 'চিফ এডমিন', 'এডমিন প্যানেল থেকে ব্লক করা হয়েছে');
      } else {
        await unblockUserAndDevice(user, 'চিফ এডমিন');
      }

      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                isBlocked: newStatus,
                blockedAt: newStatus ? now : undefined,
                blockedBy: newStatus ? 'চিফ এডমিন' : undefined,
                blockedReason: newStatus ? 'এডমিন প্যানেল থেকে ব্লক করা হয়েছে' : undefined,
              }
            : u
        )
      );
      setCounselorsList((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                isBlocked: newStatus,
                blockedAt: newStatus ? now : undefined,
                blockedBy: newStatus ? 'চিফ এডমিন' : undefined,
              }
            : u
        )
      );

      setActionSuccess(
        `"${user.name}" এবং তার ডিভাইস সফলভাবে ${newStatus ? 'ব্লক' : 'আনব্লক'} করা হয়েছে।`
      );
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      console.error('Toggle block error:', err);
      setActionError('স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Global Unblock All Mode
  const handleToggleUnblockAllMode = async (newVal: boolean) => {
    setUnblockAllToggling(true);
    try {
      await setDoc(
        doc(db, 'settings', 'systemConfig'),
        {
          unblockAllUsers: newVal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setUnblockAllUsers(newVal);
      if (newVal) {
        setActionSuccess(
          'আনব্লক অল ইউজার্স মোড চালু করা হয়েছে! এখন সকল ইউজার ও রেফারাল লিংকের ভিজিটর কোনো বাধা ছাড়া অ্যাপ ব্যবহার করতে পারবে।'
        );
      } else {
        setActionSuccess(
          'ব্লক সিকিউরিটি পুনরায় সক্রিয় করা হয়েছে। যাদের পূর্বে বা বর্তমানে ব্লক করা হয়েছে তারা অ্যাপ ব্যবহার করতে পারবে না।'
        );
      }
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      console.error('Toggle unblock all error:', err);
      setActionError('সেটিংস পরিবর্তন করতে ব্যর্থ হয়েছে।');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setUnblockAllToggling(false);
    }
  };

  // Wipe all blocks in database
  const handleWipeAllBlocksInDatabase = async () => {
    setUnblockAllDbLoading(true);
    try {
      const result = await unblockAllUsersAndEntities('চিফ এডমিন');

      // Update local states
      setUsersList((prev) =>
        prev.map((u) => ({
          ...u,
          isBlocked: false,
          blockedReason: undefined,
          blockedAt: undefined,
          blockedBy: undefined,
        }))
      );
      setCounselorsList((prev) =>
        prev.map((c) => ({
          ...c,
          isBlocked: false,
          blockedReason: undefined,
          blockedAt: undefined,
          blockedBy: undefined,
        }))
      );

      setShowUnblockAllConfirm(false);
      setActionSuccess(
        `সফলভাবে ${result.unblockedUsersCount} জন ইউজার এবং ${result.clearedEntitiesCount}টি ডিভাইস/আইপি রেকর্ড ডাটাবেজ থেকে সম্পূর্ণ আনব্লক করা হয়েছে!`
      );
      setTimeout(() => setActionSuccess(''), 6000);
    } catch (err) {
      console.error('Error wiping blocks:', err);
      setActionError('সকলকে আনব্লক করার সময় সমস্যা হয়েছে।');
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setUnblockAllDbLoading(false);
    }
  };

  // Photo Upload Handler for Counselor
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCounselorPhoto(base64);
      setPhotoUploading(false);
    };
    reader.onerror = () => {
      setCounselorFormError('ছবি আপলোড করতে ব্যর্থ হয়েছে।');
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Create Counselor or Sub-Counselor Account
  const handleCreateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselorName.trim() || !counselorPhone.trim() || !counselorPin.trim()) {
      setCounselorFormError('নাম, ফোন নাম্বার এবং পাসওয়ার্ড/পিন আবশ্যক।');
      return;
    }

    setSavingCounselor(true);
    setCounselorFormError('');

    try {
      const cleanPhone = counselorPhone.replace(/[^\d]/g, '');
      const isSub = counselorRole === 'sub_counselor';
      const uid = isSub ? `sub_counselor_${cleanPhone}` : `counselor_${cleanPhone}`;
      const now = new Date().toISOString();

      let groupId = `GROUP_${Math.floor(1000 + Math.random() * 9000)}`;
      let parentCounselorId = '';

      if (isSub && selectedParentCounselorId) {
        const parent = counselorsList.find((c) => c.uid === selectedParentCounselorId);
        if (parent) {
          groupId = parent.counselorGroupId || groupId;
          parentCounselorId = parent.uid;
        }
      }

      const newProfile: UserProfile = {
        uid,
        name: counselorName.trim(),
        phone: counselorPhone.trim(),
        photoURL:
          counselorPhoto ||
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        isBlocked: false,
        isOnline: true,
        isCounselor: true,
        role: isSub ? 'sub_counselor' : 'main_counselor',
        counselorGroupId: groupId,
        referralCode: groupId,
        counselorPin: counselorPin.trim(),
        createdAt: now,
        lastActiveAt: now,
        ...(parentCounselorId ? { parentCounselorId } : {}),
      };

      await setDoc(doc(db, 'users', uid), newProfile);

      setActionSuccess(
        `${isSub ? 'সাব-কাউন্সিলর' : 'প্রধান কাউন্সেলর'} "${counselorName}" সফলভাবে তৈরি হয়েছে! পাসওয়ার্ড: ${counselorPin}`
      );
      setShowCreateCounselor(false);
      setCounselorName('');
      setCounselorPhone('');
      setCounselorPin('1234');
      setCounselorPhoto('');
      setSelectedParentCounselorId('');
      await fetchAdminData();
      setTimeout(() => setActionSuccess(''), 4500);
    } catch (err: unknown) {
      console.error('Create counselor error:', err);
      setCounselorFormError(err instanceof Error ? err.message : 'কাউন্সিলর একাউন্ট তৈরি করা যায়নি।');
    } finally {
      setSavingCounselor(false);
    }
  };

  // Save Edited Counselor PIN / Info
  const handleSaveEditCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounselor) return;
    if (!editName.trim() || !editPhone.trim() || !editPin.trim()) {
      setActionError('নাম, ফোন ও পাসওয়ার্ড খালি রাখা যাবে না।');
      return;
    }

    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'users', editingCounselor.uid), {
        name: editName.trim(),
        phone: editPhone.trim(),
        counselorPin: editPin.trim(),
        lastActiveAt: new Date().toISOString(),
      });

      setCounselorsList((prev) =>
        prev.map((c) =>
          c.uid === editingCounselor.uid
            ? { ...c, name: editName.trim(), phone: editPhone.trim(), counselorPin: editPin.trim() }
            : c
        )
      );

      setActionSuccess(`"${editName}" এর পাসওয়ার্ড ও তথ্য সফলভাবে আপডেট হয়েছে!`);
      setEditingCounselor(null);
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      console.error('Edit counselor error:', err);
      setActionError('কাউন্সিলর তথ্য আপডেট করা সম্ভব হয়নি।');
    } finally {
      setSavingEdit(false);
    }
  };

  // Save System Links
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow up to 25MB files from gallery
    if (file.size > 25 * 1024 * 1024) {
      setActionError('ফাইলের সাইজ ২৫ MB এর চেয়ে বেশি। দয়া করে ২৫ MB এর নিচের ছবি নির্বাচন করুন।');
      return;
    }

    setLogoUploading(true);
    setLogoUploadProgress(10);

    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        setLogoUploadProgress(40);
        const img = new Image();
        img.onload = () => {
          setLogoUploadProgress(70);
          // Resize and compress via HTML5 canvas to keep size ultra-light while crisp
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Export as high quality PNG/JPEG
            const optimizedDataUrl = file.type === 'image/png' 
              ? canvas.toDataURL('image/png')
              : canvas.toDataURL('image/jpeg', 0.92);

            setCompanyLogoUrl(optimizedDataUrl);
            setLogoUploading(false);
            setLogoUploadProgress(100);
            setActionSuccess('লোগো সফলভাবে প্রস্তুত হয়েছে! এখন নিচে "লিংকসমূহ সংরক্ষণ করুন" বাটনে ক্লিক করুন।');
            setTimeout(() => setActionSuccess(''), 5000);
          } else {
            // Fallback to original data URL if canvas context fails
            setCompanyLogoUrl(event.target?.result as string);
            setLogoUploading(false);
            setLogoUploadProgress(100);
          }
        };

        img.onerror = () => {
          setActionError('ছবিটি লোড করা সম্ভব হয়নি। অন্য একটি ছবি নির্বাচন করুন।');
          setLogoUploading(false);
        };

        img.src = event.target?.result as string;
      };

      reader.onerror = (error) => {
        console.error('File read error:', error);
        setActionError('লোগো ফাইল পড়তে সমস্যা হয়েছে।');
        setLogoUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Logo upload error:', err);
      setActionError('লোগো প্রসেস করতে সমস্যা হয়েছে।');
      setLogoUploading(false);
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
          youtubeVideoUrl: youtubeVideoUrl.trim(),
          companyLogoUrl: companyLogoUrl.trim(),
          blockMultipleAccountsPerDevice: blockMultipleAccountsPerDevice,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setActionSuccess('কমিউনিটি ও সিকিউরিটি সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      console.error('Save links error:', err);
      setActionError('লিংক সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSavingLinks(false);
    }
  };

  // Copy Referral Link
  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Count Statistics
  const totalStudents = usersList.length;
  const totalCounselors = counselorsList.length;
  const blockedCount = [...usersList, ...counselorsList].filter((u) => u.isBlocked).length;
  const todayRegistrations = usersList.filter((u) => {
    if (!u.createdAt) return false;
    const regDate = new Date(u.createdAt);
    const today = new Date();
    return (
      regDate.getDate() === today.getDate() &&
      regDate.getMonth() === today.getMonth() &&
      regDate.getFullYear() === today.getFullYear()
    );
  }).length;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <TopNotificationBanner />
      {/* TOP HEADER FOR ADMIN */}
      <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-3 sm:px-6 shadow-md z-20">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {companyLogoUrl ? (
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-md">
              <img src={companyLogoUrl} alt="Company Logo" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight truncate">
                চিফ এডমিন ড্যাশবোর্ড
              </h1>
              <span className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-400">
                সুপার কন্ট্রোল
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">
              Unity Earning Live Management Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={fetchAdminData}
            disabled={loadingData}
            className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
            title="ডাটা রিফ্রেশ করুন"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">রিফ্রেশ</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
            title="লগআউট"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </header>

      {/* SUB-HEADER / NAVIGATION TABS */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-3 sm:px-6 py-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-0.5">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>শিক্ষার্থী ও ডাটা ({totalStudents})</span>
          </button>

          <button
            onClick={() => setActiveTab('counselors')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'counselors'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                : 'text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>কাউন্সিলর প্যানেল ({totalCounselors})</span>
          </button>

          <button
            onClick={() => setActiveTab('blocked')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'blocked'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>ব্লক ইউজার ({blockedCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('links')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'links'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>কমিউনিটি ও লিংক</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>ক্রোম পুশ নোটিফিকেশন</span>
          </button>
        </div>

        {/* Global Action Feedback Alert */}
        {actionSuccess && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-xs text-red-400 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="bg-slate-900/40 px-3 sm:px-6 py-2.5 border-b border-slate-800 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-xl sm:rounded-2xl border border-slate-800/90 bg-slate-950/80 p-2.5 sm:p-3.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate block">
              মোট শিক্ষার্থী
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                {totalStudents}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">নিবন্ধিত</span>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-800/90 bg-slate-950/80 p-2.5 sm:p-3.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate block">
              মোট কাউন্সিলর
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-teal-400 font-mono">
                {totalCounselors}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">একাউন্ট</span>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-800/90 bg-slate-950/80 p-2.5 sm:p-3.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate block">
              আজকের নিবন্ধন
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {todayRegistrations}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">নতুন</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('blocked')}
            className="rounded-xl sm:rounded-2xl border border-slate-800/90 bg-slate-950/80 p-2.5 sm:p-3.5 cursor-pointer hover:border-red-500/50 hover:bg-slate-900/80 transition"
            title="ব্লক ইউজার তালিকা দেখুন"
          >
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate block">
              স্থগিত ইউজার
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-red-400 font-mono">
                {blockedCount}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">ব্লকড</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* ========================================================= */}
        {/* TAB 1: ALL STUDENTS & REGISTRATION DATA WITH BULK ACTIONS */}
        {/* ========================================================= */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Toolbar: Search, Filters, Bulk Delete, Delete All */}
            <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-3.5 shadow-md">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="শিক্ষার্থীর নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none transition font-sans"
                  />
                </div>

                {/* Filter by Counselor */}
                <div className="relative shrink-0">
                  <select
                    value={counselorFilter}
                    onChange={(e) => setCounselorFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-900 py-2 px-3 text-xs text-slate-300 focus:border-sky-500 focus:outline-none transition cursor-pointer"
                  >
                    <option value="all">সকল কাউন্সিলর ফিল্টার</option>
                    <option value="unassigned">কাউন্সিলর ছাড়া (সরাসরি)</option>
                    {counselorsList.map((c) => (
                      <option key={c.uid} value={c.uid}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons: Delete Selected & Delete All */}
              <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-850">
                <div className="text-[11px] text-slate-400 font-medium sm:hidden">
                  ফলাফল: <span className="text-white font-bold">{filteredStudents.length}</span> জন
                </div>

                <div className="flex items-center gap-2">
                  {selectedUserIds.size > 0 && (
                    <button
                      onClick={() => setShowDeleteSelectedModal(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-red-600/30 transition cursor-pointer animate-in fade-in"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>সিলেক্টেড ({selectedUserIds.size}) মুছুন</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowDeleteAllModal(true)}
                    disabled={usersList.length === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400 transition cursor-pointer disabled:opacity-40"
                    title="সকল সাধারণ শিক্ষার্থীর ডাটা একবারে ডিলিট করুন"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>অল ডিলিট</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Selection Bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 md:hidden text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-slate-300 hover:text-white font-medium cursor-pointer"
              >
                {selectedUserIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-sky-400" />
                ) : (
                  <Square className="h-4 w-4 text-slate-500" />
                )}
                <span>সব সিলেক্ট করুন ({selectedUserIds.size}/{filteredStudents.length})</span>
              </button>
            </div>

            {/* Students Data: Mobile Cards (< md) */}
            <div className="space-y-2.5 md:hidden">
              {loadingData ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 py-10 text-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-sky-400" />
                  <span className="text-xs">ডাটা লোড হচ্ছে...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 py-10 text-center text-slate-400 text-xs">
                  কোনো শিক্ষার্থীর ডাটা পাওয়া যায়নি।
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedUserIds.has(student.uid);
                  const assignedCounselor = counselorsList.find(
                    (c) => c.uid === student.counselorId
                  );
                  const formattedDate = student.createdAt
                    ? new Date(student.createdAt).toLocaleString('bn-BD', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'তথ্য নেই';

                  const rawPhone = student.phone.replace(/[^0-9]/g, '');

                  return (
                    <div
                      key={student.uid}
                      className={`rounded-2xl border p-3.5 transition space-y-3 ${
                        isSelected
                          ? 'border-sky-500/60 bg-sky-950/20'
                          : 'border-slate-800 bg-slate-950'
                      }`}
                    >
                      {/* Top Header in Card */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectUser(student.uid)}
                            className="text-slate-400 hover:text-white transition p-0.5"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-sky-400" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-600" />
                            )}
                          </button>

                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-sky-900/50 flex items-center justify-center font-bold text-sky-300 text-xs">
                            {student.photoURL ? (
                              <img
                                src={student.photoURL}
                                alt={student.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              student.name.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-white text-sm leading-tight">
                              {student.name}
                            </h4>
                            <div className="text-[10px] text-slate-500 font-mono">
                              আইডি: {student.uid.slice(0, 10)}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {student.isBlocked ? (
                            <span className="rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
                              স্থগিত
                            </span>
                          ) : student.isOnline ? (
                            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              অনলাইন
                            </span>
                          ) : (
                            <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              অফলাইন
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details row: Phone & Counselor */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-900">
                        <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">মোবাইল</span>
                          <span className="font-mono font-bold text-slate-200 text-[11px]">
                            {student.phone}
                          </span>
                        </div>

                        <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">কাউন্সিলর</span>
                          <span className="font-semibold text-teal-400 text-[11px] truncate block">
                            {assignedCounselor ? assignedCounselor.name : 'সরাসরি পোর্টাল'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom row: Time & Quick Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900 text-xs">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formattedDate}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {rawPhone && (
                            <a
                              href={`https://wa.me/${rawPhone.startsWith('88') ? rawPhone : '88' + rawPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-1.5 text-emerald-400 hover:bg-emerald-500/20"
                              title="হোয়াটসঅ্যাপে চ্যাট করুন"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => handleToggleBlock(student)}
                            disabled={actionLoading === student.uid}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                              student.isBlocked
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {student.isBlocked ? 'সক্রিয়' : 'স্থগিত'}
                          </button>

                          <button
                            onClick={() => setUserToDelete(student)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                            title="মুছুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Students Table: Desktop (>= md) */}
            <div className="hidden md:block rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-slate-400 hover:text-white transition p-1"
                          title="সব সিলেক্ট করুন"
                        >
                          {selectedUserIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                            <CheckSquare className="h-4 w-4 text-sky-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-500" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4">শিক্ষার্থীর নাম</th>
                      <th className="py-3 px-4">মোবাইল / হোয়াটসঅ্যাপ</th>
                      <th className="py-3 px-4">নির্ধারিত কাউন্সিলর</th>
                      <th className="py-3 px-4">রেজিস্ট্রেশন তারিখ ও সময়</th>
                      <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {loadingData ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-sky-400" />
                          <span>শিক্ষার্থীদের ডাটা লোড হচ্ছে...</span>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          কোনো শিক্ষার্থীর ডাটা পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = selectedUserIds.has(student.uid);
                        const assignedCounselor = counselorsList.find(
                          (c) => c.uid === student.counselorId
                        );

                        const formattedDate = student.createdAt
                          ? new Date(student.createdAt).toLocaleString('bn-BD', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'তথ্য নেই';

                        return (
                          <tr
                            key={student.uid}
                            className={`transition ${
                              isSelected
                                ? 'bg-sky-950/40 border-sky-800'
                                : 'hover:bg-slate-900/60'
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectUser(student.uid)}
                                className="text-slate-400 hover:text-white transition p-1"
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-sky-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-slate-600" />
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-sky-900/50 flex items-center justify-center font-bold text-sky-300 text-xs">
                                  {student.photoURL ? (
                                    <img
                                      src={student.photoURL}
                                      alt={student.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    student.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-white leading-tight">
                                    {student.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    ID: {student.uid.slice(0, 10)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono text-slate-300 font-medium">
                              {student.phone}
                            </td>

                            <td className="py-3 px-4">
                              {assignedCounselor ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-[11px] font-semibold text-teal-300">
                                    {assignedCounselor.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500">
                                  {student.counselorId ? `আইডি: ${student.counselorId}` : 'সরাসরি পোর্টাল'}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-slate-400 text-xs">
                              {formattedDate}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {student.isBlocked ? (
                                <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[11px] font-bold text-red-400">
                                  স্থগিত
                                </span>
                              ) : student.isOnline ? (
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                                  অনলাইন
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                  অফলাইন
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleBlock(student)}
                                  disabled={actionLoading === student.uid}
                                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                    student.isBlocked
                                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                      : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                  }`}
                                  title={student.isBlocked ? 'সক্রিয় করুন' : 'স্থগিত করুন'}
                                >
                                  {student.isBlocked ? 'সক্রিয়' : 'স্থগিত'}
                                </button>

                                <button
                                  onClick={() => setUserToDelete(student)}
                                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                                  title="এই শিক্ষার্থীর ডাটা মুছুন"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COUNSELORS & SUB-COUNSELORS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'counselors' && (
          <div className="space-y-4">
            {/* Header / Add Counselor Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-md">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-400" />
                  <span>কাউন্সিলর ও সাব-কাউন্সিলর একাউন্ট পরিচালনা</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  এখান থেকে নতুন কাউন্সেলর তৈরি, পাসওয়ার্ড পরিবর্তন ও একাউন্ট সম্পূর্ণ ডিলিট করা যাবে।
                </p>
              </div>

              <button
                onClick={() => setShowCreateCounselor(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-teal-600/30 hover:opacity-95 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>নতুন কাউন্সেলর একাউন্ট ক্রিয়েট</span>
              </button>
            </div>

            {/* Counselors Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {counselorsList.map((counselor) => {
                const isSub = counselor.role === 'sub_counselor';
                const shareLink = generateCounselorLink(
                  counselor.referralCode || counselor.counselorGroupId || counselor.uid
                );
                const isCopied = copiedLink === counselor.uid;
                const parentCounselor = counselor.parentCounselorId
                  ? counselorsList.find((c) => c.uid === counselor.parentCounselorId)
                  : null;

                return (
                  <div
                    key={counselor.uid}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-md hover:border-slate-700 transition space-y-3.5"
                  >
                    {/* Top Row: Avatar, Name, Role, Delete Button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 border-teal-500/40 bg-teal-950 flex items-center justify-center font-bold text-teal-300 shadow-md">
                          {counselor.photoURL ? (
                            <img
                              src={counselor.photoURL}
                              alt={counselor.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            counselor.name.charAt(0).toUpperCase()
                          )}
                          <span
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 ${
                              counselor.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-white leading-tight">
                              {counselor.name}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isSub
                                  ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                                  : 'bg-teal-500/15 border border-teal-500/30 text-teal-300'
                              }`}
                            >
                              {isSub ? 'সাব-কাউন্সিলর' : 'প্রধান কাউন্সেলর'}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-400">
                            <Phone className="h-3 w-3 text-slate-500" />
                            <span>{counselor.phone}</span>
                          </div>

                          {isSub && parentCounselor && (
                            <div className="text-[10px] text-teal-400/90 mt-0.5">
                              মূল লিডার: {parentCounselor.name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete Counselor Button */}
                      <button
                        onClick={() => setUserToDelete(counselor)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                        title="কাউন্সিলর একাউন্ট ডিলিট করুন"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* PIN & Password Display with Change Button */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-slate-400">লগইন পাসওয়ার্ড / পিন:</span>
                        <span className="font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-md">
                          {counselor.counselorPin || '1234'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setEditingCounselor(counselor);
                          setEditName(counselor.name);
                          setEditPhone(counselor.phone);
                          setEditPin(counselor.counselorPin || '1234');
                        }}
                        className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition cursor-pointer"
                      >
                        পরিবর্তন
                      </button>
                    </div>

                    {/* Referral Share Link with 1-Click Copy */}
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>কাউন্সিলরের রেফারেল লিংক:</span>
                        <span className="font-mono text-teal-400">
                          গ্রুপ: {counselor.counselorGroupId || counselor.referralCode || 'অফিসিয়াল'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareLink}
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
                        />

                        <button
                          onClick={() => handleCopyLink(shareLink, counselor.uid)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-teal-600/20 border border-teal-500/30 text-teal-300 hover:bg-teal-600/30'
                          }`}
                        >
                          {isCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? 'কপি হয়েছে' : 'কপি'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: BLOCKED USERS & DEVICE SECURITY MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'blocked' && (
          <div className="space-y-4">
            {/* MASTER UNBLOCK ALL USERS CONTROL CARD */}
            <div
              className={`rounded-2xl border transition-all p-4 sm:p-5 shadow-lg space-y-4 ${
                unblockAllUsers
                  ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 ring-1 ring-emerald-500/30'
                  : 'border-slate-800 bg-slate-950'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl shrink-0 transition-colors ${
                      unblockAllUsers
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10'
                        : 'bg-red-500/15 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {unblockAllUsers ? <Unlock className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                        <span>আনব্লক অল ইউজার্স (Unblock All Users)</span>
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
                          unblockAllUsers
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            unblockAllUsers ? 'bg-emerald-400 animate-ping' : 'bg-red-400'
                          }`}
                        />
                        {unblockAllUsers
                          ? 'আনব্লক মোড সক্রিয় (সবাই ব্যবহার করতে পারছে)'
                          : 'ব্লক সিস্টেম কার্যকর'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {unblockAllUsers
                        ? '🟢 এই অপশনটি অন (ON) থাকায় সিস্টেমের সব ব্লক সাময়িকভাবে স্থগিত রয়েছে — যাদের পূর্বে ব্লক করা হয়েছিল তারা সহ সবাই রেফারাল লিংক ও অ্যাপ ব্যবহার করতে পারছে।'
                        : '🔴 এই অপশনটি অফ (OFF) থাকায় স্বাভাবিক ব্লক সিকিউরিটি কার্যকর রয়েছে — যাদের ব্লক করা হয়েছে তারা কোনো রেফারাল লিংক বা অ্যাপে ঢুকতে পারবে না।'}
                    </p>
                  </div>
                </div>

                {/* Master Switch */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800">
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">
                      {unblockAllUsers ? 'আনব্লক অল: ON' : 'আনব্লক অল: OFF'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {unblockAllUsers ? 'সবাইকে এক্সেস দেওয়া হয়েছে' : 'ব্লক করা ইউজাররা ব্লকড'}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unblockAllUsers}
                      disabled={unblockAllToggling}
                      onChange={(e) => handleToggleUnblockAllMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 border border-slate-700"></div>
                  </label>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    ডাটাবেজের সকল ব্লকড ইউজার ও ডিভাইসের তথ্য স্থায়ীভাবে মুছে ফেলতে নিচের বাটনটি চাপুন:
                  </span>
                </p>

                <button
                  type="button"
                  onClick={() => setShowUnblockAllConfirm(true)}
                  disabled={unblockAllDbLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition shadow-md shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
                  title="ডাটাবেজ থেকে সমস্ত ব্লকড ইউজার ও ডিভাইসের তথ্য মুছে সবাইকে স্বাভাবিক করুন"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>সকলকে ডাটাবেজে আনব্লক করুন (Unblock All Users)</span>
                </button>
              </div>
            </div>

            {/* Header / Search Controls */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    <span>ব্লক ইউজার তালিকা ও ডিভাইস সিকিউরিটি</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    এই ইউজারদের একাউন্ট, ডিভাইস আইডি এবং আইপি অ্যাড্রেস ব্লকলিস্টে রয়েছে।
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-400">
                    মোট ব্লকড: {usersList.filter((u) => u.isBlocked).length} জন
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="ব্লকড ইউজারের নাম, মোবাইল, আইপি অ্যাড্রেস বা ডিভাইস আইডি দিয়ে খুঁজুন..."
                  value={blockedSearchQuery}
                  onChange={(e) => setBlockedSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:outline-none transition font-sans"
                />
              </div>
            </div>

            {/* Blocked Users Table / List */}
            {(() => {
              const allUsersAndCounselors = [...usersList, ...counselorsList];
              const blockedList = allUsersAndCounselors.filter((u) => {
                if (!u.isBlocked) return false;
                if (!blockedSearchQuery.trim()) return true;
                const q = blockedSearchQuery.toLowerCase();
                return (
                  u.name?.toLowerCase().includes(q) ||
                  u.phone?.toLowerCase().includes(q) ||
                  (u.ipAddress && u.ipAddress.toLowerCase().includes(q)) ||
                  (u.deviceId && u.deviceId.toLowerCase().includes(q))
                );
              });

              if (loadingData) {
                return (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-red-400" />
                    <span className="text-xs">ব্লকড ইউজার ডাটা লোড হচ্ছে...</span>
                  </div>
                );
              }

              if (blockedList.length === 0) {
                return (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-12 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white">বর্তমানে কোনো ব্লক করা ইউজার নেই</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {blockedSearchQuery
                        ? 'আপনার সার্চ করা তথ্যের সাথে মিল রেখে কোনো ব্লকড ইউজার পাওয়া যায়নি।'
                        : 'সকল শিক্ষার্থী ও কাউন্সিলর একাউন্ট স্বাভাবিক ও সক্রিয় রয়েছে।'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-md">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">ইউজারের নাম ও মোবাইল</th>
                          <th className="py-3 px-4">ডিভাইস আইডি ও আইপি</th>
                          <th className="py-3 px-4">ব্লক করার তারিখ</th>
                          <th className="py-3 px-4">ব্লক করেছেন</th>
                          <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                          <th className="py-3 px-4 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {blockedList.map((user) => {
                          const formattedDate = user.blockedAt
                            ? new Date(user.blockedAt).toLocaleString('bn-BD', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : user.lastActiveAt
                            ? new Date(user.lastActiveAt).toLocaleString('bn-BD', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'তারিখ নেই';

                          return (
                            <tr key={user.uid} className="hover:bg-slate-900/60 transition">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-red-500/40 bg-red-950/40 flex items-center justify-center font-bold text-red-400 text-xs">
                                    {user.photoURL ? (
                                      <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
                                    ) : (
                                      user.name.charAt(0)
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      <span>{user.name}</span>
                                      <span className="rounded bg-red-500/20 text-red-400 text-[10px] px-1 font-mono">
                                        ব্লকড
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                      {user.phone || 'নম্বর নেই'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  {user.ipAddress ? (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
                                      <Globe className="h-3 w-3 text-sky-400 shrink-0" />
                                      <span>IP: {user.ipAddress}</span>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-500">আইপি রেকর্ড নেই</div>
                                  )}
                                  {user.deviceId ? (
                                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]" title={user.deviceId}>
                                      Dev: {user.deviceId.slice(0, 16)}...
                                    </div>
                                  ) : null}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-[11px] text-slate-400">
                                {formattedDate}
                              </td>

                              <td className="py-3 px-4 text-xs font-semibold text-slate-300">
                                {user.blockedBy || 'চিফ এডমিন'}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                                  <Ban className="h-3 w-3" />
                                  <span>সম্পূর্ণ নিষিদ্ধ</span>
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleToggleBlock(user)}
                                    disabled={actionLoading === user.uid}
                                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                                    title="একাউন্ট ও ডিভাইস আনব্লক করুন"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>আনব্লক করুন</span>
                                  </button>

                                  <button
                                    onClick={() => setUserToDelete(user)}
                                    className="rounded-xl border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                                    title="ডাটা স্থায়ীভাবে মুছুন"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="grid grid-cols-1 gap-3 md:hidden">
                    {blockedList.map((user) => (
                      <div
                        key={user.uid}
                        className="rounded-2xl border border-red-500/20 bg-slate-950 p-3.5 space-y-3 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-red-500/40 bg-red-950/40 flex items-center justify-center font-bold text-red-400 text-sm">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                user.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <span>{user.name}</span>
                                <span className="rounded bg-red-500/20 text-red-400 text-[10px] px-1 font-mono">
                                  ব্লকড
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                {user.phone || 'নম্বর নেই'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1">
                          {user.ipAddress && (
                            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                              <Globe className="h-3 w-3 text-sky-400 shrink-0" />
                              <span>IP: {user.ipAddress}</span>
                            </div>
                          )}
                          <div className="text-slate-400">
                            ব্লক করেছেন: <span className="text-white font-semibold">{user.blockedBy || 'চিফ এডমিন'}</span>
                          </div>
                          {user.blockedAt && (
                            <div className="text-slate-500 text-[10px]">
                              তারিখ: {new Date(user.blockedAt).toLocaleString('bn-BD')}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-850">
                          <button
                            onClick={() => handleToggleBlock(user)}
                            disabled={actionLoading === user.uid}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>আনব্লক করুন</span>
                          </button>

                          <button
                            onClick={() => setUserToDelete(user)}
                            className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SYSTEM LINKS & SOCIALS */}
        {/* ========================================================= */}
        {activeTab === 'links' && (
          <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-md space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <LinkIcon className="h-4 w-4 text-emerald-400" />
              <span>কমিউনিটি, ডিভাইস সিকিউরিটি ও সিস্টেম সেটিংস</span>
            </h2>

            {/* SECURITY TOGGLE CARD: Multi-Account Creation Control */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${blockMultipleAccountsPerDevice ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      এক ডিভাইস থেকে একাধিক অ্যাকাউন্ট খোলা প্রতিরোধ (Device Security)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {blockMultipleAccountsPerDevice
                        ? 'চালু (ON): এক ডিভাইস থেকে কেবল একটি অ্যাকাউন্ট খোলা যাবে (মাল্টিপল অ্যাকাউন্ট ব্লক করা থাকবে)।'
                        : 'বন্ধ (OFF): এক ডিভাইস থেকে আনলিমিটেড একাধিক অ্যাকাউন্ট খোলা যাবে।'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={blockMultipleAccountsPerDevice}
                    onChange={(e) => setBlockMultipleAccountsPerDevice(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="text-[11px] font-medium pt-1 border-t border-amber-500/20 flex items-center gap-1.5 text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {blockMultipleAccountsPerDevice
                    ? 'সিকিউরিটি অপশন ON আছে। একই ডিভাইস থেকে একাধিক নতুন অ্যাকাউন্ট খোলা বন্ধ থাকবে।'
                    : 'সিকিউরিটি অপশন OFF আছে। একই ডিভাইস থেকে একাধিক অ্যাকাউন্ট খোলা যাবে।'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSystemLinks} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  হোয়াটসঅ্যাপ চ্যানেল বা গ্রুপ লিংক (WhatsApp Channel URL)
                </label>
                <input
                  type="url"
                  placeholder="https://whatsapp.com/channel/..."
                  value={whatsappChannelUrl}
                  onChange={(e) => setWhatsappChannelUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  টেলিগ্রাম গ্রুপ বা চ্যানেল লিংক (Telegram Channel URL)
                </label>
                <input
                  type="url"
                  placeholder="https://t.me/..."
                  value={telegramUrl}
                  onChange={(e) => setTelegramUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  অফিশিয়াল সাপোর্ট ইমেইল (Support Email)
                </label>
                <input
                  type="email"
                  placeholder="unityearning13@gmail.com"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Youtube className="h-4 w-4 text-red-500" />
                  <span>অফিশিয়াল কাজ শেখার ইউটিউব ভিডিও লিংক (YouTube Video URL)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeVideoUrl}
                  onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:outline-none transition"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  শিক্ষার্থীদের রেফারেল পোর্টালে এই ভিডিওটি ছোট স্ক্রিনে সরাসরি ওয়েবসাইটের ভেতরেই চলবে (ইউটিউবে নিয়ে যাবে না)।
                </p>
                {youtubeVideoUrl && getYouTubeEmbedUrl(youtubeVideoUrl) && (
                  <div className="mt-2.5 p-2 rounded-xl border border-slate-800 bg-slate-950">
                    <p className="text-[10px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>ভিডিও প্রিভিউ (লাইভ এমবেড প্লেয়ার):</span>
                    </p>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(youtubeVideoUrl)!}
                        title="Video Preview"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  অফিশিয়াল ফেসবুক পেজ লিংক (Facebook Page URL)
                </label>
                <input
                  type="url"
                  placeholder="https://www.facebook.com/..."
                  value={facebookPageUrl}
                  onChange={(e) => setFacebookPageUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    কোম্পানির লোগো আপলোড (Upload Company Logo)
                  </label>
                  <span className="text-[11px] text-slate-400">সর্বোচ্চ ২০-২৫ MB সাইজ গ্রহণযোগ্য</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  {companyLogoUrl ? (
                    <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                      <img src={companyLogoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer disabled:opacity-50 transition"
                    />
                    {companyLogoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyLogoUrl('');
                          setActionSuccess('লোগো সরানো হয়েছে। "লিংকসমূহ সংরক্ষণ করুন" বাটনে ক্লিক করে সেভ করুন।');
                          setTimeout(() => setActionSuccess(''), 4000);
                        }}
                        className="px-2.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl border border-red-800/40 transition shrink-0"
                        title="লোগো ডিলিট করুন"
                      >
                        মুছুন
                      </button>
                    )}
                  </div>
                </div>
                {logoUploading && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${logoUploadProgress}%` }}></div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingLinks}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {savingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>লিংকসমূহ সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: BROWSER PUSH NOTIFICATIONS & SCHEDULER */}
        {/* ========================================================= */}
        {activeTab === 'notifications' && (
          <div className="max-w-5xl">
            <AdminPushNotificationManager />
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CREATE COUNSELOR / SUB-COUNSELOR ACCOUNT */}
      {/* ========================================================= */}
      {showCreateCounselor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-teal-400" />
                <span>নতুন কাউন্সেলর একাউন্ট তৈরি</span>
              </h3>
              <button
                onClick={() => setShowCreateCounselor(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {counselorFormError && (
              <div className="mt-3 rounded-xl bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-400">
                {counselorFormError}
              </div>
            )}

            <form onSubmit={handleCreateCounselor} className="mt-4 space-y-3.5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  একাউন্টের ধরণ নির্বাচন করুন
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCounselorRole('main_counselor')}
                    className={`rounded-xl border p-2.5 text-xs font-bold text-center transition cursor-pointer ${
                      counselorRole === 'main_counselor'
                        ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    প্রধান কাউন্সেলর (Main)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounselorRole('sub_counselor')}
                    className={`rounded-xl border p-2.5 text-xs font-bold text-center transition cursor-pointer ${
                      counselorRole === 'sub_counselor'
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    সাব-কাউন্সিলর (Sub)
                  </button>
                </div>
              </div>

              {/* If Sub-Counselor, select Parent Counselor */}
              {counselorRole === 'sub_counselor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    প্রধান লিডার নির্বাচন করুন
                  </label>
                  <select
                    value={selectedParentCounselorId}
                    onChange={(e) => setSelectedParentCounselorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">কোনো প্রধান কাউন্সেলরের অধীনে যোগ করুন...</option>
                    {counselorsList
                      .filter((c) => c.role !== 'sub_counselor')
                      .map((c) => (
                        <option key={c.uid} value={c.uid}>
                          {c.name} ({c.phone}) - {c.counselorGroupId}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  কাউন্সিলরের পুরো নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ সাব্বির আহমেদ"
                  value={counselorName}
                  onChange={(e) => setCounselorName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  লগইন মোবাইল নাম্বার <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="যেমন: 017XXXXXXXX"
                  value={counselorPhone}
                  onChange={(e) => setCounselorPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Password / PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  লগইন পাসওয়ার্ড / পিন <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="পাসওয়ার্ড লিখুন (যেমন: 1234)"
                  value={counselorPin}
                  onChange={(e) => setCounselorPin(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  প্রোফাইল ছবি (ঐচ্ছিক)
                </label>
                <div className="flex items-center gap-3">
                  {counselorPhoto ? (
                    <img
                      src={counselorPhoto}
                      alt="Preview"
                      className="h-10 w-10 rounded-full object-cover border border-teal-500"
                    />
                  ) : null}
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{photoUploading ? 'আপলোড হচ্ছে...' : 'ছবি নির্বাচন করুন'}</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateCounselor(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingCounselor}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
                >
                  {savingCounselor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>অ্যাকাউন্ট তৈরি সম্পন্ন করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT COUNSELOR PASSWORD & DETAILS */}
      {/* ========================================================= */}
      {editingCounselor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                <span>কাউন্সিলর পাসওয়ার্ড ও তথ্য আপডেট</span>
              </h3>
              <button
                onClick={() => setEditingCounselor(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCounselor} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  কাউন্সিলরের নাম
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  লগইন মোবাইল নাম্বার
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-3 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  নতুন পাসওয়ার্ড / পিন
                </label>
                <input
                  type="text"
                  required
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full rounded-xl border border-amber-500/50 bg-amber-950/20 py-2.5 px-3 text-xs text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCounselor(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  <span>পাসওয়ার্ড সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CONFIRM DELETE SINGLE USER OR COUNSELOR */}
      {/* ========================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-slate-950 p-5 shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h4 className="text-center text-sm font-bold text-white">
              একাউন্ট ডিলিট নিশ্চিতকরণ
            </h4>
            <p className="mt-1 text-center text-xs text-slate-400">
              আপনি কি নিশ্চিত যে <span className="text-white font-bold font-mono">{userToDelete.name}</span> ({userToDelete.phone}) এর একাউন্টটি স্থায়ীভাবে ডিলিট করতে চান?
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-900"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={actionLoading === userToDelete.uid}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === userToDelete.uid ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CONFIRM DELETE SELECTED STUDENTS */}
      {/* ========================================================= */}
      {showDeleteSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-slate-950 p-5 shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <h4 className="text-center text-sm font-bold text-white">
              সিলেক্টেড ডাটা ডিলিট নিশ্চিতকরণ
            </h4>
            <p className="mt-1 text-center text-xs text-slate-400">
              আপনি <span className="text-red-400 font-bold font-mono">{selectedUserIds.size}</span> জন শিক্ষার্থীর ডাটা সিলেক্ট করেছেন। এটি ডিলিট করলে এই শিক্ষার্থীদের সকল তথ্য স্থায়ীভাবে মুছে যাবে।
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteSelectedModal(false)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-900"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelected}
                disabled={bulkDeleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? 'ডিলিট হচ্ছে...' : 'সিলেক্টেড ডিলিট'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNBLOCK ALL DATABASE CONFIRMATION MODAL */}
      {showUnblockAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/40 bg-slate-950 p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">সকল ইউজারকে ডাটাবেজে আনব্লক করবেন?</h3>
                <p className="text-xs text-slate-400">ডিভাইস ও আইপি ব্লক তালিকা সম্পূর্ণ পরিষ্কার</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-300 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              এই অপশনে নিশ্চিত করলে পূর্বে ব্লক করা সকল ইউজার একাউন্ট, ডিভাইস আইডি এবং আইপি অ্যাড্রেস ব্লকলিস্ট থেকে চিরতরে মুছে যাবে। ফলে প্রত্যেকে মুক্তভাবে রেফারাল লিংক ও অ্যাপ ব্যবহার করতে পারবে।
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={unblockAllDbLoading}
                onClick={() => setShowUnblockAllConfirm(false)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={unblockAllDbLoading}
                onClick={handleWipeAllBlocksInDatabase}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {unblockAllDbLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>আনব্লক হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>হ্যাঁ, সবাইকে আনব্লক করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: CONFIRM DELETE ALL NORMAL STUDENTS */}
      {/* ========================================================= */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-red-500/50 bg-slate-950 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h4 className="text-center text-base font-bold text-white">
              সতর্কতা! সকল শিক্ষার্থীর ডাটা ডিলিট
            </h4>
            <p className="mt-2 text-center text-xs text-slate-400 leading-relaxed">
              আপনি কি নিশ্চিত যে <span className="text-red-400 font-bold">সকল সাধারণ শিক্ষার্থী ({usersList.length} জন)</span> এর ডাটা সম্পূর্ণভাবে মুছে ফেলতে চান? কাউন্সিলর এবং এডমিন একাউন্ট অপরিবর্তিত থাকবে। এই কাজটি অপরিবর্তনীয়।
            </p>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-900"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={bulkDeleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/40"
              >
                {bulkDeleting ? 'সব ডিলিট হচ্ছে...' : 'হ্যাঁ, অল ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
