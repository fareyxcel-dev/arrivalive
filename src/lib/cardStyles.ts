const IMAGEKIT_BASE = 'https://ik.imagekit.io/jv0j9qvtw/New%20Airline%20Logo%20Variants%20/';
const ICONS_BASE = `${IMAGEKIT_BASE}Icons/`;

// UI Icon URLs from ImageKit
export const UI_ICONS = {
  profile: `${ICONS_BASE}User%20Profile.png`,
  fontStyle: `${ICONS_BASE}Font%20Style.png`,
  bgStyle: `${ICONS_BASE}Background%20Style.png`,
  uiStyle: `${ICONS_BASE}UI%20Style.png`,
  notifications: `${ICONS_BASE}Notifications.png`,
  security: `${ICONS_BASE}Security.png`,
  settings: `${ICONS_BASE}Settings.png`,
  forceRefresh: `${ICONS_BASE}Force%20Refresh.png`,
  exportHistory: `${ICONS_BASE}Export%20History.png`,
  loginLogout: `${ICONS_BASE}Login%20and%20Logout.png`,
  adminTools: `${ICONS_BASE}Admin%20Tools.png`,
  t1: `${ICONS_BASE}International%20Terminal%201.png`,
  t2: `${ICONS_BASE}International%20Terminal%202.png`,
  dom: `${ICONS_BASE}Domestic%20Terminal.png`,
  dayTime: `${ICONS_BASE}Day%20Time.png`,
  nightTime: `${ICONS_BASE}Night%20Time.png`,
  sunset: `${ICONS_BASE}Sunset.png`,
  sunrise: `${ICONS_BASE}Sunrise.png`,
};

export interface CardStyle {
  id: string;
  label: string;
  description: string;
  textColors: {
    default: string;
    delayed: string;
    cancelled: string;
    landed: string;
  };
  // For gradient styles, provide 3-color arrays (top, mid, bottom)
  gradientColors?: {
    default: [string, string, string];
    delayed: [string, string, string];
    cancelled: [string, string, string];
    landed: [string, string, string];
  };
  logoPaths: {
    default: string;
    delayed: string;
    cancelled: string;
    landed: string;
  };
  isGlass: boolean;
  isGradient: boolean;
}

