import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Mic,
  Square,
  Trash2,
  GraduationCap,
  Sparkles,
  Layers,
  Loader2,
  Users,
  ShieldCheck,
  Check,
  Play,
  Pause,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, LevelChat, LevelChatMessage } from '../types';
import { FormattedText } from './FormattedText';
import { compressImage, formatMessageTime } from '../utils/media';

interface LevelChatWindowProps {
  currentUser: UserProfile;
  levelChat: LevelChat;
  onBack: () => void;
  onDeleteLevelChat?: (chatId: string) => void;
}

export const LevelChatWindow: React.FC<LevelChatWindowProps> = ({
  currentUser,
  levelChat,
  onBack,
  onDeleteLevelChat,
}) => {
  const [messages, setMessages] = useState<LevelChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const isCounselorOrAdmin =
    !!currentUser.isCounselor ||
    currentUser.uid.startsWith('counselor') ||
    currentUser.uid === levelChat.createdByCounselorId;

  // 1. Subscribe to real-time messages for this Level Chat
  useEffect(() => {
    const q = query(
      collection(db, 'level_chats', levelChat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: LevelChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push({ id: docSnap.id, ...docSnap.data() } as LevelChatMessage);
        });
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (err) => {
        console.warn('Level chat messages subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [levelChat.id]);

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const now = new Date().toISOString();
      const newMsg: Omit<LevelChatMessage, 'id'> = {
        levelChatId: levelChat.id,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        senderPhoto: currentUser.photoURL,
        isCounselor: !!currentUser.isCounselor,
        type: 'text',
        content,
        timestamp: now,
      };

      await addDoc(collection(db, 'level_chats', levelChat.id, 'messages'), newMsg);

      // Update parent level chat snippet
      await updateDoc(doc(db, 'level_chats', levelChat.id), {
        lastMessage: content,
        lastMessageSenderName: currentUser.name,
        lastMessageType: 'text',
        updatedAt: now,
      });
    } catch (err) {
      console.error('Failed to send level chat message:', err);
    } finally {
      setSending(false);
    }
  };

  // Send Image Message
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const compressedData = await compressImage(file, 800, 0.7);
      const now = new Date().toISOString();
      const caption = inputText.trim() || 'ছবি পাঠানো হয়েছে';

      const newMsg: Omit<LevelChatMessage, 'id'> = {
        levelChatId: levelChat.id,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        senderPhoto: currentUser.photoURL,
        isCounselor: !!currentUser.isCounselor,
        type: 'image',
        content: caption,
        mediaUrl: compressedData,
        timestamp: now,
      };

      await addDoc(collection(db, 'level_chats', levelChat.id, 'messages'), newMsg);
      setInputText('');

      await updateDoc(doc(db, 'level_chats', levelChat.id), {
        lastMessage: '📷 ছবি',
        lastMessageSenderName: currentUser.name,
        lastMessageType: 'image',
        updatedAt: now,
      });
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('আপনার ব্রাউজার বা ডিভাইসে ভয়েস রেকর্ড করার ব্যবস্থা সাপোর্ট করে না।');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const now = new Date().toISOString();

          try {
            const newMsg: Omit<LevelChatMessage, 'id'> = {
              levelChatId: levelChat.id,
              senderId: currentUser.uid,
              senderName: currentUser.name,
              senderPhoto: currentUser.photoURL,
              isCounselor: !!currentUser.isCounselor,
              type: 'audio',
              content: 'ভয়েস মেসেজ',
              mediaUrl: base64Audio,
              mediaDuration: recordingDuration,
              timestamp: now,
            };

            await addDoc(collection(db, 'level_chats', levelChat.id, 'messages'), newMsg);

            await updateDoc(doc(db, 'level_chats', levelChat.id), {
              lastMessage: '🎤 ভয়েস মেসেজ',
              lastMessageSenderName: currentUser.name,
              lastMessageType: 'audio',
              updatedAt: now,
            });
          } catch (err) {
            console.warn('Error saving voice note:', err);
          }
        };

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission notice:', err?.message || err);
      alert('মাইক্রোফোন পারমিশন প্রয়োজন। অনুগ্রহ করে ব্রাউজার সেটিংসে অনুমতি দিন।');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      audioChunksRef.current = [];
    }
  };

  // Audio Playback
  const handlePlayAudio = (msgId: string, url?: string) => {
    if (!url) return;

    if (playingAudioId === msgId && activeAudioRef.current) {
      activeAudioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setPlayingAudioId(msgId);

    audio.play().catch(() => setPlayingAudioId(null));
    audio.onended = () => setPlayingAudioId(null);
  };

  // Delete Level Chat (Counselor only)
  const handleDeleteLevelChat = async () => {
    if (!isCounselorOrAdmin) return;
    try {
      // 1. Delete all messages inside
      const msgsSnap = await getDocs(collection(db, 'level_chats', levelChat.id, 'messages'));
      for (const d of msgsSnap.docs) {
        await deleteDoc(d.ref);
      }
      // 2. Delete level chat document
      await deleteDoc(doc(db, 'level_chats', levelChat.id));

      if (onDeleteLevelChat) {
        onDeleteLevelChat(levelChat.id);
      }
      onBack();
    } catch (err) {
      console.error('Error deleting level chat:', err);
      alert('লেভেল চ্যাট ডিলিট করা যায়নি।');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 py-2.5 shadow-2xs z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 transition cursor-pointer md:hidden"
            title="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-xs font-bold text-xs">
            <Layers className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {levelChat.name}
              </h3>
              <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.2 text-[10px] font-bold text-teal-800">
                {levelChat.levelNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <GraduationCap className="h-3 w-3 text-teal-600 shrink-0" />
              <span>কাউন্সিলর: {levelChat.createdByCounselorName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {isCounselorOrAdmin && (
            <>
              {deleteConfirm ? (
                <div className="flex items-center gap-1 animate-in fade-in">
                  <button
                    onClick={handleDeleteLevelChat}
                    className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-700 transition cursor-pointer"
                  >
                    নিশ্চিত মুছুন
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    না
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                  title="লেভেল চ্যাট মুছে ফেলুন"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Level Description Banner */}
      {levelChat.description && (
        <div className="border-b border-teal-100 bg-teal-50/60 px-4 py-2 flex items-center gap-2 text-[11px] text-teal-900 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-teal-600 shrink-0" />
          <span className="truncate">{levelChat.description}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-teal-100/70 text-teal-600 mb-2">
              <Layers className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {levelChat.name}-এ স্বাগতম!
            </h4>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              কাউন্সিলর ও শিক্ষার্থীদের লাইভ চ্যাট ফোরাম। নিচে আপনার প্রশ্ন বা মেসেজ লিখুন।
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            const isCounselorMsg = !!msg.isCounselor;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Name & Badge (shown for non-me or counselors) */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-700">
                      {msg.senderName}
                    </span>
                    {isCounselorMsg && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-100 px-1.5 py-0.2 text-[9px] font-bold text-teal-800">
                        <GraduationCap className="h-2.5 w-2.5" />
                        <span>কাউন্সিলর</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-2xs ${
                    isMe
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-xs'
                      : isCounselorMsg
                      ? 'bg-teal-50/90 text-slate-900 border border-teal-200 rounded-bl-xs'
                      : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  {/* Image Message */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div className="mb-1.5 overflow-hidden rounded-xl">
                      <img
                        src={msg.mediaUrl}
                        alt="Shared media"
                        className="max-h-60 w-full object-cover rounded-xl"
                      />
                    </div>
                  )}

                  {/* Audio Message */}
                  {msg.type === 'audio' && msg.mediaUrl && (
                    <div className="flex items-center gap-2 py-1">
                      <button
                        onClick={() => handlePlayAudio(msg.id, msg.mediaUrl)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition cursor-pointer ${
                          isMe
                            ? 'bg-white text-teal-700'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 ml-0.5" />
                        )}
                      </button>
                      <div className="text-xs font-mono">
                        ভয়েস নোট {msg.mediaDuration ? `(${msg.mediaDuration}s)` : ''}
                      </div>
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && msg.type !== 'image' && msg.type !== 'audio' && (
                    <div className="text-xs sm:text-sm">
                      <FormattedText text={msg.content} isMe={isMe} />
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      isMe ? 'text-teal-100' : 'text-slate-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {isMe && <Check className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-slate-200 bg-white p-2.5 sm:p-3">
        {isRecording ? (
          <div className="flex items-center justify-between rounded-2xl bg-red-50 p-2 border border-red-200 animate-pulse">
            <div className="flex items-center gap-2 text-red-600 font-mono text-xs px-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
              <span>রেকর্ডিং চলছে: {recordingDuration}s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={cancelRecording}
                className="rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer"
              >
                <Square className="h-3 w-3 fill-white" />
                <span>পাঠান</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition cursor-pointer"
              title="ছবি পাঠান"
            >
              {uploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </button>

            {/* Voice Record Button */}
            <button
              type="button"
              onClick={startRecording}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition cursor-pointer"
              title="ভয়েস মেসেজ রেকর্ড করুন"
            >
              <Mic className="h-5 w-5" />
            </button>

            {/* Text Input */}
            <textarea
              rows={1}
              placeholder={`${levelChat.levelNumber}-এ মেসেজ লিখুন...`}
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
                    handleSendMessage(e as any);
                  }
                }
              }}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition shadow-2xs resize-none max-h-32 overflow-y-auto leading-normal"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-xs hover:opacity-95 disabled:opacity-40 transition cursor-pointer"
              title="মেসেজ পাঠান"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
