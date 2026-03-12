const IMAGEKIT_BASE = 'https://ik.imagekit.io/jv0j9qvtw/New%20Airline%20Logo%20Variants%20/';

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
    textColors: { default: '#ffffff', delayed: '#c23700', cancelled: '#7d0233', landed: '#05c2a5' },
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
    textColors: { default: '#ffffff', delayed: '#c23700', cancelled: '#7d0233', landed: '#05c2a5' },
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
    textColors: { default: '#fafafa', delayed: '#c23700', cancelled: '#7d0233', landed: '#05c2a5' },
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
    textColors: { default: '#fafafa', delayed: '#c23700', cancelled: '#7d0233', landed: '#05c2a5' },
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
    textColors: { default: '#fafafa', delayed: '#c23700', cancelled: '#7d0233', landed: '#05c2a5' },
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
    textColors: { default: '#fafafa', delayed: '#c23700', cancelled: '#7d0233', landed: '#05c2a5' },
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
export const AIRLINE_NAMES: Record<string, string> = {
  '3U': 'Sichuan Airlines', '4Y': 'Discover Airlines', '6E': 'IndiGo', '8D': 'FitsAir',
  'AF': 'Air France', 'AI': 'Air India', 'AK': 'Air Asia', 'AZ': 'ITA Airways',
  'B4': 'beOnd', 'BA': 'British Airways', 'BS': 'US-Bangla Airlines', 'C6': 'Centrum Air',
  'DE': 'Condor', 'EK': 'Emirates', 'EY': 'Etihad Airways', 'FD': 'Thai AirAsia', 'FZ': 'FlyDubai',
  'G9': 'Air Arabia', 'GF': 'Gulf Air', 'H4': 'HiSky Europe', 'HB': 'Greater Bay Airlines',
  'HX': 'Hong Kong Airlines', 'HY': 'Uzbekistan Airways',
  'IB': 'Iberia', 'J2': 'Azerbaijan Airlines', 'J9': 'Jazeera Airways', 'JD': 'Beijing Capital Airlines',
  'KC': 'Air Astana', 'KU': 'Kuwait Airways', 'LO': 'LOT Polish Airlines', 'MF': 'XiamenAir',
  'MH': 'Malaysia Airlines', 'MU': 'China Eastern Airlines', 'NO': 'Neos', 'NR': 'MantaAir',
  'OD': 'Batik Air Malaysia', 'OQ': 'Chongqing Airlines', 'OS': 'Austrian Airlines',
  'PG': 'Bangkok Airways', 'Q2': 'Maldivian', 'QR': 'Qatar Airways',
  'SH': 'FlyMe', 'SQ': 'Singapore Airlines', 'SU': 'Aeroflot', 'SV': 'Saudia',
  'TK': 'Turkish Airlines', 'UL': 'SriLankan Airlines', 'VP': 'VillaAir', 'VS': 'Virgin Atlantic',
  'W6': 'Wizz Air', 'WK': 'Edelweiss Air', 'WY': 'Oman Air', 'XY': 'Flynas', 'ZF': 'Azur Air',
};

// Get the logo base path for a given card style and flight status
export const getLogoBasePath = (cardStyleId: string, status: string): string => {
  const style = CARD_STYLES[cardStyleId] || CARD_STYLES['plain-main'];
  const statusUpper = status.toUpperCase();
  switch (statusUpper) {
    case 'LANDED': return style.logoPaths.landed;
    case 'DELAYED': return style.logoPaths.delayed;
    case 'CANCELLED': return style.logoPaths.cancelled;
    default: return style.logoPaths.default;
  }
};

// Build logo URL patterns for a flight
export const getLogoUrls = (cardStyleId: string, status: string, flightId: string, airlineCode: string): string[] => {
  const basePath = getLogoBasePath(cardStyleId, status);
  const airlineName = AIRLINE_NAMES[airlineCode] || airlineCode;
  const encodedFlightId = encodeURIComponent(flightId);
  const encodedAirlineName = encodeURIComponent(airlineName);

  return [
    `${basePath}${encodedFlightId}%20(${encodedAirlineName}).png`,
    `${basePath}${encodedFlightId}%20(${encodedAirlineName},%20${encodedAirlineName}).png`,
    `${basePath}Unidentified%20Flight.png`,
  ];
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

// Get full theme for a card based on card style and status
export const getCardTheme = (cardStyleId: string, status: string) => {
  const textColor = getCardTextColor(cardStyleId, status);
  const statusUpper = status.toUpperCase();

  // Derive progress/card colors from text color
  const r = parseInt(textColor.slice(1, 3), 16);
  const g = parseInt(textColor.slice(3, 5), 16);
  const b = parseInt(textColor.slice(5, 7), 16);

  return {
    textColor,
    cardTint: textColor,
    progressActive: `rgba(${r}, ${g}, ${b}, 0.7)`,
    progressInactive: `rgba(${r}, ${g}, ${b}, 0.25)`,
    bellColor: textColor,
    bellGlow: `rgba(${r}, ${g}, ${b}, 0.4)`,
    hasStatus: statusUpper === 'LANDED' || statusUpper === 'CANCELLED' || statusUpper === 'DELAYED',
  };
};

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255, 255, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