export const CARD_STYLES: Record<string, CardStyle> = {
  'plain-main': {
    id: 'plain-main',
    label: 'Plain Main',
    description: 'Clean white logos',
    textColors: { default: '#FFFFFF', delayed: '#BA4716', cancelled: '#7C1235', landed: '#175E2A' },
    logoPaths: {
      default: `${IMAGEKIT_BASE}Plain%20Variants/Main/`,
      delayed: `${IMAGEKIT_BASE}Plain%20Variants/Delayed/`,
      cancelled: `${IMAGEKIT_BASE}Plain%20Variants/Cancelled/`,
      landed: `${IMAGEKIT_BASE}Plain%20Variants/Landed/`,
    },
    isGlass: false,
    isGradient: false,
  },
  'glass-main': {
    id: 'glass-main',
    label: 'Glass Main',
    description: 'Glass faceted logos',
    textColors: { default: '#D8D9DD', delayed: '#9B330F', cancelled: '#690C36', landed: '#0C4521' },
    logoPaths: {
      default: `${IMAGEKIT_BASE}Glass%20Variants/Main/`,
      delayed: `${IMAGEKIT_BASE}Glass%20Variants/Delayed/`,
      cancelled: `${IMAGEKIT_BASE}Glass%20Variants/Cancelled/`,
      landed: `${IMAGEKIT_BASE}Glass%20Variants/Landed/`,
    },
    isGlass: true,
    isGradient: false,
  },
  'plain-default': {
    id: 'plain-default',
    label: 'Plain Default',
    description: 'Subtle default logos',
    textColors: { default: '#E0E0E0', delayed: '#BA4716', cancelled: '#7C1235', landed: '#175E2A' },
    logoPaths: {
      default: `${IMAGEKIT_BASE}Plain%20Variants/Default/`,
      delayed: `${IMAGEKIT_BASE}Plain%20Variants/Delayed/`,
      cancelled: `${IMAGEKIT_BASE}Plain%20Variants/Cancelled/`,
      landed: `${IMAGEKIT_BASE}Plain%20Variants/Landed/`,
    },
    isGlass: false,
    isGradient: false,
  },
  'glass-default': {
    id: 'glass-default',
    label: 'Glass Default',
    description: 'Glass faceted default',
    textColors: { default: '#B5B5B5', delayed: '#9B330F', cancelled: '#690C36', landed: '#0C4521' },
    logoPaths: {
      default: `${IMAGEKIT_BASE}Glass%20Variants/Default/`,
      delayed: `${IMAGEKIT_BASE}Glass%20Variants/Delayed/`,
      cancelled: `${IMAGEKIT_BASE}Glass%20Variants/Cancelled/`,
      landed: `${IMAGEKIT_BASE}Glass%20Variants/Landed/`,
    },
    isGlass: true,
    isGradient: false,
  },
  'plain-gradient': {
    id: 'plain-gradient',
    label: 'Plain Gradient',
    description: 'Gradient colored logos',
    textColors: { default: '#E0E0E0', delayed: '#BA4716', cancelled: '#7C1235', landed: '#175E2A' },
    gradientColors: {
      default: ['#F5F5F5', '#E0E0E0', '#BDBDBD'],
      delayed: ['#E26A32', '#BA4716', '#8A310C'],
      cancelled: ['#A8224F', '#7C1235', '#4A071D'],
      landed: ['#2B9145', '#175E2A', '#0A3615'],
    },
    logoPaths: {
      default: `${IMAGEKIT_BASE}Gradient%20Variants/Default/`,
      delayed: `${IMAGEKIT_BASE}Gradient%20Variants/Delayed%20/`,
      cancelled: `${IMAGEKIT_BASE}Gradient%20Variants/Cancelled/`,
      landed: `${IMAGEKIT_BASE}Gradient%20Variants/Landed/`,
    },
    isGlass: false,
    isGradient: true,
  },
  'glass-gradient': {
    id: 'glass-gradient',
    label: 'Glass Gradient',
    description: 'Glass + gradient logos',
    textColors: { default: '#B5B5B5', delayed: '#9B330F', cancelled: '#690C36', landed: '#0C4521' },
    gradientColors: {
      default: ['#FFFFFF', '#B5B5B5', '#787878'],
      delayed: ['#F38B62', '#9B330F', '#5C1B05'],
      cancelled: ['#B82E65', '#690C36', '#3B041C'],
      landed: ['#2EAB56', '#0C4521', '#04210E'],
    },
    logoPaths: {
      default: `${IMAGEKIT_BASE}Gradient%20Glass%20Variants/Default/`,
      delayed: `${IMAGEKIT_BASE}Gradient%20Glass%20Variants/Delayed/`,
      cancelled: `${IMAGEKIT_BASE}Gradient%20Glass%20Variants/Cancelled/`,
      landed: `${IMAGEKIT_BASE}Gradient%20Glass%20Variants/Landed/`,
    },
    isGlass: true,
    isGradient: true,
  },
};

// Airline name mapping for logo filename matching
// Keys are 2-char IATA codes, values must match exact filenames in ImageKit
export const AIRLINE_NAMES: Record<string, string> = {
  '3U': 'Sichuan Airlines', '4Y': 'Discover Airlines', '6E': 'IndiGo', '8D': 'FitsAir',
  'AF': 'Air France', 'AI': 'Air India', 'AK': 'Air Asia', 'AZ': 'ITA Airways',
  'B4': 'beOnd', 'BA': 'British Airways', 'BS': 'US-Bangla Airlines', 'C6': 'Centrum Air',
  'DE': 'Condor', 'EK': 'Emirates', 'EY': 'Etihad Airways', 'FD': 'Thai AirAsia', 'FZ': 'FlyDubai',
  'G9': 'Air Arabia', 'GF': 'Gulf Air', 'H4': 'HiSky Europe', 'HB': 'Greater Bay Airlines',
  'HX': 'Hong Kong Airlines', 'HY': 'Uzbekistan Airways',
  'IB': 'Iberia', 'J2': 'Azerbaijan Airlines', 'J9': 'Jazeera Airways',
  'KC': 'Air Astana', 'KU': 'Kuwait Airways', 'LO': 'LOT Polish Airlines', 'MF': 'XiamenAir',
  'MH': 'Malaysia Airlines', 'MU': 'China Eastern Airlines', 'NO': 'Neos', 'NR': 'MantaAir',
  'OD': 'Batik Air Malaysia', 'OQ': 'Chongqing Airlines', 'OS': 'Austrian Airlines',
  'PG': 'Bangkok Airways', 'Q2': 'Maldivian', 'QR': 'Qatar Airways',
  'SH': 'FlyMe', 'SQ': 'Singapore Airlines', 'SU': 'Aeroflot', 'SV': 'Saudia',
  'TK': 'Turkish Airlines', 'UL': 'SriLankan Airlines', 'VP': 'FlyMe', 'VS': 'Virgin Atlantic',
  'W6': 'Wizz Air', 'WK': 'Edelweiss Air', 'WY': 'Oman Air', 'XY': 'Flynas', 'ZF': 'Azur Air',
};

