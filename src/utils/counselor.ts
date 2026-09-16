import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Conversation, UserProfile } from '../types';
import { sanitizeForFirestore } from './sanitize';

export const COUNSELOR_UID = 'counselor_official';

export const COUNSELOR_PROFILE: UserProfile = {
  uid: COUNSELOR_UID,
  name: 'ইউনিটি আর্নিং অফিশিয়াল কাউন্সিলর',
  phone: '01700000000',
  photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  isBlocked: false,
  isOnline: true,
  isCounselor: true,
  counselorPin: '1234',
  lastActiveAt: new Date().toISOString(),
  createdAt: '2026-01-01T00:00:00.000Z',
};

// Generate shareable link for a counselor
export const generateCounselorLink = (counselorUid: string): string => {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';
  return `${origin}/ref/${encodeURIComponent(counselorUid)}`;
};

// Ensure official counselor exists in database
export const ensureCounselorExists = async (): Promise<void> => {
  try {
    const counselorRef = doc(db, 'users', COUNSELOR_UID);
    const snap = await getDoc(counselorRef);
    if (!snap.exists()) {
      await setDoc(counselorRef, COUNSELOR_PROFILE);
    }
  } catch (err) {
    console.warn('Could not ensure counselor profile:', err);
  }
};

// Get specific counselor profile
export const getCounselorProfile = async (counselorUid: string): Promise<UserProfile | null> => {
  if (counselorUid === COUNSELOR_UID) {
    return COUNSELOR_PROFILE;
  }
  try {
    const snap = await getDoc(doc(db, 'users', counselorUid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn('Error fetching counselor profile:', err);
  }
  return null;
};

// Ensure conversation with specific or default counselor exists and send welcome seminar invite
export const ensureCounselorConversation = async (
  user: UserProfile,
  targetCounselorUid: string = COUNSELOR_UID,
  groupId?: string
): Promise<Conversation | null> => {
  try {
    await ensureCounselorExists();

    // Get the target counselor info
    let counselor = await getCounselorProfile(targetCounselorUid);
    if (!counselor) {
      counselor = COUNSELOR_PROFILE;
      targetCounselorUid = COUNSELOR_UID;
    }

    const resolvedGroupId = groupId || counselor.counselorGroupId || undefined;

    // Check if conversation already exists between user and this counselor
    const convsRef = collection(db, 'conversations');
    const q = query(convsRef, where('participantIds', 'array-contains', user.uid));
    const snap = await getDocs(q);

    let counselorConv: Conversation | null = null;

    snap.forEach((d) => {
      const conv = { id: d.id, ...d.data() } as Conversation;
      if (conv.participantIds.includes(targetCounselorUid)) {
        counselorConv = conv;
      }
    });

    if (counselorConv) {
      return counselorConv;
    }

    // Create a new conversation between User and Counselor
    const convId = `conv_${user.uid}_${targetCounselorUid}`;
    const now = new Date().toISOString();

    const isSub = counselor.role === 'sub_counselor';
    const roleTitle = isSub ? 'সাব-কাউন্সিলর' : 'প্রধান কাউন্সিলর';

    const welcomeText = isSub
      ? `Hello ${user.name}, আমি ইউনিটি আর্নিং থেকে সাব-কাউন্সিলর ${counselor.name} বলছি। আপনি আমাদের গ্রুপে রেজিস্ট্রেশন করেছেন। কাজ সংক্রান্ত যেকোনো বিষয়ে আপনি সরাসরি আমার সাথে কথা বলতে পারেন।`
      : `Hello ${user.name}, আমি ইউনিটি আর্নিং থেকে প্রধান কাউন্সিলর ${counselor.name} বলছি। আপনি আমাদের ওয়েবসাইটে কাজ করার জন্য রেজিস্ট্রেশন করেছেন। কাজ সংক্রান্ত সকল কিছু আমি এবং আমাদের সাব-কাউন্সিলর আপনাকে বুঝিয়ে দিবো, তো আপনি কাইন্ডলি কথা বলবেন।`;

    const isPending = !!counselor.isTrustedModeOn;

    const newConv: Conversation = {
      id: convId,
      participantIds: [user.uid, targetCounselorUid],
      counselorId: targetCounselorUid,
      ...(resolvedGroupId ? { counselorGroupId: resolvedGroupId } : {}),
      ...(counselor.parentCounselorId ? { parentCounselorId: counselor.parentCounselorId } : {}),
      ...(isPending ? { isPendingApproval: true } : {}),
      participantDetails: {
        [user.uid]: {
          name: user.name || 'সদস্য',
          phone: user.phone || '',
          photoURL: user.photoURL || '',
          isCounselor: false,
          createdAt: user.createdAt || new Date().toISOString(),
        },
        [targetCounselorUid]: {
          name: `${counselor.name || 'কাউন্সিলর'} (${roleTitle})`,
          phone: counselor.phone || '',
          photoURL: counselor.photoURL || '',
          isCounselor: true,
        },
      },
      lastMessage: isPending ? 'রিকোয়েস্ট পাঠানো হয়েছে...' : welcomeText,
      lastMessageSenderId: isPending ? user.uid : targetCounselorUid,
      lastMessageType: 'text',
      updatedAt: now,
      unreadCounts: {
        [user.uid]: isPending ? 0 : 1,
        [targetCounselorUid]: isPending ? 1 : 0,
      },
      labels: ['নিউ মেম্বার'],
    };

    await setDoc(doc(db, 'conversations', convId), sanitizeForFirestore(newConv));

    // Add initial welcome seminar message from the counselor if not pending
    if (!isPending) {
      const messagesRef = collection(db, 'conversations', convId, 'messages');
      await addDoc(messagesRef, {
        conversationId: convId,
        senderId: targetCounselorUid,
        receiverId: user.uid,
        type: 'text',
        content: welcomeText,
        status: 'delivered',
        timestamp: now,
      });
    }

    return newConv;
  } catch (err) {
    console.warn('Error setting up counselor conversation:', err);
    return null;
  }
};

// Ensure conversation with both Main and Sub Counselor in a group
export const ensureGroupConversations = async (
  user: UserProfile,
  groupId: string
): Promise<UserProfile | null> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('counselorGroupId', '==', groupId),
      where('isCounselor', '==', true)
    );
    const snap = await getDocs(q);
    const groupCounselors: UserProfile[] = [];
    snap.forEach((d) => groupCounselors.push(d.data() as UserProfile));

    if (groupCounselors.length === 0) return null;

    // Create conversations for each counselor in the group
    for (const counselor of groupCounselors) {
      await ensureCounselorConversation(user, counselor.uid, groupId);
    }

    // Return the main counselor as the "primary" one if found
    return groupCounselors.find(c => c.role === 'main_counselor') || groupCounselors[0];
  } catch (err) {
    console.warn('Error setting up group conversations:', err);
    return null;
  }
};

