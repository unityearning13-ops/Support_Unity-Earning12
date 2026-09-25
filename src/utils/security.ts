import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { UserProfile, BlockedEntity } from '../types';
import { getDeviceId } from './device';

// Cached IP in session to avoid redundant network queries
let cachedIp: string | null = null;
let cachedFingerprint: string | null = null;

/**
 * Generate a robust deterministic browser & hardware fingerprint.
 * Survives incognito, tab restarts, and clearings by evaluating hardware specs and canvas rendering.
 */
export const getClientFingerprint = (): string => {
  if (cachedFingerprint) return cachedFingerprint;

  try {
    const stored = localStorage.getItem('ue_fp_hash');
    if (stored && stored.length > 8) {
      cachedFingerprint = stored;
      return stored;
    }
  } catch {}

  const components: string[] = [];

  // 1. Screen attributes
  if (typeof window !== 'undefined' && window.screen) {
    components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
  }

  // 2. Navigator attributes
  if (typeof navigator !== 'undefined') {
    components.push(navigator.userAgent || '');
    components.push(navigator.language || '');
    components.push(String(navigator.hardwareConcurrency || 4));
  }

  // 3. Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  } catch {}

  // 4. Canvas Fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 5, 60, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('UnityEarning🛡️', 15, 10);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {}

  // Create simple stable hash
  const rawString = components.join('###');
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const result = 'fp_' + Math.abs(hash).toString(36) + '_' + (window.screen?.width || 0);
  cachedFingerprint = result;

  try {
    localStorage.setItem('ue_fp_hash', result);
  } catch {}

  return result;
};

/**
 * Get client's public IP address reliably with fallbacks.
 */
export const getClientIp = async (): Promise<string> => {
  if (cachedIp) return cachedIp;

  try {
    const saved = sessionStorage.getItem('ue_user_ip');
    if (saved && saved.length > 5) {
      cachedIp = saved;
      return saved;
    }
  } catch {}

  // Service 1: ipify IPv4/IPv6
  try {
    const res = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedIp = data.ip;
        sessionStorage.setItem('ue_user_ip', data.ip);
        return data.ip;
      }
    }
  } catch {}

  // Service 2: ipify IPv4
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedIp = data.ip;
        sessionStorage.setItem('ue_user_ip', data.ip);
        return data.ip;
      }
    }
  } catch {}

  // Service 3: ipapi
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedIp = data.ip;
        sessionStorage.setItem('ue_user_ip', data.ip);
        return data.ip;
      }
    }
  } catch {}

  return 'unknown_ip';
};

/**
 * Sanitize strings for Firestore document keys.
 */
