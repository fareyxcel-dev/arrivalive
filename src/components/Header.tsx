import { useState, useEffect } from 'react';
import { Plus, X, RefreshCw, Download, Settings, LogIn, LogOut, FileText, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import headerLogo from '@/assets/header-logo.png';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onForceRefresh: () => void;
  onExportSchedule: () => void;
  onOpenSettings: () => void;
  isLoggedIn: boolean;
  onAuthAction: () => void;
  onInstallPWA: () => void;
  userEmail?: string;
  onAdminExport?: () => void;
  onOpenNotifications?: () => void;
  onOpenAdmin?: () => void;
}

const Header = ({
  onForceRefresh,
  onExportSchedule,
  onOpenSettings,
  isLoggedIn,
  onAuthAction,
  onInstallPWA,
  userEmail,
  onAdminExport,
  onOpenNotifications,
  onOpenAdmin,
}: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Check admin role on mount
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        setIsAdmin(!!data);
      }
    };
    checkAdmin();
  }, [isLoggedIn]);

  // Triple-click APK download for Android
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 2000) {
      setClickCount(prev => prev + 1);
    } else {
      setClickCount(1);
    }
    setLastClickTime(now);

    if (clickCount >= 2) {
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid) {
        // Trigger APK download (would need pre-built APK in storage)
        window.open('https://arriva.mv/arriva.apk', '_blank');
      }
      setClickCount(0);
    } else {
      onInstallPWA();
    }
  };

  const menuItems = [
    { icon: RefreshCw, label: 'Force Refresh', action: onForceRefresh },
    { icon: Download, label: 'Export Schedule', action: onExportSchedule },
    { icon: Bell, label: 'Notifications', action: onOpenNotifications },
    { icon: Settings, label: 'Settings', action: onOpenSettings },
    ...(isAdmin && onAdminExport ? [{ icon: FileText, label: 'Export Build Data', action: onAdminExport }] : []),
    ...(isAdmin && onOpenAdmin ? [{ icon: Shield, label: 'Admin Dashboard', action: onOpenAdmin }] : []),
    { icon: isLoggedIn ? LogOut : LogIn, label: isLoggedIn ? 'Logout' : 'Login', action: onAuthAction },
  ];

  return (
    <header className="relative z-50 w-full">
      <div className="flex flex-col items-center px-4 py-4">
        <button
          onClick={handleLogoClick}
          className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95 mb-2"
        >
          <img src={headerLogo} alt="ARRIVA.MV" className="h-16 w-auto" />
        </button>

        <div className="absolute right-4 top-4">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn("orb-button", isMenuOpen && "bg-white/20")}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <div className={cn("transition-transform duration-300", isMenuOpen ? "rotate-45" : "rotate-0")}>
              {isMenuOpen ? <X className="w-5 h-5 text-foreground" /> : <Plus className="w-5 h-5 text-foreground" />}
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-14 w-48 glass-blur-strong rounded-xl overflow-hidden animate-scale-in border border-white/10">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => { item.action?.(); setIsMenuOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors hover:bg-white/10",
                    index !== menuItems.length - 1 && "border-b border-white/5"
                  )}
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
