import { useState } from 'react';
import { X, User, Palette, Bell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'appearance' | 'notifications' | 'security';

const SettingsModal = ({ isOpen, onClose }: Props) => {
  const { 
    settings, 
    availableFonts, 
    setFontFamily, 
    setFontSize, 
    setTextCase,
    setNotification 
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
                activeTab === tab.id
                  ? "text-foreground border-b-2 border-foreground/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <button className="px-4 py-2 rounded-lg glass hover:bg-white/10 transition-colors text-sm">
                  Change Photo
                </button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Username</label>
                <input
                  type="text"
                  placeholder="Guest"
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                />
              </div>
              <div className="glass rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Time spent on Arriva.MV</p>
                <p className="font-display text-2xl font-bold text-foreground mt-1">0 days</p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Font Family</label>
                <select
                  value={settings.fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                  style={{ fontFamily: settings.fontFamily }}
                >
                  {availableFonts.map(font => (
                    <option key={font} value={font} className="bg-popover" style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Font Size: {settings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={settings.fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Text Case</label>
                <div className="flex gap-2 mt-2">
                  {(['default', 'uppercase', 'lowercase'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => setTextCase(option)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm transition-colors",
                        settings.textCase === option ? "active-selection" : "glass hover:bg-white/10"
                      )}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Time Format</label>
                <p className="text-xs text-muted-foreground mt-2">Click the clock to toggle 12/24 hour format</p>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-3 animate-fade-in">
              {[
                { key: 'sms' as const, label: 'SMS Notifications' },
                { key: 'email' as const, label: 'Email Notifications' },
                { key: 'push' as const, label: 'Push Notifications' },
                { key: 'repeat' as const, label: 'Repeat Notifications' },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setNotification(item.key, !settings.notifications[item.key])}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                    settings.notifications[item.key]
                      ? "active-selection"
                      : "glass hover:bg-white/10"
                  )}
                >
                  <span>{item.label}</span>
                  <div
                    className={cn(
                      "w-10 h-6 rounded-full transition-colors relative",
                      settings.notifications[item.key]
                        ? "toggle-on"
                        : "toggle-off"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                        settings.notifications[item.key]
                          ? "translate-x-5"
                          : "translate-x-1"
                      )}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+960 XXXXXXX"
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                />
              </div>
              <button className="w-full py-3 rounded-lg glass hover:bg-white/10 transition-colors text-left px-4">
                Change Password
              </button>
              <button className="w-full py-3 rounded-lg glass hover:bg-white/10 transition-colors text-left px-4 text-delayed">
                Deactivate Account
              </button>
              <button className="w-full py-3 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-colors text-left px-4 text-destructive border border-destructive/30">
                Delete Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
