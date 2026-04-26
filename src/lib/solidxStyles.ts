// SolidX Style System - 4 unique solid presets, each with Dark / Light / Adaptive variants.
// These are NOT glass — they default to fully opaque, but the global cardOpacity slider
// can make them semi-transparent like glass.

export type SolidXVariant = 'dark' | 'light' | 'adaptive';

export interface SolidXScheme {
  background: string;          // CSS gradient
  topHighlight: string;        // inner top highlight (rgba)
  bottomShadow: string;        // inner bottom shadow (rgba)
  dropShadow: string;          // outer drop shadow (rgba)
  border: string;              // subtle border (rgba, low opacity)
  textTone: 'dark' | 'light';  // helper hint (text/logos themselves are unchanged)
}

export interface SolidXPreset {
  id: string;
  label: string;
  description: string;
  schemes: { dark: SolidXScheme; light: SolidXScheme };
}

const BORDER_DARK = 'rgba(255, 255, 255, 0.06)';
const BORDER_LIGHT = 'rgba(0, 0, 0, 0.06)';

export const SOLIDX_PRESETS: Record<string, SolidXPreset> = {
  lunax: {
    id: 'lunax',
    label: 'LunaX',
    description: 'Soft solid with top highlight',
    schemes: {
      dark: {
        background: 'linear-gradient(180deg, #2a2d34 0%, #1d2026 55%, #15171c 100%)',
        topHighlight: 'rgba(255, 255, 255, 0.10)',
        bottomShadow: 'rgba(0, 0, 0, 0.45)',
        dropShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
        border: BORDER_DARK,
        textTone: 'light',
      },
      light: {
        background: 'linear-gradient(180deg, #f4f5f8 0%, #e6e8ef 55%, #d6d9e1 100%)',
        topHighlight: 'rgba(255, 255, 255, 0.85)',
        bottomShadow: 'rgba(0, 0, 0, 0.10)',
        dropShadow: '0 6px 18px rgba(50, 60, 80, 0.20)',
        border: BORDER_LIGHT,
        textTone: 'dark',
      },
    },
  },
  aerox: {
    id: 'aerox',
    label: 'AeroX',
    description: 'Chrome pill, mid reflection',
    schemes: {
      dark: {
        background:
          'linear-gradient(180deg, #3a3f48 0%, #2a2f37 35%, #1f242c 50%, #2a2f37 65%, #3a3f48 100%)',
        topHighlight: 'rgba(255, 255, 255, 0.18)',
        bottomShadow: 'rgba(0, 0, 0, 0.55)',
        dropShadow: '0 8px 22px rgba(0, 0, 0, 0.50)',
        border: BORDER_DARK,
        textTone: 'light',
      },
      light: {
        background:
          'linear-gradient(180deg, #ffffff 0%, #eef0f4 35%, #d9dce2 50%, #eef0f4 65%, #ffffff 100%)',
        topHighlight: 'rgba(255, 255, 255, 0.95)',
        bottomShadow: 'rgba(0, 0, 0, 0.12)',
        dropShadow: '0 8px 22px rgba(60, 70, 90, 0.25)',
        border: BORDER_LIGHT,
        textTone: 'dark',
      },
    },
  },
  linuxx: {
    id: 'linuxx',
    label: 'LinuxX',
    description: 'Flat matte gradient',
    schemes: {
      dark: {
        background: 'linear-gradient(160deg, #2c2230 0%, #1f1825 60%, #15101c 100%)',
        topHighlight: 'rgba(255, 255, 255, 0.06)',
        bottomShadow: 'rgba(0, 0, 0, 0.45)',
        dropShadow: '0 4px 14px rgba(0, 0, 0, 0.40)',
        border: BORDER_DARK,
        textTone: 'light',
      },
      light: {
        background: 'linear-gradient(160deg, #f1ecf6 0%, #e3dcec 60%, #d2c9de 100%)',
        topHighlight: 'rgba(255, 255, 255, 0.70)',
        bottomShadow: 'rgba(0, 0, 0, 0.08)',
        dropShadow: '0 4px 14px rgba(80, 60, 100, 0.18)',
        border: BORDER_LIGHT,
        textTone: 'dark',
      },
    },
  },
  aquax: {
    id: 'aquax',
    label: 'AquaX',
    description: 'Glossy aqua dome',
    schemes: {
      dark: {
        background:
          'linear-gradient(180deg, #1c3a55 0%, #15334d 40%, #0e2942 70%, #173e60 100%)',
        topHighlight: 'rgba(120, 200, 255, 0.22)',
        bottomShadow: 'rgba(0, 0, 0, 0.50)',
        dropShadow: '0 8px 22px rgba(0, 30, 60, 0.55)',
        border: BORDER_DARK,
        textTone: 'light',
      },
      light: {
        background:
          'linear-gradient(180deg, #e6f4ff 0%, #cfe7fb 40%, #b8d9f5 70%, #d8eafd 100%)',
        topHighlight: 'rgba(255, 255, 255, 0.90)',
        bottomShadow: 'rgba(0, 30, 60, 0.10)',
        dropShadow: '0 8px 22px rgba(40, 90, 140, 0.25)',
        border: BORDER_LIGHT,
        textTone: 'dark',
      },
    },
  },
};

// Status color palette - identical for Glass and SolidX
export const STATUS_TINTS: Record<string, string> = {
  DELAYED: '#c23700',
  CANCELLED: '#7d0233',
  LANDED: '#025c2a',
  DEFAULT: '#fafafa',
};

export const getStatusTint = (status: string): string => {
  const key = (status || '').toUpperCase();
  return STATUS_TINTS[key] || STATUS_TINTS.DEFAULT;
};

export const resolveSolidXScheme = (
  presetId: string,
  variant: SolidXVariant,
  bgLuminance: number,
): SolidXScheme => {
  const preset = SOLIDX_PRESETS[presetId] || SOLIDX_PRESETS.lunax;
  if (variant === 'dark') return preset.schemes.dark;
  if (variant === 'light') return preset.schemes.light;
  // adaptive: when background is bright, pick dark scheme so the card pops
  return bgLuminance > 0.5 ? preset.schemes.dark : preset.schemes.light;
};

// Mix a hex color with a base rgba string at given alpha
export const mixStatusIntoRgba = (statusHex: string, alpha: number): string => {
  const r = parseInt(statusHex.slice(1, 3), 16);
  const g = parseInt(statusHex.slice(3, 5), 16);
  const b = parseInt(statusHex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
};
