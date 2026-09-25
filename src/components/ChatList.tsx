import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  UserPlus,
  MessageSquare,
  Mic,
  Image as ImageIcon,
  ShieldCheck,
  Tag,
  Trash2,
  GraduationCap,
  Plus,
  Layers,
  Sparkles,
  Pin,
  CheckCheck,
} from 'lucide-react';
import { Conversation, ChatLabel, UserProfile, LevelChat } from '../types';
import { formatMessageTime } from '../utils/media';
import { COUNSELOR_UID } from '../utils/counselor';
import { LABEL_COLORS, fetchLabels } from '../utils/labels';
import { LabelModal } from './LabelModal';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { sanitizeForFirestore } from '../utils/sanitize';

interface ChatListProps {
  currentUserId: string;
  currentUser: UserProfile | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  levelChats: LevelChat[];
  activeLevelChatId: string | null;
  onSelectConversation: (conv: Conversation) => void;
  onSelectLevelChat: (chat: LevelChat) => void;
  onDeleteConversation: (convId: string) => void;
  onOpenAddContact: () => void;
  onOpenCreateLevelChat: () => void;
  loading: boolean;
  userPresenceMap: { [uid: string]: { isOnline: boolean; lastActiveAt?: string } };
}

const isNewStudent = (createdAtStr?: string) => {
  if (!createdAtStr) return false;
  const createdTime = new Date(createdAtStr).getTime();
  if (isNaN(createdTime)) return false;
  const now = Date.now();
  const diffHours = (now - createdTime) / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours < 12;
};

