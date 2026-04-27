import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import {
  isStandalone,
  isInIframe,
  isPreviewHost,
  isIOS,
  triggerInstall,
  captureInstallPrompt,
} from '@/lib/pwa';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'arriva-install-dismissed-at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const InstallPrompt = () => {
  const [eligible, setEligible] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInIframe() || isPreviewHost()) return;
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) {
      setDismissed(true);
      return;
    }

    captureInstallPrompt();

    const onBIP = () => {
      setHasNativePrompt(true);
      setEligible(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // iOS path: no beforeinstallprompt — show tutorial CTA
    if (isIOS()) setEligible(true);

    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  if (!eligible || dismissed || isStandalone()) return null;

  const handleInstall = async () => {
    if (isIOS() && !hasNativePrompt) {
      setShowIOSHelp(true);
      return;
    }
    const outcome = await triggerInstall();
    if (outcome === 'accepted') setEligible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl p-3 animate-fade-in"
      style={{
        background: 'rgba(20, 20, 28, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      }}
    >
      {!showIOSHelp ? (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-white/10">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install ARRIVA.MV</p>
            <p className="text-[11px] text-white/70 leading-tight">
              {isIOS() && !hasNativePrompt
                ? 'Add to Home Screen for the full app feel.'
                : 'Quicker access, offline support, and live notifications.'}
            </p>
          </div>
          <button
            onClick={handleInstall}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
              "bg-white text-black hover:bg-white/90 transition-colors"
            )}
          >
            <Download className="w-3.5 h-3.5" /> Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Install on iPhone</p>
              <ol className="mt-1 text-[11px] text-white/80 space-y-0.5 list-decimal pl-4">
                <li>Tap the Share icon in Safari.</li>
                <li>Choose "Add to Home Screen".</li>
                <li>Tap "Add" in the top-right.</li>
              </ol>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70"
              aria-label="Close help"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallPrompt;
