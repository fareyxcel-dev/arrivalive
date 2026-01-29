import { useState, useEffect, useRef } from 'react';
import { Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FontPickerProps {
  fonts: string[];
  selectedFont: string;
  onSelect: (font: string) => void;
  onUploadClick?: () => void;
}

// Load a Google Font dynamically
const loadFont = (fontName: string) => {
  const linkId = `font-preview-${fontName.replace(/\s+/g, '-')}`;
  if (document.getElementById(linkId)) return;
  
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
  document.head.appendChild(link);
};

const FontPicker = ({ fonts, selectedFont, onSelect, onUploadClick }: FontPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [recentFonts, setRecentFonts] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent fonts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('arriva-recent-fonts');
    if (saved) {
      setRecentFonts(JSON.parse(saved));
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load visible fonts on scroll
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const fontName = entry.target.getAttribute('data-font');
            if (fontName && !loadedFonts.has(fontName)) {
              loadFont(fontName);
              setLoadedFonts((prev) => new Set(prev).add(fontName));
            }
          }
        });
      },
      { root: listRef.current, rootMargin: '100px' }
    );

    const items = listRef.current.querySelectorAll('[data-font]');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [isOpen, loadedFonts]);

  // Pre-load selected font
  useEffect(() => {
    loadFont(selectedFont);
    setLoadedFonts((prev) => new Set(prev).add(selectedFont));
  }, [selectedFont]);

  const handleSelectFont = (font: string) => {
    onSelect(font);
    
    // Update recent fonts
    const newRecent = [font, ...recentFonts.filter(f => f !== font)].slice(0, 5);
    setRecentFonts(newRecent);
    localStorage.setItem('arriva-recent-fonts', JSON.stringify(newRecent));
    
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected font display / trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-lg bg-white/5 text-left flex items-center justify-between transition-all hover:bg-white/10 border border-white/10"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <span
          className="text-foreground font-semibold truncate"
          style={{ fontFamily: `'${selectedFont}', sans-serif` }}
        >
          {selectedFont}
        </span>
        <Check className={cn("w-4 h-4 text-foreground/50 transition-opacity", isOpen && "opacity-0")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-50 mt-2 w-full max-h-96 rounded-xl overflow-hidden animate-scale-in border border-white/15"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          {/* Header - Font Collections */}
          <div className="px-4 py-3 border-b border-white/10">
            <span className="text-foreground font-bold text-lg">
              Font Collections
            </span>
          </div>

          {/* Recent Fonts Section */}
          {recentFonts.length > 0 && (
            <div className="border-b border-white/10">
              <div className="px-4 py-2">
                <span className="text-white/40 text-sm">Recent Fonts</span>
              </div>
              {recentFonts.map((font) => (
                <button
                  key={`recent-${font}`}
                  onClick={() => handleSelectFont(font)}
                  className={cn(
                    "w-full px-4 py-2 text-left transition-all flex items-center gap-2",
                    font === selectedFont
                      ? "bg-white/20 text-foreground"
                      : "hover:bg-white/10 text-foreground/80"
                  )}
                  style={{ fontFamily: `'${font}', sans-serif` }}
                >
                  {font === selectedFont && <Check className="w-4 h-4" />}
                  <span className="truncate">{font}</span>
                </button>
              ))}
            </div>
          )}

          {/* Upload font option */}
          {onUploadClick && (
            <button
              onClick={() => {
                onUploadClick();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 border-b border-white/10 hover:bg-white/5 transition-colors group"
            >
              <Upload className="w-4 h-4 text-white/40 group-hover:text-white/60" />
              <div className="text-left">
                <span className="text-white/40 text-sm font-medium block group-hover:text-white/60">Upload font</span>
                <span className="text-white/30 text-xs">Submit for approval</span>
              </div>
            </button>
          )}

          {/* All Fonts Header */}
          <div className="px-4 py-2 border-b border-white/10">
            <span className="text-white/40 text-sm">All Fonts</span>
          </div>

          {/* Font list */}
          <div ref={listRef} className="overflow-y-auto max-h-60 scrollbar-thin">
            {fonts.map((font) => {
              const isSelected = font === selectedFont;
              return (
                <button
                  key={font}
                  data-font={font}
                  onClick={() => handleSelectFont(font)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-all border-b border-white/5 last:border-0 flex items-center gap-2",
                    isSelected
                      ? "bg-white/20 text-foreground"
                      : "hover:bg-white/10 text-foreground/80"
                  )}
                  style={{ fontFamily: loadedFonts.has(font) ? `'${font}', sans-serif` : 'inherit' }}
                >
                  {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                  <span className="block truncate">
                    {font}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontPicker;
