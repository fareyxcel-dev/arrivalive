import { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Type, Sparkles, Bell, Shield, Camera, Loader2, Check, FileArchive, Bug, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { GLASS_PRESETS } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Slider } from './ui/slider';
import { ScrollArea } from './ui/scroll-area';
import JSZip from 'jszip';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'texts' | 'style' | 'notifications' | 'security' | 'report' | 'admin';

const ADMIN_EMAILS = ['fareyxcel@gmail.com', 'arrivamv@gmail.com', 'arrivalive@gmail.com'];

const MODAL_STYLE = {
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(20px) saturate(1.2)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

// Mini slider with reset button
const MiniSlider = ({ label, value, defaultValue, min, max, step, onChange, onReset, suffix = '' }: {
  label: string; value: number; defaultValue: number; min: number; max: number; step: number;
  onChange: (val: number) => void; onReset: () => void; suffix?: string;
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{label}: {value}{suffix}</label>
      {value !== defaultValue && (
        <button onClick={onReset} className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0" title="Reset to default">
          <RotateCcw className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="w-full" />
  </div>
);

const SettingsModal = ({ isOpen, onClose }: Props) => {
  const { 
    settings, availableFonts, setFontFamily, setFontSize, setTextCase,
    setBlurLevel, setGlassOpacity, setIframeBrightness,
    setSaturation, setContrast, setShadows, setHighlights, setHueShift,
    setGlassPreset, setBoldText, setColorShift, setDualGlass, setDualGlassStyle1,
    setDualGlassStyle2, setNotification, updateProfile, updatePassword, deleteAccount,
    resetSetting,
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [displayTitle, setDisplayTitle] = useState('Settings');
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visibleFonts, setVisibleFonts] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fontScrollRef = useRef<HTMLDivElement>(null);
  const fontObserverRef = useRef<IntersectionObserver | null>(null);

  // Report tab state
  const [reportType, setReportType] = useState<string>('Bug');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [weatherIncorrect, setWeatherIncorrect] = useState(false);
  const [correctedCondition, setCorrectedCondition] = useState('');
  const [correctedTemp, setCorrectedTemp] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Dynamic title
  useEffect(() => {
    const tabTitles: Record<Tab, string> = {
      profile: 'Profile Settings', texts: 'Text Settings', style: 'Style Settings',
      notifications: 'Notification Settings', security: 'Security Settings', 
      report: 'Report Issue', admin: 'Admin Settings',
    };
    setDisplayTitle(tabTitles[activeTab]);
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => setDisplayTitle('Settings'), 11000);
    return () => { if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current); };
  }, [activeTab]);

  // Check admin email
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && ADMIN_EMAILS.includes(user.email)) setIsAdmin(true);
    };
    if (isOpen) checkAdmin();
  }, [isOpen]);

  // Auto-scroll to selected font
  useEffect(() => {
    if (activeTab !== 'texts' || !isOpen) return;
    const timer = setTimeout(() => {
      const selectedEl = document.querySelector(`[data-font="${settings.fontFamily}"]`);
      if (selectedEl) selectedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, isOpen, settings.fontFamily]);

  // IntersectionObserver for lazy font loading
  const setupFontObserver = useCallback((node: HTMLDivElement | null) => {
    if (fontObserverRef.current) fontObserverRef.current.disconnect();
    if (!node) return;
    fontObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const fontName = (entry.target as HTMLElement).dataset.font;
            if (fontName && !visibleFonts.has(fontName)) {
              const linkId = `lazy-font-${fontName.replace(/\s+/g, '-')}`;
              if (!document.getElementById(linkId)) {
                const link = document.createElement('link');
                link.id = linkId; link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
                document.head.appendChild(link);
              }
              setVisibleFonts(prev => new Set(prev).add(fontName));
            }
          }
        });
      },
      { root: node, rootMargin: '100px', threshold: 0 }
    );
    const items = node.querySelectorAll('[data-font]');
    items.forEach(item => fontObserverRef.current?.observe(item));
  }, [visibleFonts]);

  useEffect(() => {
    if (activeTab !== 'texts') return;
    const timer = setTimeout(() => {
      const scrollContainer = fontScrollRef.current;
      if (scrollContainer) setupFontObserver(scrollContainer);
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab, setupFontObserver]);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('display_name, phone').eq('user_id', user.id).single();
        if (data) { setUsername(data.display_name || ''); setPhone(data.phone || ''); }
        setProfileLoaded(true);
      }
    };
    if (isOpen) loadProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'texts', label: 'Texts', icon: Type },
    { id: 'style', label: 'Style', icon: Sparkles },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'report', label: 'Report', icon: Bug },
    ...(isAdmin ? [{ id: 'admin' as Tab, label: 'Admin', icon: Shield }] : []),
  ];

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try { await updateProfile({ display_name: username, phone }); toast.success('Profile updated'); }
    catch { toast.error('Failed to update profile'); }
    finally { setIsLoading(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try { await updatePassword(newPassword); toast.success('Password updated'); setNewPassword(''); setConfirmPassword(''); }
    catch { toast.error('Failed to update password'); }
    finally { setIsLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    setIsLoading(true);
    try { await deleteAccount(); toast.success('Account deleted'); onClose(); }
    catch { toast.error('Failed to delete account'); }
    finally { setIsLoading(false); }
  };

  const handleSubmitReport = async () => {
    if (!reportTitle.trim()) { toast.error('Please enter a title'); return; }
    setIsSubmittingReport(true);
    try {
      let description = reportDescription;
      if (reportType === 'Weather Issue' && weatherIncorrect) {
        description = JSON.stringify({
          originalReport: reportDescription,
          correctedCondition,
          correctedTemp,
        });
      }
      const { error } = await supabase.from('admin_reports').insert({
        report_type: reportType === 'Weather Issue' && weatherIncorrect ? 'weather_correction' : reportType.toLowerCase().replace(/ /g, '_'),
        title: reportTitle,
        description,
      });
      if (error) throw error;
      toast.success('Report submitted. Thank you!');
      setReportTitle(''); setReportDescription(''); setWeatherIncorrect(false);
      setCorrectedCondition(''); setCorrectedTemp('');
    } catch { toast.error('Failed to submit report'); }
    finally { setIsSubmittingReport(false); }
  };

  const handleAdminExport = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      zip.file('REMIX_PROMPT.md', `# Arriva.MV Remix Prompt\n\nRecreate a real-time flight arrival tracker PWA for Velana International Airport (MLE), Maldives.\n\n## Core Features\n- Real-time flight scraping from FIDS\n- Weather-reactive animated background (iframe)\n- Live flight tracking via FlightAware AeroAPI\n- Push notifications via OneSignal\n- Multi-terminal grouping (T1, T2, Domestic)\n- Glassmorphism UI with 12 glass presets\n- 200+ Google Font customization\n- CSV export functionality\n- Admin dashboard for reports and fonts\n\n## Tech Stack\n- React 18 + Vite + TypeScript\n- Tailwind CSS + Shadcn/UI\n- Supabase (Database, Auth, Edge Functions)\n- OneSignal (Push notifications)\n- FlightAware AeroAPI (Flight tracking)\n- PWA with Service Worker\n`);
      zip.file('docs/README.md', 'Full project blueprint - see source files for implementation details.');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `arriva-blueprint-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Blueprint exported');
    } catch { toast.error('Export failed'); }
    finally { setIsExporting(false); }
  };

  const glassPresetEntries = Object.entries(GLASS_PRESETS);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.3)' }}
    >
      <div
        className="rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in glass-neumorphic"
        onClick={e => e.stopPropagation()}
        style={{ ...MODAL_STYLE, fontFamily: settings.fontFamily }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-foreground transition-all duration-500 adaptive-shadow">
            {displayTitle}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors glass-orb">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-3 text-xs transition-colors min-w-0",
                activeTab === tab.id ? "text-foreground border-b-2 border-foreground/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full glass-orb flex items-center justify-center relative">
                  <User className="w-8 h-8 text-muted-foreground" />
                  <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full glass-orb flex items-center justify-center">
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
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your name"
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none" />
              </div>
              <button onClick={handleSaveProfile} disabled={isLoading}
                className="w-full py-2 rounded-lg glass-interactive flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Profile
              </button>
              <div className="glass-neumorphic rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Time spent on Arriva.MV</p>
                <p className="font-display text-2xl font-bold text-foreground mt-1">{profileLoaded ? '0 days' : '...'}</p>
              </div>
            </div>
          )}

          {activeTab === 'texts' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Bold Text</label>
                <LiveBlurToggle checked={settings.boldText} onChange={setBoldText} />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Font Family</label>
                <ScrollArea className="h-48 rounded-lg border border-white/10 bg-white/5">
                  <div className="p-2 space-y-1" ref={fontScrollRef}>
                    {availableFonts.map((font) => {
                      const isSelected = font === settings.fontFamily;
                      return (
                        <button key={font} data-font={font} onClick={() => setFontFamily(font)}
                          className={cn("w-full px-3 py-2 text-left rounded-md transition-all flex items-center gap-2",
                            isSelected ? "bg-white/20 text-foreground" : "hover:bg-white/10 text-foreground/70")}
                          style={{ fontFamily: visibleFonts.has(font) ? `'${font}', sans-serif` : 'inherit', fontWeight: settings.boldText ? 700 : 400 }}>
                          {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                          <span className="truncate">{font}</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Font Size: {settings.fontSize}px</label>
                <Slider value={[settings.fontSize]} onValueChange={([val]) => setFontSize(val)} min={12} max={24} step={1} className="w-full" />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Text Case</label>
                <div className="flex gap-2 mt-2">
                  {(['default', 'uppercase', 'lowercase'] as const).map(option => (
                    <button key={option} onClick={() => setTextCase(option)}
                      className={cn("flex-1 py-2 rounded-lg text-sm transition-colors", settings.textCase === option ? "active-selection" : "glass hover:bg-white/10")}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                  Color Shift: {settings.colorShift > 0 ? '+' : ''}{settings.colorShift}
                </label>
                <Slider value={[settings.colorShift]} onValueChange={([val]) => setColorShift(val)} min={-100} max={100} step={5} className="w-full" />
                <p className="text-[10px] text-muted-foreground mt-1">Shifts text brightness darker or lighter</p>
              </div>
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-5 animate-fade-in">
              {/* Mini Sliders Grid - 2 per row on wider screens */}
              <div className="grid grid-cols-2 gap-3">
                <MiniSlider label="Brightness" value={settings.iframeBrightness} defaultValue={100} min={0} max={200} step={5} onChange={setIframeBrightness} onReset={() => resetSetting('iframeBrightness')} suffix="%" />
                <MiniSlider label="Contrast" value={settings.contrast} defaultValue={100} min={50} max={150} step={5} onChange={setContrast} onReset={() => resetSetting('contrast')} suffix="%" />
                <MiniSlider label="Saturation" value={settings.saturation} defaultValue={100} min={0} max={200} step={5} onChange={setSaturation} onReset={() => resetSetting('saturation')} suffix="%" />
                <MiniSlider label="Shadows" value={settings.shadows} defaultValue={50} min={0} max={100} step={5} onChange={setShadows} onReset={() => resetSetting('shadows')} />
                <MiniSlider label="Highlights" value={settings.highlights} defaultValue={50} min={0} max={100} step={5} onChange={setHighlights} onReset={() => resetSetting('highlights')} />
                <MiniSlider label="Hue Shift" value={settings.hueShift} defaultValue={0} min={0} max={360} step={10} onChange={setHueShift} onReset={() => resetSetting('hueShift')} suffix="°" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Glass Blur: {settings.blurLevel}px</label>
                <Slider value={[settings.blurLevel]} onValueChange={([val]) => setBlurLevel(val)} min={0} max={40} step={2} className="w-full" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Glass Opacity: {Math.round(settings.glassOpacity * 100)}%</label>
                <Slider value={[settings.glassOpacity * 100]} onValueChange={([val]) => setGlassOpacity(val / 100)} min={0} max={50} step={5} className="w-full" />
              </div>

              {/* Dual Glass Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Dual Glass Blend</label>
                  <LiveBlurToggle checked={settings.dualGlass} onChange={setDualGlass} />
                </div>
                {settings.dualGlass && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground mb-1 block">Style 1</label>
                      <select value={settings.dualGlassStyle1} onChange={e => setDualGlassStyle1(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg glass bg-transparent border-0 text-xs">
                        {glassPresetEntries.map(([id, p]) => (
                          <option key={id} value={id} className="bg-popover">{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground mb-1 block">Style 2</label>
                      <select value={settings.dualGlassStyle2} onChange={e => setDualGlassStyle2(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg glass bg-transparent border-0 text-xs">
                        {glassPresetEntries.map(([id, p]) => (
                          <option key={id} value={id} className="bg-popover">{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Glass Presets */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Glass Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  {glassPresetEntries.map(([id, preset]) => (
                    <button key={id} onClick={() => setGlassPreset(id)}
                      className={cn("relative p-2 rounded-lg text-left transition-all border overflow-hidden glass-neumorphic",
                        settings.glassPreset === id ? "border-white/40" : "border-white/10 hover:border-white/20")}
                      style={{
                        background: `rgba(255, 255, 255, ${preset.opacity})`,
                        backdropFilter: `blur(${preset.blur}px)`,
                        WebkitBackdropFilter: `blur(${preset.blur}px)`,
                      }}>
                      <span className="text-[10px] font-medium text-foreground block relative z-10">{preset.label}</span>
                      <span className="text-[7px] text-muted-foreground leading-tight relative z-10">{preset.blur}px / {Math.round(preset.opacity * 100)}%</span>
                    </button>
                  ))}
                </div>
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
                <button key={item.key} onClick={() => setNotification(item.key, !settings.notifications[item.key])}
                  className={cn("w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                    settings.notifications[item.key] ? "active-selection" : "glass hover:bg-white/10")}>
                  <span>{item.label}</span>
                  <LiveBlurToggle checked={settings.notifications[item.key]} onChange={() => setNotification(item.key, !settings.notifications[item.key])} />
                </button>
              ))}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+960 XXXXXXX"
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none" />
              </div>
              <button onClick={handleSaveProfile} disabled={isLoading}
                className="w-full py-2 rounded-lg glass-interactive flex items-center justify-center gap-2 text-sm">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Phone
              </button>
              <div className="pt-4 border-t border-white/10">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Change Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password"
                  className="w-full mt-2 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password"
                  className="w-full mt-2 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none" />
                <button onClick={handleChangePassword} disabled={isLoading || !newPassword || !confirmPassword}
                  className="w-full mt-2 py-2 rounded-lg glass-interactive flex items-center justify-center gap-2 text-sm">
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </div>
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button onClick={handleDeleteAccount} disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-colors text-left px-4 text-destructive border border-destructive/30 flex items-center gap-2">
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Report Type</label>
                <div className="flex gap-2">
                  {['Bug', 'Weather Issue', 'Feature Request'].map(type => (
                    <button key={type} onClick={() => setReportType(type)}
                      className={cn("flex-1 py-2 rounded-lg text-xs transition-colors",
                        reportType === type ? "active-selection" : "glass hover:bg-white/10")}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {reportType === 'Weather Issue' && (
                <div className="space-y-3 glass-neumorphic rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Weather text is incorrect</label>
                    <LiveBlurToggle checked={weatherIncorrect} onChange={setWeatherIncorrect} />
                  </div>
                  {weatherIncorrect && (
                    <div className="space-y-2">
                      <input type="text" value={correctedCondition} onChange={e => setCorrectedCondition(e.target.value)}
                        placeholder="Correct condition (e.g., Rain)"
                        className="w-full px-3 py-1.5 rounded-lg glass bg-transparent border-0 text-sm outline-none" />
                      <input type="text" value={correctedTemp} onChange={e => setCorrectedTemp(e.target.value)}
                        placeholder="Correct temperature (e.g., 28)"
                        className="w-full px-3 py-1.5 rounded-lg glass bg-transparent border-0 text-sm outline-none" />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Title</label>
                <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="Brief description"
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Details</label>
                <textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)} placeholder="Describe the issue..."
                  rows={3}
                  className="w-full mt-1 px-4 py-2 rounded-lg glass bg-transparent border-0 focus:ring-1 focus:ring-foreground/50 outline-none resize-none" />
              </div>
              <button onClick={handleSubmitReport} disabled={isSubmittingReport || !reportTitle.trim()}
                className="w-full py-2 rounded-lg glass-interactive flex items-center justify-center gap-2">
                {isSubmittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
                Submit Report
              </button>
            </div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm text-muted-foreground">
                Download a complete blueprint ZIP to recreate or remix this app.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>✓ All TSX/TS component files</div>
                <div>✓ Edge functions & API configs</div>
                <div>✓ Database schema & migrations</div>
                <div>✓ CSS design tokens</div>
                <div>✓ Remix prompt (REMIX_PROMPT.md)</div>
              </div>
              <button onClick={handleAdminExport} disabled={isExporting}
                className="w-full py-3 rounded-lg glass-interactive flex items-center justify-center gap-2">
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileArchive className="w-5 h-5" />}
                {isExporting ? 'Exporting...' : 'Download Blueprint ZIP'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Live blur toggle
const LiveBlurToggle = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    className={cn("relative w-10 h-6 rounded-full transition-all duration-300 border flex-shrink-0",
      checked ? "border-white/30" : "border-white/15")}
    style={{
      background: checked ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
      backdropFilter: `blur(${checked ? 12 : 6}px) brightness(${checked ? 1.3 : 0.7})`,
      WebkitBackdropFilter: `blur(${checked ? 12 : 6}px) brightness(${checked ? 1.3 : 0.7})`,
    }}
  >
    <div 
      className={cn("absolute top-0.5 rounded-full transition-all duration-300",
        checked ? "translate-x-[18px]" : "translate-x-[2px]")}
      style={{
        width: '20px', height: '20px',
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(8px) brightness(1.5)',
        WebkitBackdropFilter: 'blur(8px) brightness(1.5)',
        boxShadow: '0 0 6px rgba(255,255,255,0.08), inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 4px rgba(0,0,0,0.3)',
      }}
    />
  </button>
);

export default SettingsModal;
