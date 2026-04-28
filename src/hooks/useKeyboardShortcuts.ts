import { useEffect } from 'react';

interface ShortcutHandlers {
  onForceRefresh?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
}

/**
 * Global keyboard shortcuts.
 * - Cmd/Ctrl + R → Force refresh flights (overrides browser reload)
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
    const handler = (e: KeyboardEvent) => {
      // Skip when typing
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === 'r' && onForceRefresh) {
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
