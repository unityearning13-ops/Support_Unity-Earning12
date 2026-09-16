// Utility for device identification and single-device registration binding
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('ue_device_id');
  if (!deviceId) {
    deviceId =
      'dev_' +
      Math.random().toString(36).substring(2, 10) +
      '_' +
      Date.now().toString(36);
    localStorage.setItem('ue_device_id', deviceId);
  }
  return deviceId;
};

export const getStoredUserId = (): string | null => {
  try {
    return localStorage.getItem('ue_current_user_id');
  } catch {
    return null;
  }
};

export const setStoredUserId = (uid: string): void => {
  try {
    localStorage.setItem('ue_current_user_id', uid);
  } catch {
    // LocalStorage write fail-safe
  }
};

export const removeStoredUserId = (): void => {
  try {
    localStorage.removeItem('ue_current_user_id');
    localStorage.removeItem('ue_current_user_profile');
  } catch {
    // LocalStorage delete fail-safe
  }
};

export const getStoredUserProfile = <T = unknown>(): T | null => {
  try {
    const raw = localStorage.getItem('ue_current_user_profile');
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const setStoredUserProfile = (profile: unknown): void => {
  try {
    localStorage.setItem('ue_current_user_profile', JSON.stringify(profile));
  } catch {
    // LocalStorage write fail-safe
  }
};

export const getStoredAdminToken = (): string | null => {
  try {
    return (
      localStorage.getItem('unity_admin_token') ||
      sessionStorage.getItem('unity_admin_token') ||
      localStorage.getItem('adminToken') ||
      null
    );
  } catch {
    return null;
  }
};

export const setStoredAdminToken = (token: string): void => {
  try {
    localStorage.setItem('unity_admin_token', token);
    localStorage.setItem('adminToken', token);
    sessionStorage.setItem('unity_admin_token', token);
  } catch {
    // LocalStorage write fail-safe
  }
};

export const clearStoredAdminToken = (): void => {
  try {
    localStorage.removeItem('unity_admin_token');
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('unity_admin_token');
    sessionStorage.removeItem('adminToken');
  } catch {
    // LocalStorage delete fail-safe
  }
};
