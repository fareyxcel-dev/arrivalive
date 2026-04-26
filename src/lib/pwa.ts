// PWA helpers: install eligibility, install prompt handling, permission flow.
// IMPORTANT: never registers a SW in iframes/preview hosts (Lovable preview safeguard).

let deferredPrompt: any = null;

export const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const isPreviewHost = (): boolean => {
  const h = window.location.hostname;
  return h.includes('id-preview--') || h.includes('lovableproject.com');
};

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS
  // @ts-ignore
  if ((window.navigator as any).standalone === true) return true;
  return false;
};

export const isIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent);

export const installEligible = (): boolean => {
  if (isStandalone()) return false;
  if (isInIframe() || isPreviewHost()) return false;
  // Android: deferredPrompt must exist; iOS: rely on tutorial
  return !!deferredPrompt || isIOS();
};

export const captureInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
};

export const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
  if (!deferredPrompt) return 'unavailable';
  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'unavailable';
  }
};

export const registerVersionedSW = async () => {
  if (!('serviceWorker' in navigator)) return;
  if (isInIframe() || isPreviewHost()) {
    // Clean up any leftover SWs in preview to avoid stale caches
    const regs = await navigator.serviceWorker.getRegistrations();
    regs.forEach((r) => r.unregister());
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    await reg.update();
    // If a new SW is waiting, tell it to skip waiting and reload
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          sw.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    });
  } catch (e) {
    console.warn('SW registration failed:', e);
  }
};

export const requestPermissionsAfterInstall = async () => {
  if (isInIframe() || isPreviewHost()) return;
  // Run sequentially so the OS shows them one by one
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {}
  try {
    // @ts-ignore
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {}
};