export const sanitizeKey = (val: string): string => {
  return (val || '').replace(/[\/\.\s:#\$\[\]]/g, '_');
};

/**
 * Clean phone number
 */
export const cleanPhoneVal = (phone: string): string => {
  return (phone || '').replace(/[^\d]/g, '');
};

/**
 * Block a user along with their Device ID, Hardware Fingerprint, IP Address, and Phone Number.
 * Writes records to both 'users' collection and 'blocked_entities' collection.
 */
export const blockUserAndDevice = async (
  user: UserProfile,
  blockedBy: string,
  reason: string = 'Security Violation'
): Promise<void> => {
  const now = new Date().toISOString();
  const deviceId = user.deviceId || getDeviceId();
  const currentIp = user.ipAddress || (await getClientIp());
  const fingerprint = user.deviceFingerprint || getClientFingerprint();
  const cleanedPhone = cleanPhoneVal(user.phone);

  // 1. Update User Profile in Firestore
  await updateDoc(doc(db, 'users', user.uid), {
    isBlocked: true,
    blockedAt: now,
    blockedBy: blockedBy || 'Admin',
    blockedReason: reason,
    ipAddress: currentIp,
    deviceId: deviceId,
    deviceFingerprint: fingerprint,
  });

  // 2. Also look up any other devices bound to this user
  try {
    const devQuery = query(collection(db, 'devices'), where('userId', '==', user.uid));
    const devSnaps = await getDocs(devQuery);
    for (const d of devSnaps.docs) {
      const bDevId = d.id;
      const bKey = `dev_${sanitizeKey(bDevId)}`;
      await setDoc(doc(db, 'blocked_entities', bKey), {
        id: bKey,
        type: 'device',
        value: bDevId,
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        blockedAt: now,
        blockedBy: blockedBy || 'Admin',
        reason,
      });
    }
  } catch (err) {
    console.warn('Devices lookup warning during block:', err);
  }

  // 3. Block this user's UID
  const uidKey = `uid_${sanitizeKey(user.uid)}`;
  await setDoc(doc(db, 'blocked_entities', uidKey), {
    id: uidKey,
    type: 'device',
    value: user.uid,
    userId: user.uid,
    userName: user.name,
    userPhone: user.phone,
    blockedAt: now,
    blockedBy: blockedBy || 'Admin',
    reason,
  });

  // 4. Block by Device ID
  if (deviceId && deviceId !== 'unknown') {
    const devKey = `dev_${sanitizeKey(deviceId)}`;
    await setDoc(doc(db, 'blocked_entities', devKey), {
      id: devKey,
      type: 'device',
      value: deviceId,
      userId: user.uid,
      userName: user.name,
      userPhone: user.phone,
      blockedAt: now,
      blockedBy: blockedBy || 'Admin',
      reason,
    });
  }

  // 5. Block by IP Address
  if (currentIp && currentIp !== 'unknown_ip') {
    const ipKey = `ip_${sanitizeKey(currentIp)}`;
    await setDoc(doc(db, 'blocked_entities', ipKey), {
      id: ipKey,
      type: 'ip',
      value: currentIp,
      userId: user.uid,
      userName: user.name,
      userPhone: user.phone,
      blockedAt: now,
      blockedBy: blockedBy || 'Admin',
      reason,
    });
  }

  // 6. Block by Hardware Fingerprint
  if (fingerprint) {
    const fpKey = `fp_${sanitizeKey(fingerprint)}`;
    await setDoc(doc(db, 'blocked_entities', fpKey), {
      id: fpKey,
      type: 'fingerprint',
      value: fingerprint,
      userId: user.uid,
      userName: user.name,
      userPhone: user.phone,
      blockedAt: now,
      blockedBy: blockedBy || 'Admin',
      reason,
    });
  }

  // 7. Block by Phone
  if (cleanedPhone) {
    const phoneKey = `phone_${cleanedPhone}`;
    await setDoc(doc(db, 'blocked_entities', phoneKey), {
      id: phoneKey,
      type: 'phone',
      value: cleanedPhone,
      userId: user.uid,
      userName: user.name,
      userPhone: user.phone,
      blockedAt: now,
      blockedBy: blockedBy || 'Admin',
      reason,
    });
  }
};

/**
 * Unblock a user and remove their device, IP, and fingerprint from blocked entities.
 */
export const unblockUserAndDevice = async (
  user: UserProfile,
  unblockedBy: string
): Promise<void> => {
  const now = new Date().toISOString();
  const cleanedPhone = cleanPhoneVal(user.phone);

  // 1. Update User Profile in Firestore
  await updateDoc(doc(db, 'users', user.uid), {
    isBlocked: false,
    unblockedAt: now,
    unblockedBy: unblockedBy || 'Admin',
  });

  // 2. Remove from blocked_entities
  const keysToDelete: string[] = [
    `uid_${sanitizeKey(user.uid)}`,
  ];

  if (cleanedPhone) {
    keysToDelete.push(`phone_${cleanedPhone}`);
  }

  if (user.deviceId) {
    keysToDelete.push(`dev_${sanitizeKey(user.deviceId)}`);
  }

  if (user.ipAddress) {
    keysToDelete.push(`ip_${sanitizeKey(user.ipAddress)}`);
  }

  if (user.deviceFingerprint) {
    keysToDelete.push(`fp_${sanitizeKey(user.deviceFingerprint)}`);
  }

  // Also query any blocked_entities having this userId
  try {
    const q = query(collection(db, 'blocked_entities'), where('userId', '==', user.uid));
    const snaps = await getDocs(q);
    snaps.forEach((s) => {
      keysToDelete.push(s.id);
    });
  } catch (err) {
    console.warn('Blocked entities query warning:', err);
  }

  // Perform deletions
  const uniqueKeys = Array.from(new Set(keysToDelete));
  await Promise.all(
    uniqueKeys.map(async (k) => {
      try {
        await deleteDoc(doc(db, 'blocked_entities', k));
      } catch {}
    })
  );
};

/**
 * Set Global Unblock Mode in system settings.
 * When enabled (true), all blocks are bypassed so all users can use the app and referral links.
 * When disabled (false), normal blocking rules apply and blocked users cannot use the app.
 */
export const setGlobalUnblockMode = async (enabled: boolean): Promise<void> => {
  await setDoc(
    doc(db, 'settings', 'systemConfig'),
    {
      unblockAllUsers: enabled,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

/**
 * Unblock ALL users and wipe all blocked entities (IPs, devices, fingerprints, UIDs).
 * Used by admin to completely clear all blocks in the database at once.
 */
export const unblockAllUsersAndEntities = async (
  unblockedBy = 'চিফ এডমিন'
): Promise<{ unblockedUsersCount: number; clearedEntitiesCount: number }> => {
  const now = new Date().toISOString();
  let unblockedUsersCount = 0;
  let clearedEntitiesCount = 0;

  // 1. Unblock all blocked users in 'users' collection
  try {
    const qBlockedUsers = query(collection(db, 'users'), where('isBlocked', '==', true));
    const userSnaps = await getDocs(qBlockedUsers);
    await Promise.all(
      userSnaps.docs.map(async (userDoc) => {
        try {
          await updateDoc(doc(db, 'users', userDoc.id), {
            isBlocked: false,
            unblockedAt: now,
            unblockedBy: unblockedBy || 'Admin',
            blockedReason: null,
            blockedAt: null,
            blockedBy: null,
          });
          unblockedUsersCount++;
        } catch (err) {
          console.warn('Error unblocking user', userDoc.id, err);
        }
      })
    );
  } catch (err) {
    console.warn('Error querying blocked users:', err);
  }

  // 2. Delete all docs in 'blocked_entities'
  try {
    const entitiesSnaps = await getDocs(collection(db, 'blocked_entities'));
    await Promise.all(
      entitiesSnaps.docs.map(async (entityDoc) => {
        try {
          await deleteDoc(doc(db, 'blocked_entities', entityDoc.id));
          clearedEntitiesCount++;
        } catch (err) {
          console.warn('Error deleting blocked entity', entityDoc.id, err);
        }
      })
    );
  } catch (err) {
    console.warn('Error clearing blocked entities:', err);
  }

  // 3. Clear local device/fingerprint cache
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('ue_fp_hash');
    }
  } catch {}

  return { unblockedUsersCount, clearedEntitiesCount };
};

/**
 * Real-time listener for blocked entities.
 * Returns unsubscribe function.
 */
export const subscribeToBlockedEntities = (
  onUpdate: (blockedList: BlockedEntity[]) => void
) => {
  const q = collection(db, 'blocked_entities');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: BlockedEntity[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as BlockedEntity);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Blocked entities listener notice:', err);
    }
  );
};

/**
 * Comprehensive async check to verify whether current visitor (or a specific user/device) is blocked.
 * Checks Firestore 'blocked_entities' for:
 * 1. Specific User ID (if provided or logged in)
 * 2. Device ID
 * 3. Hardware / Browser Canvas Fingerprint
 * 4. Client Public IP
 * 5. Phone number (if provided)
 */
export const isVisitorBlocked = async (
  targetUid?: string,
  extraIdentifiers?: {
    phone?: string;
    ip?: string;
    deviceId?: string;
    fingerprint?: string;
  }
): Promise<{
  isBlocked: boolean;
  reason?: string;
  ipAddress?: string;
  deviceId?: string;
  matchedEntity?: BlockedEntity;
}> => {
  try {
    // Admin is never blocked
    if (targetUid === 'admin_root') {
      return { isBlocked: false };
    }

    const deviceId = extraIdentifiers?.deviceId || getDeviceId();
    const fingerprint = extraIdentifiers?.fingerprint || (await getClientFingerprint());
    const ip = extraIdentifiers?.ip || (await getClientIp());
    const cleanPhone = cleanPhoneVal(extraIdentifiers?.phone || '');

    // Global Unblock check: if admin turned on Unblock All Users
    try {
      const configSnap = await getDoc(doc(db, 'settings', 'systemConfig'));
      if (configSnap.exists()) {
        const cfg = configSnap.data();
        if (cfg.unblockAllUsers === true) {
          return { isBlocked: false, ipAddress: ip, deviceId };
        }
      }
    } catch (err) {
      console.warn('Global unblock check notice:', err);
    }

    // List of candidate blocked_entities document IDs
    const candidateDocIds: string[] = [];
    if (targetUid) {
      candidateDocIds.push(`uid_${sanitizeKey(targetUid)}`);
    }
    if (deviceId) {
      candidateDocIds.push(`dev_${sanitizeKey(deviceId)}`);
    }
    if (fingerprint) {
      candidateDocIds.push(`fp_${sanitizeKey(fingerprint)}`);
    }
    if (ip && ip !== 'unknown_ip') {
      candidateDocIds.push(`ip_${sanitizeKey(ip)}`);
    }
    if (cleanPhone) {
      candidateDocIds.push(`phone_${cleanPhone}`);
    }

    // Direct doc lookups (instant and indexed)
    for (const docId of candidateDocIds) {
      try {
        const snap = await getDoc(doc(db, 'blocked_entities', docId));
        if (snap.exists()) {
          const data = snap.data() as BlockedEntity;
          return {
            isBlocked: true,
            reason: data.reason || 'Security & policy violation',
            ipAddress: ip,
            deviceId,
            matchedEntity: data,
          };
        }
      } catch {}
    }

    // Check if targetUid in users collection is marked as isBlocked
    if (targetUid) {
      try {
        const userSnap = await getDoc(doc(db, 'users', targetUid));
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          if (userData.isBlocked) {
            return {
              isBlocked: true,
              reason: userData.blockedReason || 'Account suspended',
              ipAddress: ip,
              deviceId,
            };
          }
        }
      } catch {}
    }

    // Query blocked_entities where value matches IP or fingerprint or deviceId
    if (ip && ip !== 'unknown_ip') {
      try {
        const ipQuery = query(
          collection(db, 'blocked_entities'),
          where('value', '==', ip),
          limit(1)
        );
        const ipSnaps = await getDocs(ipQuery);
        if (!ipSnaps.empty) {
          const data = ipSnaps.docs[0].data() as BlockedEntity;
          return {
            isBlocked: true,
            reason: data.reason || 'IP address blocked',
            ipAddress: ip,
            deviceId,
            matchedEntity: data,
          };
        }
      } catch {}
    }

    if (deviceId) {
      try {
        const devQuery = query(
          collection(db, 'blocked_entities'),
          where('value', '==', deviceId),
          limit(1)
        );
        const devSnaps = await getDocs(devQuery);
        if (!devSnaps.empty) {
          const data = devSnaps.docs[0].data() as BlockedEntity;
          return {
            isBlocked: true,
            reason: data.reason || 'Device blocked',
            ipAddress: ip,
            deviceId,
            matchedEntity: data,
          };
        }
      } catch {}
    }

    return { isBlocked: false, ipAddress: ip, deviceId };
  } catch (err) {
    console.warn('isVisitorBlocked check notice:', err);
    return { isBlocked: false };
  }
};

