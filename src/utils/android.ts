import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// Check if app is running as native Android APK
export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

// Check if running inside any native Capacitor container
export const isCapacitorApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Initialize Android Native App Environment
export const initAndroidApp = async (): Promise<void> => {
  if (!isCapacitorApp()) return;

  try {
    // Configure Status Bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#070b0e' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('Capacitor status bar setup warning:', err);
  }

  try {
    // Hide splash screen after initialization
    setTimeout(async () => {
      try {
        await SplashScreen.hide();
      } catch {}
    }, 600);
  } catch (err) {
    console.warn('Capacitor splash screen hide warning:', err);
  }
};

// Open URL in external default browser (e.g. Chrome)
// Requirement: Referral URLs and external links opened from APK must launch in the system browser
export const openExternalWebUrl = async (url: string): Promise<void> => {
  if (!url) return;

  if (isCapacitorApp()) {
    try {
      await Browser.open({
        url,
        windowName: '_system',
        presentationStyle: 'popover',
      });
      return;
    } catch (err) {
      console.warn('Browser.open fallback to window.open:', err);
    }
  }

  // Fallback for web or if plugin errors
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// Default fallback live website domain for referral links
let configuredWebsiteUrl: string = 'https://unityearninglive.vercel.app';

export const setConfiguredWebsiteUrl = (url: string): void => {
  if (url && url.trim().length > 0) {
    let clean = url.trim();
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    configuredWebsiteUrl = clean;
    try {
      localStorage.setItem('ue_configured_website_url', clean);
    } catch {}
  }
};

export const getConfiguredWebsiteUrl = (): string => {
  try {
    const cached = localStorage.getItem('ue_configured_website_url');
    if (cached && cached.startsWith('http')) {
      return cached;
    }
  } catch {}
  return configuredWebsiteUrl;
};

// Resolve the correct website base URL for Counselor Referral Links
export const getWebsiteBaseUrl = (): string => {
  // If running in Capacitor Android APK, window.location.origin is capacitor:// or localhost
  // Always return the real web domain so referral links are authentic web links
  if (isCapacitorApp()) {
    return getConfiguredWebsiteUrl();
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // If running in local dev or preview container that isn't localhost/capacitor, use current origin
    if (!origin.includes('capacitor://') && !origin.includes('http://localhost')) {
      return origin;
    }
  }

  return getConfiguredWebsiteUrl();
};

// Android hardware back button handler
export const registerAndroidBackButton = (onBack: () => boolean): (() => void) => {
  if (!isCapacitorApp()) return () => {};

  let listenerPromise = CapApp.addListener('backButton', (data) => {
    // If callback returns true, it handled the back action (e.g. closed modal/chat)
    // If it returns false and canGoBack is false, we let the app minimize or exit
    const handled = onBack();
    if (!handled && !data.canGoBack) {
      CapApp.minimizeApp();
    }
  });

  return () => {
    listenerPromise.then((handle) => handle.remove()).catch(() => {});
  };
};