// Universal helper to connect user to both Main Counselor and Sub Counselor(s)
export const ensureCounselorOrGroupConversations = async (
  user: UserProfile,
  referralId: string
): Promise<UserProfile | null> => {
  try {
    if (!referralId) return null;

    // 1. If it's directly a GROUP_ code
    if (referralId.startsWith('GROUP_')) {
      return await ensureGroupConversations(user, referralId);
    }

    // 2. Otherwise look up the counselor record
    const targetCounselor = await getCounselorProfile(referralId);
    if (targetCounselor) {
      if (targetCounselor.counselorGroupId) {
        // Connected to whole group
        return await ensureGroupConversations(user, targetCounselor.counselorGroupId);
      }

      // Check if this counselor has a parent or sub-counselor
      if (targetCounselor.parentCounselorId) {
        const parent = await getCounselorProfile(targetCounselor.parentCounselorId);
        if (parent?.counselorGroupId) {
          return await ensureGroupConversations(user, parent.counselorGroupId);
        }
      }

      // Check if sub counselors exist for this counselor
      const subQ = query(
        collection(db, 'users'),
        where('parentCounselorId', '==', targetCounselor.uid),
        where('isCounselor', '==', true)
      );
      const subSnap = await getDocs(subQ);
      if (!subSnap.empty) {
        const allCounselors: UserProfile[] = [targetCounselor];
        subSnap.forEach((d) => allCounselors.push(d.data() as UserProfile));
        for (const c of allCounselors) {
          await ensureCounselorConversation(user, c.uid);
        }
        return targetCounselor;
      }

      // Standalone counselor
      await ensureCounselorConversation(user, targetCounselor.uid);
      return targetCounselor;
    }

    return null;
  } catch (err) {
    console.warn('Error in ensureCounselorOrGroupConversations:', err);
    return null;
  }
};