/**
 * Synchronous check helper against an in-memory array of blocked entities.
 */
export const checkIsVisitorBlockedSync = (
  identifiers: {
    uid?: string;
    phone?: string;
    ip?: string;
    deviceId?: string;
    fingerprint?: string;
  },
  blockedEntities: BlockedEntity[]
): { isBlocked: boolean; matchedEntity?: BlockedEntity } => {
  if (identifiers.uid === 'admin_root') {
    return { isBlocked: false };
  }

  if (!blockedEntities || blockedEntities.length === 0) {
    return { isBlocked: false };
  }

  const cleanPhone = cleanPhoneVal(identifiers.phone || '');

  for (const item of blockedEntities) {
    if (identifiers.uid && (item.userId === identifiers.uid || item.value === identifiers.uid)) {
      return { isBlocked: true, matchedEntity: item };
    }

    if (identifiers.deviceId && item.type === 'device' && item.value === identifiers.deviceId) {
      return { isBlocked: true, matchedEntity: item };
    }

    if (identifiers.ip && item.type === 'ip' && item.value === identifiers.ip) {
      return { isBlocked: true, matchedEntity: item };
    }

    if (identifiers.fingerprint && item.type === 'fingerprint' && item.value === identifiers.fingerprint) {
      return { isBlocked: true, matchedEntity: item };
    }

    if (cleanPhone && item.type === 'phone' && item.value === cleanPhone) {
      return { isBlocked: true, matchedEntity: item };
    }
  }

  return { isBlocked: false };
};