export const ChatList: React.FC<ChatListProps> = React.memo(({
  currentUserId,
  currentUser,
  conversations = [],
  activeConversationId,
  levelChats = [],
  activeLevelChatId,
  onSelectConversation,
  onSelectLevelChat,
  onDeleteConversation,
  onOpenAddContact,
  onOpenCreateLevelChat,
  loading = false,
  userPresenceMap = {},
}) => {
  const [activeTab, setActiveTab] = useState<'level_chats' | 'direct_chats'>('direct_chats');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string>('all');
  const [labels, setLabels] = useState<ChatLabel[]>([]);
  const [labelModalConv, setLabelModalConv] = useState<Conversation | null>(null);

  // Context / Delete modal state
  const [deletingConv, setDeletingConv] = useState<Conversation | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isCounselor =
    !!currentUser?.isCounselor ||
    currentUser?.uid.startsWith('counselor') ||
    currentUser?.uid.startsWith('sub_counselor') ||
    currentUser?.uid === COUNSELOR_UID;

  useEffect(() => {
    fetchLabels().then(setLabels);
  }, []);

  // Filter level chats by search
  const filteredLevelChats = (levelChats || []).filter((chat) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      chat.name.toLowerCase().includes(term) ||
      chat.levelNumber.toLowerCase().includes(term) ||
      (chat.description && chat.description.toLowerCase().includes(term))
    );
  });

  // Get other participant detail
  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participantIds.find((id) => id !== currentUserId) || conv.participantIds[0];
    const detail = conv.participantDetails?.[otherId] || {
      name: 'সদস্য',
      phone: '',
      photoURL: undefined,
      isCounselor: false,
    };
    const isCounselor =
      detail.isCounselor ||
      otherId.startsWith('counselor') ||
      otherId.startsWith('sub_counselor') ||
      otherId === COUNSELOR_UID;

    return {
      uid: otherId,
      ...detail,
      isCounselor,
      isOnline: userPresenceMap[otherId]?.isOnline ?? (isCounselor ? true : false),
    };
  };

  // Auto switch to direct_chats tab when an active direct conversation is selected
  useEffect(() => {
    if (activeConversationId) {
      setActiveTab('direct_chats');
    }
  }, [activeConversationId]);

  // Filter conversations by search and selected label
  const filteredConversations = conversations.filter((conv) => {
    // Hide blocked conversations if blocked by current user
    if ((conv as any).isBlocked && (conv as any).blockedBy === currentUserId) {
      return false;
    }

    const other = getOtherParticipant(conv);

    // Label filter
    if (selectedLabelFilter !== 'all') {
      if (!conv.labels || !conv.labels.includes(selectedLabelFilter)) {
        return false;
      }
    }

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      other.name.toLowerCase().includes(term) ||
      (other.phone && other.phone.toLowerCase().includes(term)) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(term))
    );
  });

  // Sort conversations:
  // 1. Pinned Counselor IDs first
  // 2. Unread messages at the top
  // 3. Most recent messages (updatedAt)
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const otherA = getOtherParticipant(a);
    const otherB = getOtherParticipant(b);

    const isACounselor = otherA.isCounselor || otherA.uid === currentUser?.counselorId;
    const isBCounselor = otherB.isCounselor || otherB.uid === currentUser?.counselorId;

    if (isACounselor && !isBCounselor) return -1;
    if (!isACounselor && isBCounselor) return 1;

    const unreadA = a.unreadCounts?.[currentUserId] ?? (a.lastMessageSenderId && a.lastMessageSenderId !== currentUserId ? 1 : 0);
    const unreadB = b.unreadCounts?.[currentUserId] ?? (b.lastMessageSenderId && b.lastMessageSenderId !== currentUserId ? 1 : 0);

    if (unreadA > 0 && unreadB === 0) return -1;
    if (unreadA === 0 && unreadB > 0) return 1;

    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  // Handle Chat Delete
  const confirmDeleteChat = async () => {
    if (!deletingConv) return;
    setDeleteLoading(true);

    try {
      // 1. Delete all messages inside conversation
      const msgsRef = collection(db, 'conversations', deletingConv.id, 'messages');
      const msgSnaps = await getDocs(msgsRef);
      for (const mDoc of msgSnaps.docs) {
        await deleteDoc(mDoc.ref);
      }

      // 2. Delete conversation document
      await deleteDoc(doc(db, 'conversations', deletingConv.id));

      onDeleteConversation(deletingConv.id);
      setDeletingConv(null);
    } catch (err) {
      console.error('Error deleting conversation:', err);
      alert('চ্যাট ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBlockChat = async () => {
    if (!deletingConv) return;
    setDeleteLoading(true);
    try {
      await updateDoc(doc(db, 'conversations', deletingConv.id), {
        isBlocked: true,
        blockedBy: currentUserId
      });
      setDeletingConv(null);
    } catch (err) {
      console.error('Error blocking conversation:', err);
      alert('ব্লক করতে সমস্যা হয়েছে।');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDeleteAllChats = async () => {
    setDeleteLoading(true);
    try {
      for (const conv of filteredConversations) {
        // delete messages inside
        const msgsRef = collection(db, 'conversations', conv.id, 'messages');
        const msgSnaps = await getDocs(msgsRef);
        for (const mDoc of msgSnaps.docs) {
          await deleteDoc(mDoc.ref);
        }
        await deleteDoc(doc(db, 'conversations', conv.id));
        onDeleteConversation(conv.id);
      }
      setShowDeleteAllModal(false);
    } catch (err) {
      console.error('Error deleting all chats:', err);
      alert('সকল চ্যাট ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Touch / Mouse Long Press handlers
  const handleTouchStart = (conv: Conversation) => {
    longPressTimerRef.current = setTimeout(() => {
      setDeletingConv(conv);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <aside
      id="chat-list-panel"
      className="flex h-full w-full flex-col border-r border-[#222d34] bg-[#0b141a] text-white"
    >
      {/* DIRECT CHATS LIST (Primary Main View) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0b141a]">
        {/* Search & Actions Bar for Counselors */}
        {isCounselor ? (
            <div className="p-3 border-b border-[#222d34] space-y-3 bg-[#111b21]">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="chat-search-input"
                    type="text"
                    placeholder="নাম বা মোবাইল নাম্বার দিয়ে খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-transparent bg-[#202c33] py-2 pl-9 pr-3 text-xs font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                  />
                </div>
                <button
                  onClick={() => setShowDeleteAllModal(true)}
                  className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-[#202c33] border border-[#222d34] text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                  title="সকল চ্যাট ডিলিট করুন"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* WhatsApp Business Style Labels Filters Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  onClick={() => setSelectedLabelFilter('all')}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 font-bold transition cursor-pointer ${
                    selectedLabelFilter === 'all'
                      ? 'bg-[#00a884] text-slate-950 font-extrabold shadow-sm'
                      : 'bg-[#202c33] text-slate-300 hover:bg-[#2a3942]'
                  }`}
                >
                  সব ({filteredConversations.length})
                </button>
                {labels.map((lbl) => {
                  const isSelected = selectedLabelFilter === lbl.name;
                  return (
                    <button
                      key={lbl.id}
                      onClick={() => setSelectedLabelFilter(isSelected ? 'all' : lbl.name)}
                      className={`shrink-0 rounded-full px-3 py-1.5 font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#00a884] text-slate-950 font-extrabold shadow-sm'
                          : 'bg-[#202c33] text-slate-300 hover:bg-[#2a3942]'
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      <span>{lbl.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Search input for students if they have chats */
            conversations.length > 0 && (
              <div className="p-3 border-b border-[#222d34] bg-[#111b21]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="মেসেজ বা নাম খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-transparent bg-[#202c33] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-400 focus:outline-none transition"
                  />
                </div>
              </div>
            )
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-1.5">
            {loading ? (
              <div className="space-y-2 p-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-[#222d34] rounded-2xl bg-[#111b21] animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-[#202c33] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-[#202c33] rounded-md" />
                      <div className="h-2.5 w-48 bg-[#202c33]/60 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedConversations.length === 0 ? (
              isCounselor ? (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#202c33] text-[#00a884] mb-3 border border-[#222d34]">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-100">কোনো চ্যাট পাওয়া যায়নি</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-[240px] leading-relaxed">
                    {selectedLabelFilter !== 'all'
                      ? `"${selectedLabelFilter}" লেবেলে কোনো চ্যাট নেই।`
                      : 'মোবাইল নাম্বার দিয়ে স্টুডেন্ট খুঁজে যুক্ত করুন বা অপেক্ষা করুন।'}
                  </p>
                  {selectedLabelFilter !== 'all' ? (
                    <button
                      onClick={() => setSelectedLabelFilter('all')}
                      className="mt-3 text-xs font-bold text-[#00a884] hover:underline cursor-pointer"
                    >
                      সকল চ্যাট দেখুন
                    </button>
                  ) : (
                    <button
                      id="empty-add-contact-btn"
                      onClick={onOpenAddContact}
                      className="mt-4 flex items-center gap-1.5 rounded-xl bg-[#00a884] px-4 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-[#008f72] transition cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>নতুন যোগাযোগ যোগ করুন</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#202c33] text-[#00a884] mb-3 border border-[#222d34]">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-100">কোনো সক্রিয় চ্যাট নেই</p>
                  <p className="mt-1 text-xs text-slate-400 max-w-[240px] leading-relaxed">
                    আপনার কোনো বার্তা থাকলে তা এখানে পরিষ্কারভাবে দেখতে পাবেন।
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-1.5 pb-2">
                {sortedConversations.map((conv) => {
                  const other = getOtherParticipant(conv);
                  const isActive = conv.id === activeConversationId;
                  const unread = conv.unreadCounts?.[currentUserId] ?? (conv.lastMessageSenderId && conv.lastMessageSenderId !== currentUserId ? 1 : 0);
                  const isUnread = unread > 0;
                  const isCounselorChat = other.isCounselor || other.uid === currentUser?.counselorId;
                  const isReadByCounselor = !isUnread && Boolean(conv.counselorRead);

                  return (
                    <div
                      key={conv.id}
                      id={`conversation-item-${conv.id}`}
                      onTouchStart={() => handleTouchStart(conv)}
                      onTouchEnd={handleTouchEnd}
                      onMouseDown={() => handleTouchStart(conv)}
                      onMouseUp={handleTouchEnd}
                      className={`group relative flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        isActive
                          ? 'bg-[#202c33] border-[#00a884]/60 shadow-sm'
                          : isUnread
                          ? 'bg-[#182a32] border-[#00a884]/40 hover:bg-[#1e343f]'
                          : 'bg-[#111b21] border-transparent hover:bg-[#202c33]/70'
                      }`}
                    >
                    <div
                      onClick={() => {
                        if (isCounselor) {
                          (conv as any).counselorRead = true;
                          if (conv.unreadCounts) {
                            conv.unreadCounts[currentUserId] = 0;
                          }
                        }
                        onSelectConversation(conv);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      {/* Avatar with live presence indicator */}
                      <div className="relative shrink-0">
                        <div
                          className={`h-11 w-11 overflow-hidden rounded-full border ${
                            isCounselorChat
                              ? 'border-[#00a884]/60 bg-teal-950 text-teal-300'
                              : 'border-[#222d34] bg-[#202c33] text-slate-200'
                          } flex items-center justify-center font-bold text-sm shadow-xs`}
                        >
                          {other.photoURL ? (
                            <img
                              src={other.photoURL}
                              alt={other.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            other.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111b21] ${
                            other.isOnline ? 'bg-[#00a884]' : 'bg-slate-500'
                          }`}
                          title={other.isOnline ? 'অনলাইন' : 'অফলাইন'}
                        />
                      </div>

                      {/* Message detail */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <h3 className={`text-xs sm:text-sm font-bold truncate leading-tight ${unread > 0 ? 'text-white' : 'text-slate-100'}`}>
                              {other.name}
                            </h3>
                            {isNewStudent(other.createdAt) && !isCounselorChat && (
                              <span className="inline-flex items-center rounded-md bg-[#00a884]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#00a884] shrink-0 border border-[#00a884]/30">
                                নতুন স্টুডেন্ট
                              </span>
                            )}
                            {isCounselorChat && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#00a884]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#00a884] shrink-0">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                <span>কাউন্সিলর</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {isCounselorChat && (
                              <Pin className="h-3 w-3 text-[#00a884] fill-[#00a884] transform -rotate-45" title="পিন করা আইডি" />
                            )}
                            <span className={`text-[10px] font-mono tabular-nums ${unread > 0 ? 'text-[#00a884] font-bold' : 'text-slate-400 font-normal'}`}>
                              {formatMessageTime(conv.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Phone display for Counselor clarity */}
                        {other.phone && (
                          <div className="text-[10px] text-slate-400 font-mono font-medium leading-tight mt-0.5 tabular-nums">
                            {other.phone}
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-between">
                          <div
                            className={`flex items-center gap-1.5 truncate max-w-[170px] sm:max-w-[220px] ${
                              unread > 0
                                ? 'text-[#00a884] font-bold text-xs'
                                : 'text-slate-400 font-normal text-xs'
                            }`}
                          >
                            {conv.lastMessageType === 'audio' ? (
                              <>
                                <Mic className={`h-3.5 w-3.5 shrink-0 ${unread > 0 ? 'text-[#00a884]' : 'text-teal-400'}`} />
                                <span>ভয়েস মেসেজ</span>
                              </>
                            ) : conv.lastMessageType === 'image' ? (
                              <>
                                <ImageIcon className={`h-3.5 w-3.5 shrink-0 ${unread > 0 ? 'text-[#00a884]' : 'text-sky-400'}`} />
                                <span>ছবি</span>
                              </>
                            ) : (
                              <span className="truncate">
                                {conv.lastMessage || 'কথোপকথন শুরু করতে ট্যাপ করুন'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCounselor ? (
                              unread > 0 ? (
                                <span className="flex items-center gap-1 rounded-full bg-[#00a884] px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow-xs tabular-nums">
                                  <span>{unread}</span>
                                </span>
                              ) : isReadByCounselor ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-teal-400 font-semibold bg-[#182229] px-2 py-0.5 rounded-full border border-teal-700/40">
                                  <CheckCheck className="h-3 w-3 text-teal-400" />
                                  <span>পড়া হয়েছে</span>
                                </span>
                              ) : null
                            ) : unread > 0 ? (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00a884] px-1.5 text-[10px] font-extrabold text-slate-950 tabular-nums">
                                {unread}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Assigned WhatsApp Business Labels Display - ONLY SHOWN TO COUNSELORS */}
                        {isCounselor && conv.labels && conv.labels.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {conv.labels.map((lbl) => (
                              <span
                                key={lbl}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLabelFilter(selectedLabelFilter === lbl ? 'all' : lbl);
                                }}
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition cursor-pointer ${
                                  lbl === 'নিউ মেম্বার'
                                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                }`}
                                title={`"${lbl}" লেবেল ফিল্টার`}
                              >
                                {lbl}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Set Labels & Delete */}
                    <div className="flex items-center gap-1 ml-2 transition shrink-0">
                      {isCounselor && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLabelModalConv(conv);
                            }}
                            className={`rounded-lg p-1.5 transition cursor-pointer border ${
                              conv.labels && conv.labels.length > 0
                                ? 'text-[#00a884] bg-[#00a884]/15 border-[#00a884]/40 hover:bg-[#00a884]/25'
                                : 'text-slate-400 hover:text-teal-400 hover:bg-[#202c33] border-[#222d34] bg-[#111b21]'
                            }`}
                            title="লেবেল সেট করুন"
                          >
                            <Tag className={`h-3.5 w-3.5 ${conv.labels && conv.labels.length > 0 ? 'fill-[#00a884]' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingConv(conv);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-[#222d34] bg-[#111b21] transition cursor-pointer"
                            title="চ্যাটটি ডিলিট করুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>

      {/* Label Management Modal */}
      {labelModalConv && (
        <LabelModal
          conversation={labelModalConv}
          labels={labels}
          onLabelsUpdated={setLabels}
          onConversationLabelsChanged={(cId, updatedLabels) => {
            const target = conversations.find((c) => c.id === cId);
            if (target) {
              target.labels = updatedLabels;
            }
          }}
          onClose={() => setLabelModalConv(null)}
          counselorId={currentUser?.uid}
        />
      )}

      {/* Delete / Block Confirmation Modal */}
      {deletingConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#111b21] p-6 shadow-2xl border border-[#222d34] animate-in zoom-in-95 text-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-red-500/30 text-rose-400 mb-4 shadow-sm">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="text-center text-base font-bold text-white tracking-tight">
              চ্যাট অপশন
            </h3>
            <p className="mt-1.5 text-center text-xs text-slate-400 leading-relaxed max-w-[260px] mx-auto">
              আপনি কি এই চ্যাটটি ডিলিট করতে চান নাকি ইউজারকে ব্লক করতে চান?
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleBlockChat}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                {deleteLoading ? 'প্রসেসিং...' : 'ইউজারকে ব্লক করুন'}
              </button>
              
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmDeleteChat}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                {deleteLoading ? 'ডিলিট হচ্ছে...' : 'চ্যাটটি ডিলিট করুন'}
              </button>
              
              <button
                type="button"
                onClick={() => setDeletingConv(null)}
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] py-2.5 text-xs font-semibold text-slate-300 hover:bg-[#2a3942] transition cursor-pointer"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Chats Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#111b21] p-6 shadow-2xl border border-[#222d34] animate-in zoom-in-95 text-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-red-500/30 text-rose-400 mb-4 shadow-sm">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="text-center text-base font-bold text-white tracking-tight">
              সকল চ্যাট ডিলিট?
            </h3>
            <p className="mt-1.5 text-center text-xs text-slate-400 leading-relaxed max-w-[260px] mx-auto">
              আপনার সমস্ত চ্যাট হিস্ট্রি স্থায়ীভাবে ডিলিট হয়ে যাবে যা আর পুনরুদ্ধার সম্ভব নয়।
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmDeleteAllChats}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
                {deleteLoading ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, সব ডিলিট করুন'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="w-full rounded-xl border border-[#222d34] bg-[#202c33] py-2.5 text-xs font-semibold text-slate-300 hover:bg-[#2a3942] transition cursor-pointer"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
});
