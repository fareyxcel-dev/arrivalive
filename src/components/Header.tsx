import { useState } from 'react';
import { Plus, X, RefreshCw, Download, Settings, LogIn, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import headerLogo from '@/assets/header-logo.png';

interface Props {
  onForceRefresh: () => void;
  onExportSchedule: () => void;
  onOpenSettings: () => void;
  isLoggedIn: boolean;
  onAuthAction: () => void;
  onInstallPWA: () => void;
}

const Header = ({
  onForceRefresh,
  onExportSchedule,
  onOpenSettings,
  isLoggedIn,
  onAuthAction,
  onInstallPWA,
}: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { icon: RefreshCw, label: 'Force Refresh', action: onForceRefresh },
    { icon: Download, label: 'Export Schedule', action: onExportSchedule },
    { icon: Settings, label: 'Settings', action: onOpenSettings },
    { icon: isLoggedIn ? LogOut : LogIn, label: isLoggedIn ? 'Logout' : 'Login', action: onAuthAction },
  ];

  return (
    <header className="relative z-50 w-full">
      <div className="flex items-center justify-between px-4 py-4">
        {/* Logo - clickable for PWA install */}
        <button
          onClick={onInstallPWA}
          className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
        >
          <img
            src={headerLogo}
            alt="ARRIVA.MV"
            className="h-10 w-auto"
          />
        </button>

        {/* Orb Menu Button */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "orb-button",
              isMenuOpen && "bg-white/20"
            )}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <div
              className={cn(
                "transition-transform duration-300",
                isMenuOpen ? "rotate-45" : "rotate-0"
              )}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Plus className="w-5 h-5 text-foreground" />
              )}
            </div>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-14 w-48 glass-strong rounded-xl overflow-hidden animate-scale-in">
              {menuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action();
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground transition-colors",
                    "hover:bg-white/10",
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