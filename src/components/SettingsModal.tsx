import { useState, useEffect } from 'react';
import { X, User, Palette, Bell, Shield, Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    setNotification,
    updateProfile,
    updatePassword,
    deleteAccount,
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, phone')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUsername(data.display_name || '');
          setPhone(data.phone || '');
        }
        setProfileLoaded(true);
      }
    };
    
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ display_name: username, phone });
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    try {
      await updatePassword(newPassword);
      toast.success('Password updated');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await deleteAccount();
      toast.success('Account deleted');
      onClose();
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: settings.fontFamily }}
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
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center relative">
                  <User className="w-8 h-8 text-muted-foreground" />
                  <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full glass-interactive flex items-center justify-center">
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Profile Photo</p>
                  <p className="text-sm text-foreground">Coming soon</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Display Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="w-full py-2 rounded-lg glass-interactive flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Profile
              </button>
              <div className="glass rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Time spent on Arriva.MV</p>
                <p className="font-display text-2xl font-bold text-foreground mt-1">
                  {profileLoaded ? '0 days' : '...'}
                </p>
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
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+960 XXXXXXX"
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="w-full py-2 rounded-lg glass-interactive flex items-center justify-center gap-2 text-sm"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Phone
              </button>
              
              <div className="pt-4 border-t border-white/10">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Change Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full mt-2 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full mt-2 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="w-full mt-2 py-2 rounded-lg glass-interactive flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </div>
              
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-colors text-left px-4 text-destructive border border-destructive/30 flex items-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
