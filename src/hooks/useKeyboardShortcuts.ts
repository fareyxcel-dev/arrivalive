import { useEffect } from 'react';

interface ShortcutHandlers {
  onForceRefresh?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
}

/**
 * Detect Safari (desktop or iOS). Safari does NOT reliably let pages prevent
 * Cmd+R; calling preventDefault() can either be a no-op or, on some macOS
 * Safari versions, conflict with the browser's hard-reload behaviour and lead
 * to inconsistent UX. On Safari we therefore skip binding Cmd/Ctrl+R and let
 * the browser reload normally. Other browsers (Chrome, Firefox, Edge, Brave,
 * Arc, Opera) handle preventDefault() on Cmd/Ctrl+R cleanly.
 */
const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // Safari UA contains "Safari" but NOT "Chrome"/"Chromium"/"Android"/"CriOS"/"FxiOS"/"EdgiOS"
  const isAppleSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|Android|CriOS|FxiOS|EdgiOS|OPR\//.test(ua);
  return isAppleSafari;
};

/**
 * Global keyboard shortcuts.
 * - Cmd/Ctrl + R → Force refresh flights (skipped on Safari to avoid
 *   conflicting with the browser reload — Safari users still get a fresh
 *   pull on the native reload).
 * - Cmd/Ctrl + E → Open Export modal
 * - Cmd/Ctrl + , → Open Settings modal
 *
 * Ignored when typing in form fields / contenteditable.
 */
export const useKeyboardShortcuts = ({
  onForceRefresh,
  onExport,
  onOpenSettings,
}: ShortcutHandlers) => {
  useEffect(() => {
    const safari = isSafari();

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
          return;
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Skip when other modifiers (Shift/Alt) are held — those map to other
      // browser commands (Cmd+Shift+R = hard reload, etc.) we shouldn't hijack.
      if (e.shiftKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'r' && onForceRefresh) {
        if (safari) return; // Browser handles native reload; do not hijack.
        e.preventDefault();
        onForceRefresh();
        return;
      }
      if (key === 'e' && onExport) {
        e.preventDefault();
        onExport();
        return;
      }
      if (key === ',' && onOpenSettings) {
        e.preventDefault();
        onOpenSettings();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onForceRefresh, onExport, onOpenSettings]);
};