// Some airlines have alternate/extended filenames in ImageKit
const AIRLINE_NAMES_ALT: Record<string, string> = {
  'JD': 'Beijing Capital Airlines, Capital Airlines',
};

// Build logo URL patterns for a flight
// Uses ONLY the 2-char IATA code extracted from flightId, NOT the full flight ID
export const getLogoUrls = (cardStyleId: string, status: string, flightId: string, airlineCode: string): string[] => {
  const basePath = getLogoBasePath(cardStyleId, status);
  const iataCode = flightId.substring(0, 2).toUpperCase();
  const airlineName = AIRLINE_NAMES[iataCode] || AIRLINE_NAMES[airlineCode] || airlineCode;
  const altName = AIRLINE_NAMES_ALT[iataCode];

  const urls: string[] = [];

  // Primary: "EK (Emirates).png"
  urls.push(`${basePath}${encodeURIComponent(iataCode)}%20(${encodeURIComponent(airlineName)}).png`);

  // Alt name if exists: "JD (Beijing Capital Airlines, Capital Airlines).png"
  if (altName) {
    urls.push(`${basePath}${encodeURIComponent(iataCode)}%20(${encodeURIComponent(altName)}).png`);
  }

  // Fallback
  urls.push(`${basePath}Unidentified%20Flight.png`);

  return urls;
};

// Get text color based on card style and status
export const getCardTextColor = (cardStyleId: string, status: string): string => {
  const style = CARD_STYLES[cardStyleId] || CARD_STYLES['plain-main'];
  const statusUpper = status.toUpperCase();
  switch (statusUpper) {
    case 'LANDED': return style.textColors.landed;
    case 'DELAYED': return style.textColors.delayed;
    case 'CANCELLED': return style.textColors.cancelled;
    default: return style.textColors.default;
  }
};

// Get gradient colors if available
export const getCardGradientColors = (cardStyleId: string, status: string): [string, string, string] | null => {
  const style = CARD_STYLES[cardStyleId] || CARD_STYLES['plain-main'];
  if (!style.gradientColors) return null;
  const statusUpper = status.toUpperCase();
  switch (statusUpper) {
    case 'LANDED': return style.gradientColors.landed;
    case 'DELAYED': return style.gradientColors.delayed;
    case 'CANCELLED': return style.gradientColors.cancelled;
    default: return style.gradientColors.default;
  }
};

// Get full theme for a card based on card style and status
export const getCardTheme = (cardStyleId: string, status: string) => {
  const textColor = getCardTextColor(cardStyleId, status);
  const gradientColors = getCardGradientColors(cardStyleId, status);
  const statusUpper = status.toUpperCase();

  // Derive progress/card colors from text color
  const r = parseInt(textColor.slice(1, 3), 16);
  const g = parseInt(textColor.slice(3, 5), 16);
  const b = parseInt(textColor.slice(5, 7), 16);

  return {
    textColor,
    gradientColors,
    cardTint: textColor,
    progressActive: `rgba(${r}, ${g}, ${b}, 0.7)`,
    progressInactive: `rgba(${r}, ${g}, ${b}, 0.25)`,
    bellColor: textColor,
    bellGlow: `rgba(${r}, ${g}, ${b}, 0.4)`,
    hasStatus: statusUpper === 'LANDED' || statusUpper === 'CANCELLED' || statusUpper === 'DELAYED',
    isGlass: CARD_STYLES[cardStyleId]?.isGlass ?? false,
    isGradient: CARD_STYLES[cardStyleId]?.isGradient ?? false,
  };
};

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255, 255, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
