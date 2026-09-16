export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  photoURL?: string;
  isBlocked: boolean;
  isOnline: boolean;
  lastActiveAt: string;
  lastSeen?: string;
  createdAt: string;
  isCounselor?: boolean;
  role?: 'main_counselor' | 'sub_counselor' | 'user';
  counselorGroupId?: string;
  parentCounselorId?: string;
  referralCode?: string;
  counselorPin?: string; // Secret PIN set by Admin for counselor login
  counselorId?: string; // If registered under a specific counselor
  autoReplyEnabled?: boolean; // Automatic waiting message reply
  autoReplyText?: string;     // Custom text for auto reply
  aiReplyEnabled?: boolean;   // AI Counselor automated assistant mode
  isTrustedModeOn?: boolean;  // Admin/Counselor trust mode
  ipAddress?: string;
  deviceId?: string;
  deviceFingerprint?: string;
  blockedAt?: string;
  blockedBy?: string;
  blockedReason?: string;
}

export interface BlockedEntity {
  id: string;
  type: 'ip' | 'device' | 'fingerprint' | 'phone';
  value: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  blockedAt: string;
  blockedBy: string;
  reason?: string;
}

export type MessageType = 'text' | 'image' | 'audio';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface LevelChat {
  id: string;
  name: string;
  levelNumber: string; // e.g. "Level 1", "Level 2", "VIP"
  description: string;
  createdByCounselorId: string;
  createdByCounselorName: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageSenderName?: string;
  lastMessageType?: MessageType;
  coverColor?: string; // Accent color
  memberCount?: number;
}

export interface LevelChatMessage {
  id: string;
  levelChatId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  isCounselor?: boolean;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaDuration?: number;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  mediaDuration?: number; // duration in seconds for audio
  status: MessageStatus;
  timestamp: string;
}

export interface ChatLabel {
  id: string;
  name: string;
  color: string; // hex or tailwind identifier
  counselorId?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantDetails: {
    [uid: string]: {
      name: string;
      phone: string;
      photoURL?: string;
      isCounselor?: boolean;
      createdAt?: string;
    };
  };
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageType?: MessageType;
  updatedAt: string;
  unreadCounts?: {
    [uid: string]: number;
  };
  labels?: string[]; // array of label IDs
  counselorId?: string;
  counselorGroupId?: string;
  parentCounselorId?: string;
  counselorRead?: boolean;
  counselorReadAt?: string;
  hasStudentMessage?: boolean;
  isPendingApproval?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  onlineUsers: number;
  totalConversations: number;
  totalMessages: number;
  newRegistrationsToday: number;
  totalCounselors?: number;
}
