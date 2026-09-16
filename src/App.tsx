import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Conversation, LevelChat } from './types';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { LevelChatWindow } from './components/LevelChatWindow';
import { CallModal } from './components/CallModal';
import { BlockedScreen } from './components/BlockedScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BottomNav } from './components/BottomNav';
import { UnityBotChat } from './components/UnityBotChat';
import { ChooseCounselor } from './components/ChooseCounselor';
import { CompanyInfoDrawer } from './components/CompanyInfoDrawer';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { sanitizeForFirestore } from './utils/sanitize';

// Lazy loaded components for better performance
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const CounselorDashboard = React.lazy(() => import('./components/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));
const AdminModal = React.lazy(() => import('./components/AdminModal').then(module => ({ default: module.AdminModal })));
const ProfileModal = React.lazy(() => import('./components/ProfileModal').then(module => ({ default: module.ProfileModal })));
const CreateLevelChatModal = React.lazy(() => import('./components/CreateLevelChatModal').then(module => ({ default: module.CreateLevelChatModal })));
const AddContactModal = React.lazy(() => import('./components/AddContactModal').then(module => ({ default: module.AddContactModal })));
import {
  getStoredUserId,
  removeStoredUserId,
  getDeviceId,
  getStoredUserProfile,
  setStoredUserProfile,
  getStoredAdminToken,
  setStoredAdminToken,
  clearStoredAdminToken,
} from './utils/device';
import {
  ensureCounselorConversation,
  ensureGroupConversations,
  ensureCounselorOrGroupConversations,
  COUNSELOR_UID,
} from './utils/counselor';
import { TopNotificationBanner } from './components/TopNotificationBanner';
import { triggerAppNotification } from './utils/notifications';
import { isVisitorBlocked } from './utils/security';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return getStoredUserProfile<UserProfile>();
  });
  const [authInitialized, setAuthInitialized] = useState(false);
  const [visitorBlockedData, setVisitorBlockedData] = useState<{
    isBlocked: boolean;
    reason?: string;
    ipAddress?: string;
    deviceId?: string;
  } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversationsLoading, setConversationsLoading] = useState(true);

  // Bottom Navigation & Links State
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'bot' | 'community' | 'menu'>('home');
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState('https://whatsapp.com/channel/0029VbB4RqI3mFY5nkzbCs0প');
  const [telegramUrl, setTelegramUrl] = useState('https://t.me/unityearning12');
  const [facebookPageUrl, setFacebookPageUrl] = useState('https://www.facebook.com/unityearning');
  const [supportEmail, setSupportEmail] = useState('unityearning13@gmail.com');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [showCompanyDrawer, setShowCompanyDrawer] = useState(false);

  // Level Chats State
  const [levelChats, setLevelChats] = useState<LevelChat[]>([]);
  const [activeLevelChat, setActiveLevelChat] = useState<LevelChat | null>(null);
  const [showCreateLevelChat, setShowCreateLevelChat] = useState(false);

  // Presence map for participant UIDs: { [uid]: { isOnline, lastActiveAt, isBlocked } }
  const [userPresenceMap, setUserPresenceMap] = useState<{
    [uid: string]: { isOnline: boolean; lastActiveAt?: string; isBlocked?: boolean };
  }>({});

  // Modals state
  const [showAddContact, setShowAddContact] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCounselorDashboard, setShowCounselorDashboard] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return getStoredAdminToken();
  });

  // Call modal state
  const [activeCallContact, setActiveCallContact] = useState<{
    contact: UserProfile;
    callId?: string;
    isIncoming?: boolean;
  } | null>(null);

  // Group Referral State
  const [referralGroupId, setReferralGroupId] = useState<string | null>(null);
  const [showChooseCounselor, setShowChooseCounselor] = useState(false);

  const { isOnline } = useOnlineStatus();
  const lastActiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasConversationsLoadedRef = useRef(false);
  const knownConversationsRef = useRef<Record<string, string>>({});
  const activeConversationRef = useRef<Conversation | null>(null);
  const activeLevelChatRef = useRef<LevelChat | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', currentUser.uid),
      where('status', '==', 'ringing')
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const callId = change.doc.id;
            // Only trigger if not already in a call
            setActiveCallContact((prev) => {
              if (prev) return prev;
              return {
                contact: {
                  uid: data.callerId,
                  name: data.callerName || 'কলার',
                  phone: data.callerPhone || '',
                  photoURL: data.callerPhoto || '',
                  isBlocked: false,
                  isCounselor: false,
                  isOnline: true,
                  createdAt: '',
                },
                callId,
                isIncoming: true,
              };
            });
          }
        });
      },
      (err) => {
        console.warn('Incoming call listener notice:', err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    activeLevelChatRef.current = activeLevelChat;
  }, [activeLevelChat]);

  // Parse any referral counselor from URL (either /ref/COUNSELOR_ID or ?counselor=COUNSELOR_ID)
  const getReferralCounselorFromUrl = (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    const path = window.location.pathname;
    if (path.startsWith('/ref/')) {
      const parts = path.replace('/ref/', '').split('/');
      if (parts[0] && parts[0].trim().length > 0) {
        return decodeURIComponent(parts[0].trim());
      }
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('counselor') || params.get('ref') || undefined;
  };

  const targetCounselorFromUrl = getReferralCounselorFromUrl();

  // Real-time systemConfig listener for WhatsApp & Telegram links
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'systemConfig'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.whatsappChannelUrl) setWhatsappChannelUrl(data.whatsappChannelUrl);
          if (data.telegramUrl) setTelegramUrl(data.telegramUrl);
          if (data.facebookPageUrl) setFacebookPageUrl(data.facebookPageUrl);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          if (data.companyLogoUrl !== undefined) setCompanyLogoUrl(data.companyLogoUrl);
        }
      },
      (err) => console.warn('System config load notice:', err)
    );

    return () => unsub();
  }, []);

  // 1. Check persistent device login on boot and security blocking
  useEffect(() => {
    const initAuth = async () => {
      try {
        let targetUid = getStoredUserId();

        // If no stored UID, check if this device is already registered in Firestore
        if (!targetUid) {
          const deviceId = getDeviceId();
          const devSnap = await getDoc(doc(db, 'devices', deviceId));
          if (devSnap.exists()) {
            const devData = devSnap.data() as { userId: string };
            targetUid = devData.userId;
          }
        }

        // Security check: Check if this visitor's device, hardware fingerprint, or IP is blocked
        const blockStatus = await isVisitorBlocked(targetUid || undefined);
        if (blockStatus.isBlocked) {
          setVisitorBlockedData(blockStatus);
          setCurrentUser(null);
          setAuthInitialized(true);
          return;
        }

        // Fast UI load from localStorage if not blocked
        const localProfile = getStoredUserProfile<UserProfile>();
        if (localProfile && !localProfile.isBlocked) {
          setCurrentUser(localProfile);
        }

        if (targetUid) {
          const userRef = doc(db, 'users', targetUid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            if (profile.isBlocked) {
              setVisitorBlockedData({
                isBlocked: true,
                reason: profile.blockedReason,
                ipAddress: profile.ipAddress,
                deviceId: profile.deviceId,
              });
              setCurrentUser(null);
              setAuthInitialized(true);
              return;
            }

            setCurrentUser(profile);

            // Update online presence
            const now = new Date().toISOString();
            updateDoc(userRef, {
              isOnline: true,
              lastActiveAt: now,
            }).catch(() => {});

            // Handle referral logic: connects student to both Main and Sub Counselor
            const targetReferralIdFromUrl = targetCounselorFromUrl;
            if (targetReferralIdFromUrl && !profile.isCounselor) {
              ensureCounselorOrGroupConversations(profile, targetReferralIdFromUrl).then((primaryCounselor) => {
                if (primaryCounselor) {
                  if (targetReferralIdFromUrl.startsWith('GROUP_') || primaryCounselor.counselorGroupId) {
                    setReferralGroupId(primaryCounselor.counselorGroupId || targetReferralIdFromUrl);
                  }
                }
              });
            } else if (profile.counselorId && !profile.isCounselor) {
              ensureCounselorOrGroupConversations(profile, profile.counselorId).then(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('Boot auth check notice:', err);
      } finally {
        setAuthInitialized(true);
      }
    };

    initAuth();
  }, [targetCounselorFromUrl]);

  // Real-time security listener on currentUser profile
  useEffect(() => {
    if (!currentUser || currentUser.uid === 'admin_root') return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        if (data.isBlocked) {
          setVisitorBlockedData({
            isBlocked: true,
            reason: data.blockedReason,
            ipAddress: data.ipAddress,
            deviceId: data.deviceId,
          });
          setCurrentUser(null);
        }
      }
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // 2. Real-time User Presence handling (low frequency to save Firebase reads/writes)
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);

    const updateActive = () => {
      updateDoc(userRef, {
        isOnline: true,
        lastActiveAt: new Date().toISOString(),
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateDoc(userRef, { isOnline: false }).catch(() => {});
      } else {
        updateActive();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', updateActive);

    // Keepalive ping every 5 minutes
    lastActiveTimerRef.current = setInterval(updateActive, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', updateActive);
      if (lastActiveTimerRef.current) clearInterval(lastActiveTimerRef.current);
      updateDoc(userRef, { isOnline: false }).catch(() => {});
    };
  }, [currentUser?.uid]);

  // 3. Subscribe to Real-time Conversations list for current user
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      setConversationsLoading(false);
      return;
    }

    setConversationsLoading(true);
    const convQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      convQuery,
      (snapshot) => {
        const list: Conversation[] = [];
        const otherParticipantUids = new Set<string>();

        snapshot.forEach((docSnap) => {
          const c = { id: docSnap.id, ...docSnap.data() } as Conversation;
          list.push(c);
          c.participantIds.forEach((pId) => {
            if (pId !== currentUser.uid) otherParticipantUids.add(pId);
          });
        });

        // Trigger notifications for new messages in existing conversations
        const isInitialSnapshot = !hasConversationsLoadedRef.current;
        hasConversationsLoadedRef.current = true;

        if (isInitialSnapshot) {
          snapshot.docs.forEach((doc) => {
            knownConversationsRef.current[doc.id] = doc.data().updatedAt;
          });
        }

        if (!isInitialSnapshot) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified' || change.type === 'added') {
              const data = change.doc.data() as Conversation;
              const prevUpdatedAt = knownConversationsRef.current[change.doc.id];
              const isNewMessage = data.updatedAt && data.updatedAt !== prevUpdatedAt;
              
              // Always update the ref
              knownConversationsRef.current[change.doc.id] = data.updatedAt;

              if (
                isNewMessage &&
                data.lastMessageSenderId &&
                data.lastMessageSenderId !== currentUser.uid &&
                (!document.hasFocus() || activeConversationRef.current?.id !== change.doc.id)
              ) {
                const otherId = data.participantIds.find((id) => id !== currentUser.uid);
                const sender = otherId ? data.participantDetails?.[otherId] : null;

                const notifTitle = 'Unity Earning Live Chat';
                const notifBody = data.lastMessage || 'নতুন বার্তা পাঠিয়েছেন';

                triggerAppNotification({
                  title: notifTitle,
                  message: notifBody,
                  senderName: sender?.name,
                  senderPhoto: sender?.photoURL,
                  conversationId: change.doc.id,
                  type: 'chat',
                  onClick: () => {
                    setActiveConversation({ id: change.doc.id, ...data });
                    setActiveLevelChat(null);
                    setActiveBottomTab('home');
                  },
                });
              }
            }
          });
        }

        setConversations(list);
        setConversationsLoading(false);

        // Update active conversation reference if changed
        if (activeConversation) {
          const fresh = list.find((c) => c.id === activeConversation.id);
          if (fresh) setActiveConversation(fresh);
        }

        // Lightweight presence fetch for participants
        otherParticipantUids.forEach(async (uid) => {
          try {
            const uSnap = await getDoc(doc(db, 'users', uid));
            if (uSnap.exists()) {
              const data = uSnap.data() as UserProfile;
              setUserPresenceMap((prev) => ({
                ...prev,
                [uid]: {
                  isOnline: data.isOnline ?? false,
                  lastActiveAt: data.lastActiveAt,
                  isBlocked: data.isBlocked ?? false,
                },
              }));
            }
          } catch {
            // Presence fetch fallback
          }
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'conversations');
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 5. Subscribe to Admin Broadcast Notifications
  useEffect(() => {
    if (!currentUser) return;

    // Listen for new broadcast notifications
    const q = query(
      collection(db, 'broadcast_notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();

      // Check if this is a fresh notification (less than 1 minute old)
      const createdAt = new Date(data.createdAt).getTime();
      const now = Date.now();
      const isFresh = now - createdAt < 60000;

      // Avoid showing if user just logged in and it's an old one
      const lastSeenId = localStorage.getItem('ue_last_broadcast_id');

      if (isFresh && lastSeenId !== docSnap.id) {
        // Filter by target role if specified
        if (data.targetRole && data.targetRole !== 'all') {
          const userRole = currentUser.isCounselor ? 'counselors' : 'students';
          if (data.targetRole !== userRole) return;
        }

        triggerAppNotification({
          title: data.title,
          message: data.message,
          senderName: 'Unity Earning',
          type: 'broadcast',
        });
        localStorage.setItem('ue_last_broadcast_id', docSnap.id);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 6. Automated Periodic Push Notification (Auto-Push Scheduler)
  useEffect(() => {
    if (!currentUser || currentUser.uid === 'admin_root') return;

    let intervalId: NodeJS.Timeout;

    const runAutoPush = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'autoPushConfig'));
        if (snap.exists()) {
          const config = snap.data();
          if (config.enabled) {
            // Check last auto-push timestamp to avoid spamming on page refresh
            const lastAutoPush = Number(localStorage.getItem('ue_last_auto_push') || '0');
            const now = Date.now();
            const intervalMs = (config.intervalMinutes || 60) * 60 * 1000;

            if (now - lastAutoPush >= intervalMs) {
              triggerAppNotification({
                title: config.title || 'Unity Earning আপডেট',
                message: config.message || 'আপনার কাউন্সিলরের সাথে যোগাযোগ করুন।',
                senderName: 'System',
                type: 'broadcast',
              });
              localStorage.setItem('ue_last_auto_push', now.toString());
            }

            // Schedule next check
            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(runAutoPush, Math.max(intervalMs, 300000)); // check every interval or min 5 mins
          }
        }
      } catch (e) {
        console.warn('Auto-push runner notice:', e);
      }
    };

    // Run first check after a short delay
    const initialTimer = setTimeout(runAutoPush, 10000);

    return () => {
      clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser?.uid]);

  // Handle Level Chat messages
  useEffect(() => {
    if (!currentUser) {
      setLevelChats([]);
      return;
    }

    const q = query(
      collection(db, 'level_chats'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LevelChat[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as LevelChat);
        });
        setLevelChats(list);

        if (activeLevelChat) {
          const fresh = list.find((c) => c.id === activeLevelChat.id);
          if (fresh) setActiveLevelChat(fresh);
        }
      },
      (err) => {
        console.warn('Level chats subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, activeLevelChat?.id]);

  // 4. Web Notification permission trigger at appropriate time
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // notification permission rejected or unsupported
        }
      }
    }
  };

  // 5. Start or Open Chat with a Contact
  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    setShowAddContact(false);

    // Look for existing conversation
    const existing = conversations.find((c) =>
      c.participantIds.includes(targetUser.uid)
    );

    if (existing) {
      setActiveConversation(existing);
      return;
    }

    // Create new conversation
    const sortedIds = [currentUser.uid, targetUser.uid].sort();
    const convId = `${sortedIds[0]}_${sortedIds[1]}`;
    const now = new Date().toISOString();

    const newConv: Conversation = {
      id: convId,
      participantIds: [currentUser.uid, targetUser.uid],
      participantDetails: {
        [currentUser.uid]: {
          name: currentUser.name,
          phone: currentUser.phone,
          photoURL: currentUser.photoURL,
          isCounselor: currentUser.isCounselor,
        },
        [targetUser.uid]: {
          name: targetUser.name,
          phone: targetUser.phone,
          photoURL: targetUser.photoURL,
          isCounselor: targetUser.isCounselor,
        },
      },
      lastMessage: 'কথোপকথন শুরু হয়েছে',
      lastMessageSenderId: currentUser.uid,
      lastMessageType: 'text',
      updatedAt: now,
      unreadCounts: {
        [currentUser.uid]: 0,
        [targetUser.uid]: 0,
      },
      labels: targetUser.isCounselor ? ['নতুন স্টুডেন্ট'] : [],
    };

    try {
      await setDoc(doc(db, 'conversations', convId), sanitizeForFirestore(newConv));
      setActiveConversation(newConv);
      requestNotificationPermission();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}`);
    }
  };

  // Handle Conversation Delete
  const handleDeleteConversation = (convId: string) => {
    if (activeConversation?.id === convId) {
      setActiveConversation(null);
    }
    setConversations((prev) => prev.filter((c) => c.id !== convId));
  };

  // Sign out user
  const handleLogout = async () => {
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: false,
          lastActiveAt: new Date().toISOString(),
        });
      } catch {
        // Signout update ignore
      }
    }
    removeStoredUserId();
    clearStoredAdminToken();
    setAdminToken(null);
    setCurrentUser(null);
    setActiveConversation(null);
    setActiveLevelChat(null);
    setShowProfile(false);
    setShowAdmin(false);
    setShowCounselorDashboard(false);
  };

  if (!authInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white shadow-md animate-pulse">
            <MessageSquare className="h-6 w-6" />
          </div>
          <span className="text-xs font-semibold text-slate-700">
            Unity Earning Live Chat লোড হচ্ছে...
          </span>
        </div>
      </div>
    );
  }

  // If visitor is blocked (by IP, device ID, hardware fingerprint, or account)
  if (visitorBlockedData?.isBlocked || currentUser?.isBlocked) {
    return (
      <BlockedScreen
        userName={currentUser?.name}
        ipAddress={visitorBlockedData?.ipAddress || currentUser?.ipAddress}
        deviceId={visitorBlockedData?.deviceId || currentUser?.deviceId}
        reason={visitorBlockedData?.reason || currentUser?.blockedReason}
        onLogout={handleLogout}
      />
    );
  }

  // DEDICATED ADMIN DASHBOARD: Direct full-screen management UI (no user chat, no bot, no chat list)
  if (currentUser?.uid === 'admin_root' || !!adminToken) {
    return (
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#070b0e]"><Loader2 className="h-8 w-8 text-[#00a884] animate-spin" /></div>}>
        <AdminDashboard
          currentUser={currentUser}
          companyLogoUrl={companyLogoUrl}
          onLogout={handleLogout}
        />
      </React.Suspense>
    );
  }

  // STANDALONE LOGIN / REGISTRATION UI: Rendered cleanly without background chat layout
  if (!currentUser) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#070b0e] overflow-hidden select-none">
        <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-slate-950 font-sans text-slate-100 shadow-2xl border-x border-slate-900">
          <OfflineIndicator />
          <AuthModal
            targetCounselorUid={targetCounselorFromUrl}
            companyLogoUrl={companyLogoUrl}
            onSuccess={async (user, targetCounselorId, isAdminLogin) => {
              setCurrentUser(user);
              if (isAdminLogin) {
                const token = sessionStorage.getItem('adminToken') || 'valid_admin';
                setStoredAdminToken(token);
                setAdminToken(token);
                setShowAdmin(false);
                return;
              }
              if (user.isCounselor) {
                setShowCounselorDashboard(true);
                return;
              }
              requestNotificationPermission();
              // Connect automatically with Assigned Counselor and Sub-Counselors
              if (targetCounselorId && !user.isCounselor) {
                const primaryCounselor = await ensureCounselorOrGroupConversations(user, targetCounselorId);
                if (primaryCounselor?.counselorGroupId || targetCounselorId.startsWith('GROUP_')) {
                  setReferralGroupId(primaryCounselor?.counselorGroupId || targetCounselorId);
                  setShowChooseCounselor(true);
                }
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[#070b0e] overflow-hidden select-none">
      <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#111b21] font-sans text-slate-100 shadow-2xl border-x border-[#222d34]/60">
        {/* Push Notification & Sound Banner (Floating at top) */}
        <TopNotificationBanner
          onOpenConversation={(convId) => {
            const target = conversations.find((c) => c.id === convId);
            if (target) {
              setActiveConversation(target);
              setActiveLevelChat(null);
              setActiveBottomTab('home');
            }
          }}
        />

        {/* Offline Status & Slow connection banner */}
        <OfflineIndicator />

        {/* Main Header (Hidden inside chat inbox) */}
        {(!activeConversation && !activeLevelChat) && (
          <Header
            currentUser={currentUser}
            companyLogoUrl={companyLogoUrl}
            onOpenAddContact={() => setShowAddContact(true)}
            onOpenProfile={() => setShowProfile(true)}
            onOpenAdmin={() => setShowAdmin(true)}
            onOpenCounselorDashboard={() => setShowCounselorDashboard(true)}
            onOpenCompanyInfo={() => setShowCompanyDrawer(true)}
            onLogout={handleLogout}
            isAdminLoggedIn={!!adminToken}
            isOnline={isOnline}
          />
        )}

        {/* Chat Application Main Workspace */}
        <main className={`flex-1 flex flex-col overflow-hidden ${activeConversation || activeLevelChat ? 'pb-0' : 'pb-16'}`}>

          {/* Messaging Layout OR Bot Chat Layout */}
          {currentUser && (
            activeBottomTab === 'bot' ? (
              <UnityBotChat onGoHome={() => setActiveBottomTab('home')} />
            ) : (
              <div className="flex h-full w-full overflow-hidden">
                {/* Conversations List Panel */}
                <div
                  className={`h-full w-full shrink-0 transition-all ${
                    activeConversation || activeLevelChat ? 'hidden' : 'flex flex-col'
                  }`}
                >
                  <ChatList
                    currentUserId={currentUser.uid}
                    currentUser={currentUser}
                    conversations={conversations}
                    activeConversationId={activeConversation?.id || null}
                    levelChats={levelChats}
                    activeLevelChatId={activeLevelChat?.id || null}
                    onSelectConversation={(conv) => {
                      setActiveConversation(conv);
                      setActiveLevelChat(null);
                      requestNotificationPermission();
                    }}
                    onSelectLevelChat={(lChat) => {
                      setActiveLevelChat(lChat);
                      setActiveConversation(null);
                      requestNotificationPermission();
                    }}
                    onDeleteConversation={handleDeleteConversation}
                    onOpenAddContact={() => setShowAddContact(true)}
                    onOpenCreateLevelChat={() => setShowCreateLevelChat(true)}
                    loading={conversationsLoading}
                    userPresenceMap={userPresenceMap}
                  />
                </div>

                {/* Active Chat Window Panel */}
                <div
                  className={`h-full w-full overflow-hidden ${
                    activeConversation || activeLevelChat ? 'flex flex-col' : 'hidden'
                  }`}
                >
                  {activeLevelChat ? (
                    <LevelChatWindow
                      currentUser={currentUser}
                      levelChat={activeLevelChat}
                      onBack={() => setActiveLevelChat(null)}
                      onDeleteLevelChat={(deletedId) => {
                        setLevelChats((prev) => prev.filter((c) => c.id !== deletedId));
                        if (activeLevelChat?.id === deletedId) setActiveLevelChat(null);
                      }}
                    />
                  ) : activeConversation ? (
                    <ChatWindow
                      currentUser={currentUser}
                      conversation={activeConversation}
                      onBack={() => setActiveConversation(null)}
                      onDeleteConversation={handleDeleteConversation}
                      onStartCall={(contact) => {
                        setActiveCallContact({ contact, isIncoming: false });
                      }}
                      contactPresence={
                        userPresenceMap[
                          activeConversation.participantIds.find((id) => id !== currentUser.uid) || ''
                        ]
                      }
                    />
                  ) : null}
                </div>
              </div>
            )
          )}
        </main>

      {/* WhatsApp Style Bottom Navigation Bar (Hidden inside chat inbox) */}
      {currentUser && !activeConversation && !activeLevelChat && (
        <BottomNav
          activeTab={activeBottomTab}
          onTabChange={setActiveBottomTab}
          onOpenCompanyInfo={() => setShowCompanyDrawer(true)}
          whatsappChannelUrl={whatsappChannelUrl}
          telegramUrl={telegramUrl}
          facebookPageUrl={facebookPageUrl}
          supportEmail={supportEmail}
          unreadCount={conversations.reduce((acc, c) => acc + (c.unreadCounts?.[currentUser.uid] || 0), 0)}
        />
      )}

      {/* Modals */}
      <React.Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><Loader2 className="h-8 w-8 text-[#00a884] animate-spin" /></div>}>
        {showCreateLevelChat && currentUser && (
          <CreateLevelChatModal
            currentUser={currentUser}
            onClose={() => setShowCreateLevelChat(false)}
            onCreated={(newLevelChat) => {
              setActiveLevelChat(newLevelChat);
              setActiveConversation(null);
            }}
          />
        )}

        {showAddContact && currentUser && (
          <AddContactModal
            currentUserId={currentUser.uid}
            onClose={() => setShowAddContact(false)}
            onStartChat={handleStartChatWithUser}
          />
        )}

        {showProfile && currentUser && (
          <ProfileModal
            currentUser={currentUser}
            onClose={() => setShowProfile(false)}
            onUpdate={(updated) => {
              setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
            }}
            onLogout={handleLogout}
          />
        )}

        {showAdmin && (
          <AdminModal
            currentUid={currentUser?.uid || 'guest_admin'}
            isAdminLoggedIn={!!adminToken}
            onAdminLoginSuccess={(token) => {
              setAdminToken(token);
              sessionStorage.setItem('unity_admin_token', token);
            }}
            onAdminLogout={() => {
              setAdminToken(null);
              sessionStorage.removeItem('unity_admin_token');
            }}
            onClose={() => setShowAdmin(false)}
          />
        )}

        {showCounselorDashboard && currentUser?.isCounselor && (
          <CounselorDashboard
            counselor={currentUser}
            onClose={() => setShowCounselorDashboard(false)}
            onSelectConversation={(conv) => {
              setActiveConversation(conv);
              setActiveLevelChat(null);
              setShowCounselorDashboard(false);
            }}
            onLogout={handleLogout}
            onProfileUpdate={(updated) => {
              setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
            }}
          />
        )}
      </React.Suspense>

      {activeCallContact && currentUser && (
        <CallModal
          currentUser={currentUser}
          contact={activeCallContact.contact}
          callId={activeCallContact.callId}
          isIncoming={activeCallContact.isIncoming}
          onClose={() => setActiveCallContact(null)}
        />
      )}

      {showChooseCounselor && referralGroupId && currentUser && (
        <ChooseCounselor
          counselorGroupId={referralGroupId}
          onSelect={async (counselor) => {
            setShowChooseCounselor(false);
            const cConv = await ensureCounselorConversation(currentUser, counselor.uid);
            if (cConv) setActiveConversation(cConv);
          }}
        />
      )}

      {/* Company Info & Terms Drawer (Three-line Menu) */}
      <CompanyInfoDrawer
        isOpen={showCompanyDrawer}
        companyLogoUrl={companyLogoUrl}
        onClose={() => setShowCompanyDrawer(false)}
        onOpenCounselorChat={() => {
          if (!currentUser) return;
          const counselorConv = conversations.find((c) => {
            const otherId = c.participantIds.find((id) => id !== currentUser.uid);
            if (!otherId) return false;
            const otherUser = c.participantDetails[otherId];
            return (
              otherUser?.isCounselor ||
              otherId === currentUser.counselorId ||
              otherId === COUNSELOR_UID
            );
          });
          if (counselorConv) {
            setActiveConversation(counselorConv);
            setActiveLevelChat(null);
          }
        }}
      />
      </div>
    </div>
  );
}
