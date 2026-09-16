import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  Send,
  Smile,
  Image as ImageIcon,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Tag,
  MoreVertical,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
  getDoc,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Conversation, ChatMessage, UserProfile, MessageType, ChatLabel } from '../types';
import { FormattedText } from './FormattedText';
import { compressImage, blobToDataUrl, formatMessageTime, formatDuration, formatLastSeen } from '../utils/media';
import { COUNSELOR_UID } from '../utils/counselor';
import { getCounselorAiResponse, getCounselorAutoReplyMessage } from '../utils/counselorAi';
import { LabelModal } from './LabelModal';
import { PublicCounselorProfileModal } from './PublicCounselorProfileModal';
import { fetchLabels } from '../utils/labels';
import { sanitizeForFirestore } from '../utils/sanitize';

interface ChatWindowProps {
  currentUser: UserProfile;
  conversation: Conversation;
  onBack: () => void;
  onStartCall: (contact: UserProfile) => void;
  onDeleteConversation?: (convId: string) => void;
  contactPresence?: { isOnline: boolean; lastActiveAt?: string; isBlocked?: boolean };
}

export const ChatWindow: React.FC<ChatWindowProps> = React.memo(({
  currentUser,
  conversation,
  onBack,
  onStartCall,
  onDeleteConversation,
  contactPresence,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState<string | null>(null);

  // Pagination
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageLimit, setMessageLimit] = useState(40);

  // Emoji picker toggle
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback state for voice messages
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Labels Modal state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labels, setLabels] = useState<ChatLabel[]>([]);

  // Delete modals state
  const [showDeleteConvModal, setShowDeleteConvModal] = useState(false);
  const [deleteConvLoading, setDeleteConvLoading] = useState(false);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  // Counselor Public Profile Modal
  const [showPublicProfile, setShowPublicProfile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLabels().then(setLabels);
  }, []);

  // Target contact info
  const otherUid =
    conversation.participantIds.find((id) => id !== currentUser.uid) ||
    conversation.participantIds[0];
  const otherDetails = conversation.participantDetails?.[otherUid] || {
    name: 'সদস্য',
    phone: '',
    photoURL: undefined,
    isCounselor: false,
  };

  const isOtherCounselor =
    otherDetails.isCounselor ||
    otherUid.startsWith('counselor') ||
    otherUid === COUNSELOR_UID ||
    conversation.counselorId === otherUid;

  const isCurrentCounselor = !!currentUser.isCounselor;

  const otherUserObj: UserProfile = {
    uid: otherUid,
    name: otherDetails.name,
    phone: otherDetails.phone,
    photoURL: otherDetails.photoURL,
    isBlocked: false,
    isCounselor: isOtherCounselor,
    isOnline: isOtherCounselor ? true : (contactPresence?.isOnline ?? false),
    lastActiveAt: new Date().toISOString(),
    createdAt: '',
  };

  const emojis = ['👍', '❤️', '😊', '🎉', '🙏', '🔥', '👏', '🤝', '💼', '💡', '✅', '⭐'];

  const handleAcceptRequest = async () => {
    try {
      setSending(true);
      const convRef = doc(db, 'conversations', conversation.id);
      
      const welcomeText = currentUser.role === 'sub_counselor'
        ? `Hello ${otherDetails.name}, আমি ইউনিটি আর্নিং থেকে সাব-কাউন্সিলর ${currentUser.name} বলছি। আপনি আমাদের গ্রুপে রেজিস্ট্রেশন করেছেন। কাজ সংক্রান্ত যেকোনো বিষয়ে আপনি সরাসরি আমার সাথে কথা বলতে পারেন।`
        : `Hello ${otherDetails.name}, আমি ইউনিটি আর্নিং থেকে প্রধান কাউন্সিলর ${currentUser.name} বলছি। আপনি আমাদের ওয়েবসাইটে কাজ করার জন্য রেজিস্ট্রেশন করেছেন। কাজ সংক্রান্ত সকল কিছু আমি এবং আমাদের সাব-কাউন্সিলর আপনাকে বুঝিয়ে দিবো, তো আপনি কাইন্ডলি কথা বলবেন।`;
      
      const now = new Date().toISOString();
      
      await updateDoc(convRef, {
        isPendingApproval: false,
        lastMessage: welcomeText,
        lastMessageSenderId: currentUser.uid,
        lastMessageType: 'text',
        updatedAt: now,
        [`unreadCounts.${otherUid}`]: 1,
        [`unreadCounts.${currentUser.uid}`]: 0,
      });

      const messagesRef = collection(db, 'conversations', conversation.id, 'messages');
      await addDoc(messagesRef, {
        conversationId: conversation.id,
        senderId: currentUser.uid,
        receiverId: otherUid,
        type: 'text',
        content: welcomeText,
        status: 'delivered',
        timestamp: now,
      });

    } catch (err) {
      console.error('Error accepting request:', err);
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Reset unread count for current user when opening conversation
  useEffect(() => {
    if (!conversation.id || !currentUser.uid) return;

    const convRef = doc(db, 'conversations', conversation.id);
    const resetUnread = async () => {
      try {
        const updatePayload: Record<string, any> = {
          [`unreadCounts.${currentUser.uid}`]: 0,
        };
        if (currentUser.isCounselor) {
          updatePayload.counselorRead = true;
          updatePayload.counselorReadAt = new Date().toISOString();
        }
        await updateDoc(convRef, updatePayload);
      } catch (err) {
        // Fallback merge set
        setDoc(
          convRef,
          {
            unreadCounts: {
              ...(conversation.unreadCounts || {}),
              [currentUser.uid]: 0,
            },
            ...(currentUser.isCounselor
              ? {
                  counselorRead: true,
                  counselorReadAt: new Date().toISOString(),
                }
              : {}),
          },
          { merge: true }
        ).catch(() => {});
      }
    };

    if (
      (conversation.unreadCounts?.[currentUser.uid] || 0) > 0 ||
      (currentUser.isCounselor && !conversation.counselorRead)
    ) {
      resetUnread();
    }
  }, [conversation.id, currentUser.uid, conversation.unreadCounts, conversation.counselorRead, currentUser.isCounselor]);

  // 1. Subscribe to real-time messages in this conversation
  useEffect(() => {
    setLoading(true);
    const messagesRef = collection(db, 'conversations', conversation.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(messageLimit));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const msgs: ChatMessage[] = [];
        const unreadMsgDocIds: string[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const msg = { id: docSnap.id, ...data } as ChatMessage;
          msgs.unshift(msg);

          if (msg.receiverId === currentUser.uid && msg.status !== 'read') {
            unreadMsgDocIds.push(docSnap.id);
          }
        });

        setMessages(msgs);
        setHasMore(snapshot.docs.length >= messageLimit);
        setLoading(false);

        // Mark incoming messages as read in batch
        if (unreadMsgDocIds.length > 0) {
          const batch = writeBatch(db);
          unreadMsgDocIds.forEach((id) => {
            const mRef = doc(db, 'conversations', conversation.id, 'messages', id);
            batch.update(mRef, { status: 'read' });
          });

          const convRef = doc(db, 'conversations', conversation.id);
          batch.set(
            convRef,
            {
              unreadCounts: {
                ...(conversation.unreadCounts || {}),
                [currentUser.uid]: 0,
              },
              ...(currentUser.isCounselor
                ? {
                    counselorRead: true,
                    counselorReadAt: new Date().toISOString(),
                  }
                : {}),
            },
            { merge: true }
          );

          batch.commit().catch(() => {});
        }

        setTimeout(() => scrollToBottom(false), 50);
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `conversations/${conversation.id}/messages`
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversation.id, messageLimit, currentUser.uid]);

  // Handle loading older messages
  const handleLoadOlder = () => {
    setLoadingOlder(true);
    setMessageLimit((prev) => prev + 25);
    setTimeout(() => setLoadingOlder(false), 300);
  };

  // Helper to trigger automated waiting message or AI response if receiver is a counselor
  const triggerCounselorAutoResponse = async (
    convId: string,
    counselorUid: string,
    studentName: string,
    studentText: string
  ) => {
    try {
      const counselorRef = doc(db, 'users', counselorUid);
      const counselorSnap = await getDoc(counselorRef);
      if (!counselorSnap.exists()) return;
      const counselorData = counselorSnap.data() as UserProfile;

      const autoOn = counselorData.autoReplyEnabled;
      const aiOn = counselorData.aiReplyEnabled;

      if (!autoOn && !aiOn) return;

      // Only trigger auto/AI response if counselor is NOT currently online/active
      // (If lastSeen exists and is within 2 minutes, counselor is considered online/present in website)
      if (counselorData.isOnline) {
        if (counselorData.lastSeen) {
          const lastSeenMs = new Date(counselorData.lastSeen).getTime();
          const nowMs = Date.now();
          // If active in the last 120 seconds, counselor is inside website live, do not send auto reply
          if (nowMs - lastSeenMs < 120000) {
            return;
          }
        }
      }

      let responseText = '';
      if (aiOn) {
        responseText = getCounselorAiResponse(studentText, studentName);
      } else if (autoOn) {
        responseText = getCounselorAutoReplyMessage(studentName, counselorData.autoReplyText);
      }

      if (!responseText) return;

      setTimeout(async () => {
        try {
          const replyTime = new Date().toISOString();
          const replyMsgData = {
            conversationId: convId,
            senderId: counselorUid,
            receiverId: currentUser.uid,
            type: 'text',
            content: responseText,
            status: 'sent',
            timestamp: replyTime,
          };

          const msgsRef = collection(db, 'conversations', convId, 'messages');
          await addDoc(msgsRef, sanitizeForFirestore(replyMsgData));

          const convRef = doc(db, 'conversations', convId);
          await setDoc(
            convRef,
            sanitizeForFirestore({
              lastMessage: responseText,
              lastMessageSenderId: counselorUid,
              lastMessageType: 'text',
              updatedAt: replyTime,
              [`unreadCounts.${currentUser.uid}`]: increment(1),
            }),
            { merge: true }
          );
        } catch (e) {
          console.warn('Auto/AI reply sending error:', e);
        }
      }, 1200);
    } catch (err) {
      console.warn('Check counselor settings error:', err);
    }
  };

  // 2. Send Message logic
  const sendMessage = async (
    type: MessageType,
    content: string,
    mediaUrl?: string,
    mediaDuration?: number
  ) => {
    if (type === 'text' && !content.trim()) return;

    setSending(true);
    setSendFailed(null);
    const now = new Date().toISOString();

    const newMessageData = {
      conversationId: conversation.id,
      senderId: currentUser.uid,
      receiverId: otherUid,
      type,
      content: content.trim(),
      mediaUrl: mediaUrl || null,
      mediaDuration: mediaDuration || null,
      status: 'sent',
      timestamp: now,
    };

    try {
      const messagesRef = collection(db, 'conversations', conversation.id, 'messages');
      await addDoc(messagesRef, sanitizeForFirestore(newMessageData));

      let snippet = content.trim();
      if (type === 'image') snippet = 'ছবি পাঠানো হয়েছে';
      if (type === 'audio') snippet = 'ভয়েস মেসেজ';

      const convRef = doc(db, 'conversations', conversation.id);
      const currentUnread = conversation.unreadCounts?.[otherUid] || 0;

      const updateData: Record<string, any> = {
        id: conversation.id,
        participantIds: conversation.participantIds || [currentUser.uid, otherUid],
        participantDetails: conversation.participantDetails || {},
        lastMessage: snippet,
        lastMessageSenderId: currentUser.uid,
        lastMessageType: type,
        updatedAt: now,
        [`unreadCounts.${otherUid}`]: currentUnread + 1,
        ...(!currentUser.isCounselor
          ? { counselorRead: false, hasStudentMessage: true }
          : { counselorRead: true, counselorReadAt: now }),
      };

      await setDoc(convRef, sanitizeForFirestore(updateData), { merge: true });

      if (type === 'text') setInputText('');
      setTimeout(() => scrollToBottom(true), 50);

      // Trigger auto or AI response if sender is not counselor
      if (!currentUser.isCounselor) {
        triggerCounselorAutoResponse(conversation.id, otherUid, currentUser.name, content.trim());
      }
    } catch (err: unknown) {
      console.error('Send error:', err);
      setSendFailed('মেসেজ পাঠানো সম্ভব হয়নি। পুনরায় চেষ্টা করতে ট্যাপ করুন।');
    } finally {
      setSending(false);
    }
  };

  // 3. Delete a single message
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('এই মেসেজটি কি মুছে ফেলতে চান?')) return;

    setDeletingMsgId(msgId);
    try {
      await deleteDoc(doc(db, 'conversations', conversation.id, 'messages', msgId));
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('মেসেজ ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setDeletingMsgId(null);
    }
  };

  // 4. Delete entire conversation
  const handleDeleteConversation = async () => {
    setDeleteConvLoading(true);
    try {
      const msgsRef = collection(db, 'conversations', conversation.id, 'messages');
      const snaps = await getDocs(msgsRef);
      for (const d of snaps.docs) {
        await deleteDoc(d.ref);
      }
      await deleteDoc(doc(db, 'conversations', conversation.id));

      if (onDeleteConversation) {
        onDeleteConversation(conversation.id);
      } else {
        onBack();
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      alert('চ্যাট ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setDeleteConvLoading(false);
      setShowDeleteConvModal(false);
    }
  };

  // 5. Handle Image Select & Compression
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSending(true);
      const compressedDataUrl = await compressImage(file, 900, 0.75);
      const caption = inputText ? inputText : 'ছবি';
      await sendMessage('image', caption, compressedDataUrl);
      setInputText('');
    } catch (err) {
      console.error('Image upload failed:', err);
      setSendFailed('ছবি প্রসেস করা সম্ভব হয়নি।');
      setSending(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 6. Voice Recording logic
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('আপনার ব্রাউজার বা ডিভাইসে ভয়েস রেকর্ড করার ব্যবস্থা সাপোর্ট করে না।');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission notice:', err?.message || err);
      alert('ভয়েস মেসেজ পাঠাতে আপনার ব্রাউজার সেটেইংস থেকে মাইক্রোফোনের অনুমতি (Microphone Permission) দিন।');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const sendRecordedVoice = async () => {
    if (!recordedAudioBlob) return;
    try {
      setSending(true);
      const base64Audio = await blobToDataUrl(recordedAudioBlob);
      await sendMessage('audio', 'ভয়েস মেসেজ', base64Audio, recordingSeconds);
      cancelRecording();
    } catch (err) {
      console.error('Voice send error:', err);
      setSendFailed('ভয়েস মেসেজ পাঠানো যায়নি।');
    } finally {
      setSending(false);
    }
  };

  // 7. Audio Message Player logic
  const togglePlayAudio = (messageId: string, audioSrc: string) => {
    if (playingAudioId === messageId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const player = new Audio(audioSrc);
    audioPlayerRef.current = player;
    setPlayingAudioId(messageId);

    player.play().catch(() => setPlayingAudioId(null));
    player.onended = () => setPlayingAudioId(null);
    player.onerror = () => setPlayingAudioId(null);
  };

  return (
    <div
      id="chat-window-container"
      className="flex h-full w-full flex-col bg-[#0b141a] text-white"
    >
      {/* 1. Header with Contact Info */}
      <div className="flex h-14 items-center justify-between border-b border-[#222d34] bg-[#111b21] px-2.5 sm:px-4 shadow-md shrink-0 text-white">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            id="chat-back-btn"
            onClick={onBack}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
            title="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Contact Avatar & Info (Clickable to view Profile) */}
          <div
            onClick={() => setShowPublicProfile(true)}
            className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-90 transition group flex-1"
            title="প্রোফাইল তথ্য দেখতে এখানে ক্লিক করুন"
          >
            {/* Contact Avatar */}
            <div className="relative shrink-0">
              <div
                className={`h-9 w-9 overflow-hidden rounded-full border ${
                  isOtherCounselor
                    ? 'border-teal-300 bg-teal-100 text-teal-800'
                    : 'border-slate-200 bg-sky-100 text-sky-700'
                } flex items-center justify-center font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform`}
              >
                {otherDetails.photoURL ? (
                  <img
                    src={otherDetails.photoURL}
                    alt={otherDetails.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  otherDetails.name.charAt(0).toUpperCase()
                )}
              </div>
              <span
                className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  otherUserObj.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
            </div>

            {/* Contact Name, Counselor Badge, Status & Phone */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate tracking-tight group-hover:text-[#00a884] transition-colors">
                  {otherDetails.name}
                </h2>
                {isOtherCounselor && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#00a884]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#00a884] shrink-0">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    <span>কাউন্সিলর</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-300 font-medium truncate">
                {otherDetails.phone && (
                  <span className="font-mono text-slate-300 text-[10px] truncate max-w-[85px] sm:max-w-none">
                    {otherDetails.phone}
                  </span>
                )}
                {otherDetails.phone && <span>•</span>}
                <span className={`whitespace-nowrap shrink-0 ${otherUserObj.isOnline ? 'text-emerald-400 font-semibold' : ''}`}>
                  {otherUserObj.isOnline
                    ? 'অনলাইন'
                    : formatLastSeen(contactPresence?.lastActiveAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Action Buttons: Uniform 32x32px buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Label Management button */}
          {currentUser.isCounselor && (
            <button
              onClick={() => setShowLabelModal(true)}
              className={`flex h-8 items-center gap-1 rounded-xl border px-2 sm:px-2.5 text-xs font-semibold transition cursor-pointer ${
                conversation.labels && conversation.labels.length > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
              title="লেবেল সেট করুন"
            >
              <Tag className={`h-3.5 w-3.5 ${conversation.labels && conversation.labels.length > 0 ? 'text-emerald-600 fill-emerald-600' : 'text-teal-600'}`} />
              <span className="hidden sm:inline">লেবেল</span>
            </button>
          )}

          {/* Audio Call */}
          <button
            id="chat-audio-call-btn"
            onClick={() => onStartCall(otherUserObj)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 transition cursor-pointer"
            title="ভয়েস কল"
          >
            <Phone className="h-4 w-4" />
          </button>

          {/* Delete entire chat (Counselor or Admin only) */}
          {(currentUser.isCounselor || currentUser.uid === 'admin') && (
            <button
              onClick={() => setShowDeleteConvModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer"
              title="সম্পূর্ণ চ্যাট মুছে ফেলুন"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Prominent Counselor Guidance Banner for Students */}
      {isOtherCounselor && (
        <div className="bg-gradient-to-r from-teal-600 via-sky-600 to-teal-700 px-3.5 py-1.5 text-white text-[11px] sm:text-xs shadow-2xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-medium min-w-0">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              <strong>আপনার কাউন্সিলর:</strong> স্পেশাল সেমিনার ও হেল্প পেতে কথা বলুন।
            </span>
          </div>
          <span className="hidden md:inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold shrink-0">
            অফিশিয়াল সহায়তা
          </span>
        </div>
      )}



      {/* 2. Messages Thread Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {/* Load older messages button */}
        {hasMore && (
          <div className="flex justify-center py-1">
            <button
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="flex items-center gap-1.5 rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-white transition cursor-pointer"
            >
              {loadingOlder ? (
                <Loader2 className="h-3 w-3 animate-spin text-sky-600" />
              ) : null}
              <span>আগের মেসেজ দেখুন</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-2">
              <GraduationCap className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700">কথোপকথন শুরু করুন</p>
            <p className="mt-0.5 text-[11px] text-slate-400 max-w-xs">
              সেমিনারের তথ্য ও ক্যারিয়ার পরামর্শ জানতে এখনই নিচে মেসেজ লিখুন।
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;

            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                className={`group flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Delete message button (visible on hover or tap) */}
                {isMe && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    disabled={deletingMsgId === msg.id}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                    title="মেসেজটি মুছে ফেলুন"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-2xs text-xs sm:text-sm ${
                    isMe
                      ? 'bg-[#005c4b] text-white rounded-br-xs'
                      : 'bg-[#202c33] text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {/* Text Message */}
                  {msg.type === 'text' && (
                    <FormattedText text={msg.content} isMe={isMe} className="select-text" />
                  )}

                  {/* Image Attachment Message */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div className="space-y-1">
                      <img
                        src={msg.mediaUrl}
                        alt="ছবি"
                        className="max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                      />
                      {msg.content && msg.content !== 'ছবি' && (
                        <div className="mt-1 text-xs">
                          <FormattedText text={msg.content} isMe={isMe} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Voice Note Player */}
                  {msg.type === 'audio' && msg.mediaUrl && (
                    <div className="flex items-center gap-2.5 py-1 min-w-[180px]">
                      <button
                        onClick={() => togglePlayAudio(msg.id, msg.mediaUrl!)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition cursor-pointer ${
                          isMe
                            ? 'bg-white text-sky-600 hover:bg-slate-100'
                            : 'bg-sky-600 text-white hover:bg-sky-700'
                        }`}
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] font-mono opacity-85">
                          <span>ভয়েস মেসেজ</span>
                          <span>
                            {msg.mediaDuration ? formatDuration(msg.mediaDuration) : 'অডিও'}
                          </span>
                        </div>
                        {/* Audio wave simulation */}
                        <div className="mt-1 flex items-center gap-0.5 h-3">
                          {[30, 70, 45, 90, 60, 40, 80, 50, 75, 35].map((h, i) => (
                            <span
                              key={i}
                              className={`w-1 rounded-full ${
                                isMe ? 'bg-white/80' : 'bg-sky-600/70'
                              } ${playingAudioId === msg.id ? 'animate-pulse' : ''}`}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bubble Footer: Time and Delivery Status */}
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                      isMe ? 'text-sky-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {isMe && currentUser?.isCounselor && (
                      <span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="h-3 w-3 text-emerald-300 font-bold" title="ইউজার মেসেজ দেখেছেন" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="h-3 w-3 text-white/80" title="পৌঁছেছে" />
                        ) : (
                          <Check className="h-3 w-3 text-white/70" title="পাঠানো হয়েছে" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button for other participant messages if current user is admin/counselor */}
                {!isMe && (isCurrentCounselor || otherUid === currentUser.uid) && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    disabled={deletingMsgId === msg.id}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                    title="মেসেজটি মুছে ফেলুন"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sending Failure Retry Banner */}
      {sendFailed && (
        <div
          onClick={() => sendMessage('text', inputText)}
          className="cursor-pointer flex items-center justify-center gap-1.5 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{sendFailed}</span>
        </div>
      )}

      {/* 3. Voice Recording Preview Bar */}
      {recordedAudioBlob && !isRecording && (
        <div className="flex items-center justify-between bg-teal-50 border-t border-teal-200 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (recordedAudioUrl) {
                  const a = new Audio(recordedAudioUrl);
                  a.play();
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700 transition cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 ml-0.5" />
            </button>
            <span className="font-semibold text-teal-900">
              ভয়েস মেসেজ ({formatDuration(recordingSeconds)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="rounded-lg p-1.5 text-slate-500 hover:text-red-600 transition cursor-pointer"
              title="মুছে ফেলুন"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={sendRecordedVoice}
              disabled={sending}
              className="flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition cursor-pointer"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>ভয়েস পাঠান</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Recording In-Progress Bar */}
      {isRecording && (
        <div className="flex items-center justify-between bg-red-50 border-t border-red-200 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="font-bold text-red-700">ভয়েস রেকর্ড হচ্ছে...</span>
            <span className="font-mono text-slate-700">{formatDuration(recordingSeconds)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="rounded-lg p-1 text-slate-400 hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700 shadow-xs cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>সম্পন্ন</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Emoji Quick Row */}
      {showEmojiPicker && (
        <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2 overflow-x-auto">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setInputText((prev) => prev + emoji);
              }}
              className="text-lg hover:scale-125 transition cursor-pointer p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 6. Message Input Footer Bar */}
      <div className="border-t border-[#222d34] bg-[#111b21] p-2.5 sm:p-3">
        {contactPresence?.isBlocked ? (
          <div className="flex items-center justify-center bg-[#202c33] p-3 rounded-xl border border-red-500/20">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-slate-300">
                এই একাউন্টটি স্থগিত রয়েছে। তাই কোনো মেসেজ আদান-প্রদান করা সম্ভব নয়।
              </p>
            </div>
          </div>
        ) : conversation.isPendingApproval ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#202c33] p-3 rounded-xl border border-amber-500/20">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-slate-300">
                {currentUser.isCounselor
                  ? 'এই শিক্ষার্থী চ্যাট করার জন্য রিকোয়েস্ট পাঠিয়েছে।'
                  : 'আপনার রিকোয়েস্ট কাউন্সিলরের কাছে পাঠানো হয়েছে। একসেপ্ট করার পর আপনি চ্যাট করতে পারবেন।'}
              </p>
            </div>
            {currentUser.isCounselor && (
              <button
                onClick={handleAcceptRequest}
                disabled={sending}
                className="whitespace-nowrap px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>রিকোয়েস্ট একসেপ্ট করুন</span>
              </button>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage('text', inputText);
            }}
            className="flex items-center gap-1.5 sm:gap-2"
          >
            {/* Emoji Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#202c33] hover:text-white transition cursor-pointer"
              title="ইমোজি"
            >
              <Smile className="h-5 w-5" />
            </button>

            {/* Photo Upload Button (Image Sharing) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-[#202c33] hover:text-[#00a884] transition cursor-pointer"
              title="ছবি পাঠান"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Text Input */}
            <textarea
              id="chat-message-input"
              rows={1}
              placeholder={
                isOtherCounselor
                  ? 'আপনার কাউন্সিলরকে মেসেজ লিখুন...'
                  : 'মেসেজ লিখুন...'
              }
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputText.trim() && !sending) {
                    sendMessage('text', inputText);
                  }
                }
              }}
              className="flex-1 rounded-lg border border-transparent bg-[#202c33] py-2.5 px-3.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none transition resize-none max-h-32 overflow-y-auto leading-normal"
            />

            {/* Voice Record Button or Send Button */}
            {inputText.trim() ? (
              <button
                id="chat-send-btn"
                type="submit"
                disabled={sending}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00a884] text-slate-950 font-bold shadow-xs hover:bg-[#008f72] disabled:opacity-50 transition cursor-pointer shrink-0"
                title="মেসেজ পাঠান"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                ) : (
                  <Send className="h-4 w-4 text-slate-950 fill-slate-950" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition cursor-pointer shrink-0 ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-[#202c33] text-slate-300 hover:bg-[#2a3942]'
                }`}
                title="ভয়েস মেসেজ রেকর্ড করুন"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Labels Modal */}
      {showLabelModal && (
        <LabelModal
          conversation={conversation}
          labels={labels}
          onLabelsUpdated={setLabels}
          onConversationLabelsChanged={(cId, updatedLabels) => {
            conversation.labels = updatedLabels;
          }}
          onClose={() => setShowLabelModal(false)}
          counselorId={currentUser.uid}
        />
      )}

      {/* Counselor Public Profile Modal */}
      {showPublicProfile && (
        <PublicCounselorProfileModal
          counselor={otherUserObj}
          onClose={() => setShowPublicProfile(false)}
        />
      )}

      {/* Delete Conversation Confirmation Modal */}
      {showDeleteConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-center text-sm font-bold text-slate-900">
              সম্পূর্ণ চ্যাট মুছে ফেলতে চান?
            </h3>
            <p className="mt-1 text-center text-xs text-slate-500 leading-relaxed">
              এই কথোপকথনের সমস্ত মেসেজ ও ছবি স্থায়ীভাবে ডিলিট হয়ে যাবে।
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConvModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={deleteConvLoading}
                onClick={handleDeleteConversation}
                className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
              >
                {deleteConvLoading ? 'ডিলিট হচ্ছে...' : 'ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
