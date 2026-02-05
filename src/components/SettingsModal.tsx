 import { useState, useEffect, useRef } from 'react';
 import { X, User, Type, Sparkles, Bell, Shield, Camera, Loader2, Check } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { useSettings } from '@/contexts/SettingsContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { Slider } from './ui/slider';
 import { ScrollArea } from './ui/scroll-area';
 import { Switch } from './ui/switch';
 
 interface Props {
   isOpen: boolean;
   onClose: () => void;
 }
 
 type Tab = 'profile' | 'texts' | 'style' | 'notifications' | 'security';
 
 // Glass UI Presets
 const GLASS_PRESETS = [
   { id: 'crystal-clear', name: 'Crystal Clear', description: 'Minimal blur, high transparency' },
   { id: 'frosted-glass', name: 'Frosted Glass', description: 'Medium blur, low opacity' },
   { id: 'dark-smoke', name: 'Dark Smoke', description: 'High blur, dark tint' },
   { id: 'ocean-mist', name: 'Ocean Mist', description: 'Blue-tinted glass' },
   { id: 'sunset-glow', name: 'Sunset Glow', description: 'Warm orange tint' },
   { id: 'midnight', name: 'Midnight', description: 'Very dark, subtle blur' },
   { id: 'arctic', name: 'Arctic', description: 'Bright, icy appearance' },
   { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon-accented glass' },
   { id: 'minimal', name: 'Minimal', description: 'Almost no blur, clean' },
   { id: 'classic', name: 'Classic', description: 'Balanced defaults' },
 ];
 
 const SettingsModal = ({ isOpen, onClose }: Props) => {
   const { 
     settings, 
     availableFonts, 
     setFontFamily, 
     setFontSize, 
     setTextCase,
     setBlurLevel,
     setGlassOpacity,
     setIframeBrightness,
     setMonochrome,
     setMonochromeIntensity,
     setGlassPreset,
     setBoldText,
     setColorShift,
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
   const [displayTitle, setDisplayTitle] = useState('Settings');
   const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
 
   // Dynamic title based on active tab
   useEffect(() => {
     const tabTitles: Record<Tab, string> = {
       profile: 'Profile Settings',
       texts: 'Text Settings',
       style: 'Style Settings',
       notifications: 'Notification Settings',
       security: 'Security Settings',
     };
     
     setDisplayTitle(tabTitles[activeTab]);
     
     if (titleTimeoutRef.current) {
       clearTimeout(titleTimeoutRef.current);
     }
     
     titleTimeoutRef.current = setTimeout(() => {
       setDisplayTitle('Settings');
     }, 11000);
     
     return () => {
       if (titleTimeoutRef.current) {
         clearTimeout(titleTimeoutRef.current);
       }
     };
   }, [activeTab]);
 
   // Load fonts for preview
   useEffect(() => {
     const loadFont = (fontName: string) => {
       const linkId = `settings-font-${fontName.replace(/\s+/g, '-')}`;
       if (document.getElementById(linkId)) return;
       
       const link = document.createElement('link');
       link.id = linkId;
       link.rel = 'stylesheet';
       link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
       document.head.appendChild(link);
       
       setLoadedFonts(prev => new Set(prev).add(fontName));
     };
     
     // Load first 30 fonts immediately
     availableFonts.slice(0, 30).forEach(loadFont);
   }, [availableFonts]);
 
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
     { id: 'texts', label: 'Texts', icon: Type },
     { id: 'style', label: 'Style', icon: Sparkles },
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
         className="glass-blur-strong rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in"
         onClick={e => e.stopPropagation()}
         style={{ fontFamily: settings.fontFamily }}
       >
         {/* Header */}
         <div className="flex items-center justify-between p-4 border-b border-white/10">
           <h2 className="font-display text-lg font-bold text-foreground transition-all duration-500">
             {displayTitle}
           </h2>
           <button
             onClick={onClose}
             className="p-2 rounded-full hover:bg-white/10 transition-colors"
           >
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
                 activeTab === tab.id
                   ? "text-foreground border-b-2 border-foreground/50"
                   : "text-muted-foreground hover:text-foreground"
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
 
           {activeTab === 'texts' && (
             <div className="space-y-5 animate-fade-in">
               {/* Bold Toggle */}
               <div className="flex items-center justify-between">
                 <label className="text-xs text-muted-foreground uppercase tracking-wide">Bold Text</label>
                 <Switch
                   checked={settings.boldText}
                   onCheckedChange={setBoldText}
                 />
               </div>
               
               {/* Extended Font Selection Area */}
               <div>
                 <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                   Font Family
                 </label>
                 <ScrollArea className="h-48 rounded-lg border border-white/10 bg-white/5">
                   <div className="p-2 space-y-1">
                     {availableFonts.map((font) => {
                       const isSelected = font === settings.fontFamily;
                       return (
                         <button
                           key={font}
                           onClick={() => {
                             setFontFamily(font);
                             const linkId = `settings-font-${font.replace(/\s+/g, '-')}`;
                             if (!document.getElementById(linkId)) {
                               const link = document.createElement('link');
                               link.id = linkId;
                               link.rel = 'stylesheet';
                               link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
                               document.head.appendChild(link);
                             }
                           }}
                           className={cn(
                             "w-full px-3 py-2 text-left rounded-md transition-all flex items-center gap-2",
                             isSelected
                               ? "bg-white/20 text-foreground"
                               : "hover:bg-white/10 text-foreground/70"
                           )}
                           style={{ 
                             fontFamily: loadedFonts.has(font) ? `'${font}', sans-serif` : 'inherit',
                             fontWeight: settings.boldText ? 700 : 400,
                           }}
                         >
                           {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                           <span className="truncate">{font}</span>
                         </button>
                       );
                     })}
                   </div>
                 </ScrollArea>
               </div>
 
               {/* Font Size */}
               <div>
                 <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                   Font Size: {settings.fontSize}px
                 </label>
                 <Slider
                   value={[settings.fontSize]}
                   onValueChange={([val]) => setFontSize(val)}
                   min={12}
                   max={24}
                   step={1}
                   className="w-full"
                 />
               </div>
               
               {/* Text Case */}
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
 
               {/* Color Shift */}
               <div>
                 <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                   Color Shift: {settings.colorShift > 0 ? '+' : ''}{settings.colorShift}
                 </label>
                 <Slider
                   value={[settings.colorShift]}
                   onValueChange={([val]) => setColorShift(val)}
                   min={-100}
                   max={100}
                   step={5}
                   className="w-full"
                 />
                 <p className="text-[10px] text-muted-foreground mt-1">
                   Shifts text brightness darker or lighter
                 </p>
               </div>
             </div>
           )}
 
           {activeTab === 'style' && (
             <div className="space-y-5 animate-fade-in">
               {/* Iframe Brightness */}
               <div>
                 <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                   Background Brightness: {settings.iframeBrightness}%
                 </label>
                 <Slider
                   value={[settings.iframeBrightness]}
                   onValueChange={([val]) => setIframeBrightness(val)}
                   min={0}
                   max={200}
                   step={5}
                   className="w-full"
                 />
               </div>
 
               {/* Glass Blur */}
               <div>
                 <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                   Glass Blur: {settings.blurLevel}px
                 </label>
                 <Slider
                   value={[settings.blurLevel]}
                   onValueChange={([val]) => setBlurLevel(val)}
                   min={0}
                   max={40}
                   step={2}
                   className="w-full"
                 />
               </div>
 
               {/* Glass Opacity */}
               <div>
                 <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                   Glass Opacity: {Math.round(settings.glassOpacity * 100)}%
                 </label>
                 <Slider
                   value={[settings.glassOpacity * 100]}
                   onValueChange={([val]) => setGlassOpacity(val / 100)}
                   min={0}
                   max={50}
                   step={5}
                   className="w-full"
                 />
               </div>
 
               {/* Monochrome Toggle */}
               <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <label className="text-xs text-muted-foreground uppercase tracking-wide">Monochrome Background</label>
                   <Switch
                     checked={settings.monochrome}
                     onCheckedChange={setMonochrome}
                   />
                 </div>
                 {settings.monochrome && (
                   <div>
                     <label className="text-xs text-muted-foreground mb-2 block">
                       Intensity: {settings.monochromeIntensity}%
                     </label>
                     <Slider
                       value={[settings.monochromeIntensity]}
                       onValueChange={([val]) => setMonochromeIntensity(val)}
                       min={0}
                       max={100}
                       step={5}
                       className="w-full"
                     />
                   </div>
                 )}
               </div>
 
               {/* Glass Presets */}
               <div>
                 <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                   Glass Presets
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                   {GLASS_PRESETS.map((preset) => (
                     <button
                       key={preset.id}
                       onClick={() => setGlassPreset(preset.id)}
                       className={cn(
                         "p-2 rounded-lg text-left transition-all border",
                         settings.glassPreset === preset.id
                           ? "bg-white/20 border-white/30"
                           : "bg-white/5 border-white/10 hover:bg-white/10"
                       )}
                     >
                       <span className="text-xs font-medium text-foreground block">
                         {preset.name}
                       </span>
                       <span className="text-[9px] text-muted-foreground">
                         {preset.description}
                       </span>
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