import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface WeatherData {
  gradient: { top: string; mid: string; bottom: string };
  skyPhase: string;
  celestialObjects: {
    sun: { visible: boolean; position: { x: number; y: number }; brightness: number };
    moon: { visible: boolean; position: { x: number; y: number }; phase: number; illumination: number };
  };
  clouds: Array<{ x: number; y: number; layer: string; opacity: number; width: number }>;
  rain: { active: boolean; intensity: number; windSpeed: number; windDirection: number };
  lightning: { active: boolean; events: Array<{ x: number; y: number; time: number }> };
  stars: Array<{ x: number; y: number; brightness: number }>;
  weather: {
    condition: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    cloudCoverage: number;
  };
}

interface Props {
  weatherData: WeatherData | null;
}

// Convert hex color to THREE.Color
const hexToThreeColor = (hex: string): THREE.Color => {
  return new THREE.Color(hex);
};

// Get current Maldives time
const getMaldivesTime = (): Date => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
};

// 72-stop Maldives Sky Dome Gradient System (Zenith, Horizon, Glow, Falloff)
const SKY_GRADIENTS: Record<string, { zenith: string; horizon: string; glow: string; falloff: string }> = {
  // Deep Night (00:00 – 03:40)
  "00:00": { zenith: "#05070F", horizon: "#0A1024", glow: "#0E1A3A", falloff: "#060913" },
  "00:20": { zenith: "#05070F", horizon: "#0B1126", glow: "#101D40", falloff: "#060913" },
  "00:40": { zenith: "#060812", horizon: "#0C132A", glow: "#122046", falloff: "#070A15" },
  "01:00": { zenith: "#060914", horizon: "#0D142D", glow: "#14234B", falloff: "#070B17" },
  "01:20": { zenith: "#070A16", horizon: "#0E1631", glow: "#162650", falloff: "#080C19" },
  "01:40": { zenith: "#070B18", horizon: "#0F1835", glow: "#182955", falloff: "#090D1B" },
  "02:00": { zenith: "#080C1A", horizon: "#101A39", glow: "#1A2C59", falloff: "#0A0E1D" },
  "02:20": { zenith: "#080D1C", horizon: "#111C3C", glow: "#1C2F5D", falloff: "#0A0F1F" },
  "02:40": { zenith: "#090E1E", horizon: "#121E40", glow: "#1E3261", falloff: "#0B1021" },
  "03:00": { zenith: "#090F20", horizon: "#132044", glow: "#203565", falloff: "#0B1123" },
  "03:20": { zenith: "#0A1022", horizon: "#142348", glow: "#223869", falloff: "#0C1225" },
  "03:40": { zenith: "#0A1124", horizon: "#15254C", glow: "#243B6D", falloff: "#0C1327" },
  // Pre-Dawn / Blue Hour (04:00 – 05:40)
  "04:00": { zenith: "#0B1226", horizon: "#182852", glow: "#274071", falloff: "#0D1429" },
  "04:20": { zenith: "#0B1328", horizon: "#1B2C58", glow: "#2B4577", falloff: "#0E152B" },
  "04:40": { zenith: "#0C142A", horizon: "#1E305E", glow: "#2F4A7D", falloff: "#0E162D" },
  "05:00": { zenith: "#0D152C", horizon: "#213464", glow: "#334F83", falloff: "#0F172F" },
  "05:20": { zenith: "#0E162E", horizon: "#24386A", glow: "#375489", falloff: "#101831" },
  "05:40": { zenith: "#0F1730", horizon: "#273C70", glow: "#3B598F", falloff: "#101933" },
  // Sunrise (06:00 – 07:40)
  "06:00": { zenith: "#101A33", horizon: "#2C426F", glow: "#4A5E86", falloff: "#121B35" },
  "06:20": { zenith: "#121C35", horizon: "#314874", glow: "#50648A", falloff: "#141D37" },
  "06:40": { zenith: "#141E37", horizon: "#364E79", glow: "#54688C", falloff: "#161F39" },
  "07:00": { zenith: "#162039", horizon: "#3B547E", glow: "#5A6E90", falloff: "#18213B" },
  "07:20": { zenith: "#18223B", horizon: "#405A83", glow: "#607494", falloff: "#1A233D" },
  "07:40": { zenith: "#1A243D", horizon: "#456088", glow: "#667A98", falloff: "#1C253F" },
  // Day Sky (08:00 – 16:40)
  "08:00": { zenith: "#1C263F", horizon: "#4A668D", glow: "#6E829E", falloff: "#1E2741" },
  "08:20": { zenith: "#1D2841", horizon: "#4E6A91", glow: "#7286A2", falloff: "#1F2943" },
  "08:40": { zenith: "#1E2A43", horizon: "#526E95", glow: "#768AA6", falloff: "#202B45" },
  "09:00": { zenith: "#1F2C45", horizon: "#567299", glow: "#7A8EAA", falloff: "#212D47" },
  "09:20": { zenith: "#202E47", horizon: "#5A769D", glow: "#7E92AE", falloff: "#222F49" },
  "09:40": { zenith: "#213049", horizon: "#5E7AA1", glow: "#8296B2", falloff: "#23314B" },
  "10:00": { zenith: "#22324B", horizon: "#627EA5", glow: "#869AB6", falloff: "#24334D" },
  "12:00": { zenith: "#24364F", horizon: "#6886AD", glow: "#8CA0BC", falloff: "#263751" },
  "14:00": { zenith: "#23344D", horizon: "#6582A9", glow: "#889CBA", falloff: "#25354F" },
  "16:00": { zenith: "#212E49", horizon: "#5E7AA1", glow: "#8296B2", falloff: "#23314B" },
  "16:40": { zenith: "#202E47", horizon: "#5C789F", glow: "#8194AE", falloff: "#222F49" },
  // Sunset (17:00 – 18:40)
  "17:00": { zenith: "#1E2B44", horizon: "#556F97", glow: "#7A8DA8", falloff: "#202D46" },
  "17:20": { zenith: "#1D2942", horizon: "#516A93", glow: "#7486A2", falloff: "#1F2B44" },
  "17:40": { zenith: "#1C2740", horizon: "#4D658F", glow: "#70819E", falloff: "#1E2942" },
  "18:00": { zenith: "#1B253E", horizon: "#485F8B", glow: "#6C7C9A", falloff: "#1D2740" },
  "18:20": { zenith: "#1A233C", horizon: "#435987", glow: "#687796", falloff: "#1C253E" },
  "18:40": { zenith: "#19213A", horizon: "#3E5383", glow: "#647292", falloff: "#1B233C" },
  // Dusk → Night (19:00 – 23:40)
  "19:00": { zenith: "#171F38", horizon: "#384C7E", glow: "#5F6D8F", falloff: "#191F38" },
  "19:20": { zenith: "#161D36", horizon: "#334679", glow: "#586689", falloff: "#181D36" },
  "19:40": { zenith: "#151B34", horizon: "#2E4074", glow: "#515F83", falloff: "#171B34" },
  "20:00": { zenith: "#141932", horizon: "#293A6F", glow: "#4A587D", falloff: "#161932" },
  "21:00": { zenith: "#10152C", horizon: "#1F2F5C", glow: "#34466A", falloff: "#12172E" },
  "22:00": { zenith: "#0D1126", horizon: "#16234A", glow: "#26355A", falloff: "#0F1328" },
  "23:00": { zenith: "#090D20", horizon: "#0E1736", glow: "#18244A", falloff: "#0B0F22" },
  "23:40": { zenith: "#060913", horizon: "#091026", glow: "#101B3D", falloff: "#070A15" },
};

// Weather condition HSL modifiers
interface WeatherModifier {
  hueDelta: number;
  satMult: number;
  lightMult: number;
  overlay: string;
  intensity: number;
}

const WEATHER_MODIFIERS: Record<string, WeatherModifier> = {
  'clear': { hueDelta: 0, satMult: 1.0, lightMult: 1.0, overlay: '', intensity: 0 },
  'few clouds': { hueDelta: -2, satMult: 0.95, lightMult: 0.92, overlay: 'rgba(255,255,255,0.03)', intensity: 0.15 },
  'scattered clouds': { hueDelta: -4, satMult: 0.90, lightMult: 0.88, overlay: 'rgba(255,255,255,0.06)', intensity: 0.30 },
  'broken clouds': { hueDelta: -6, satMult: 0.82, lightMult: 0.80, overlay: 'rgba(220,230,255,0.10)', intensity: 0.45 },
  'overcast': { hueDelta: -8, satMult: 0.70, lightMult: 0.72, overlay: 'rgba(200,210,220,0.18)', intensity: 0.65 },
  'light rain': { hueDelta: -10, satMult: 0.75, lightMult: 0.70, overlay: 'rgba(180,200,220,0.22)', intensity: 0.75 },
  'heavy rain': { hueDelta: -14, satMult: 0.65, lightMult: 0.62, overlay: 'rgba(160,180,200,0.30)', intensity: 0.75 },
  'thunderstorm': { hueDelta: -18, satMult: 0.60, lightMult: 0.55, overlay: 'rgba(120,140,160,0.35)', intensity: 0.85 },
  'haze': { hueDelta: -6, satMult: 0.78, lightMult: 0.82, overlay: 'rgba(220,210,190,0.18)', intensity: 0.35 },
  'mist': { hueDelta: -8, satMult: 0.70, lightMult: 0.85, overlay: 'rgba(200,200,210,0.20)', intensity: 0.40 },
  'fog': { hueDelta: -8, satMult: 0.65, lightMult: 0.88, overlay: 'rgba(180,180,190,0.25)', intensity: 0.50 },
  'rain': { hueDelta: -12, satMult: 0.70, lightMult: 0.65, overlay: 'rgba(170,190,210,0.25)', intensity: 0.75 },
  'drizzle': { hueDelta: -8, satMult: 0.80, lightMult: 0.75, overlay: 'rgba(190,200,220,0.18)', intensity: 0.50 },
  'cloudy': { hueDelta: -6, satMult: 0.75, lightMult: 0.78, overlay: 'rgba(200,210,220,0.15)', intensity: 0.55 },
  'partly cloudy': { hueDelta: -3, satMult: 0.92, lightMult: 0.90, overlay: 'rgba(255,255,255,0.04)', intensity: 0.20 },
};

// Convert hex to HSL
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

// Convert HSL to hex
const hslToHex = (h: number, s: number, l: number): string => {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Apply weather modifiers to hex color
const applyWeatherModifier = (hex: string, modifier: WeatherModifier): string => {
  const hsl = hexToHsl(hex);
  let newH = hsl.h + modifier.hueDelta;
  let newS = hsl.s * modifier.satMult;
  let newL = Math.min(48, hsl.l * modifier.lightMult); // Clamp lightness ≤ 48%
  return hslToHex(newH, newS, newL);
};

// Get weather modifier for condition
const getWeatherModifier = (condition: string): WeatherModifier => {
  const lowerCondition = condition.toLowerCase();
  for (const [key, modifier] of Object.entries(WEATHER_MODIFIERS)) {
    if (lowerCondition.includes(key)) {
      return modifier;
    }
  }
  return WEATHER_MODIFIERS['clear'];
};

// Get interpolated gradient for current time with weather overlay
const getTimeGradient = (date: Date, weatherCondition: string = 'clear'): { top: string; mid: string; bottom: string; falloff: string } => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeStr = `${hours.toString().padStart(2, '0')}:${(Math.floor(minutes / 20) * 20).toString().padStart(2, '0')}`;
  
  // Find the closest time key
  const keys = Object.keys(SKY_GRADIENTS).sort();
  let selectedKey = keys[0];
  
  for (const key of keys) {
    if (key <= timeStr) {
      selectedKey = key;
    }
  }
  
  const gradient = SKY_GRADIENTS[selectedKey] || SKY_GRADIENTS["12:00"];
  const modifier = getWeatherModifier(weatherCondition);
  
  return {
    top: applyWeatherModifier(gradient.zenith, modifier),
    mid: applyWeatherModifier(gradient.horizon, modifier),
    bottom: applyWeatherModifier(gradient.glow, modifier),
    falloff: applyWeatherModifier(gradient.falloff, modifier),
  };
};

// Sky gradient plane component with weather overlay
const SkyGradient = ({ gradient, weatherCondition }: { gradient: { top: string; mid: string; bottom: string }; weatherCondition: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const modifier = getWeatherModifier(weatherCondition);

  const material = useMemo(() => {
    const topColor = hexToThreeColor(gradient.top);
    const midColor = hexToThreeColor(gradient.mid);
    const bottomColor = hexToThreeColor(gradient.bottom);

    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: topColor },
        midColor: { value: midColor },
        bottomColor: { value: bottomColor },
        overlayIntensity: { value: modifier.intensity },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        uniform float overlayIntensity;
        varying vec2 vUv;
        void main() {
          vec3 color;
          if (vUv.y > 0.5) {
            color = mix(midColor, topColor, (vUv.y - 0.5) * 2.0);
          } else {
            color = mix(bottomColor, midColor, vUv.y * 2.0);
          }
          // Apply weather overlay tint
          vec3 overlayColor = vec3(0.7, 0.75, 0.85);
          color = mix(color, overlayColor, overlayIntensity * 0.3);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
    });
  }, [gradient, modifier.intensity]);

  return (
    <mesh ref={meshRef} position={[0, 0, -100]}>
      <planeGeometry args={[size.width * 2, size.height * 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// Enhanced Stars component with individual fade timing and visibility based on time
const Stars = ({ phase, count = 200 }: { phase: string; count?: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { size } = useThree();
  const [maldivesTime, setMaldivesTime] = useState(getMaldivesTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setMaldivesTime(getMaldivesTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Stars fade in around 8pm, peak at midnight, fade out by 6:15am
  const starVisibility = useMemo(() => {
    const hour = maldivesTime.getHours();
    const minute = maldivesTime.getMinutes();
    const decimalHour = hour + minute / 60;
    
    // 8pm (20:00) to midnight: gradually increase
    if (decimalHour >= 20) {
      return Math.min(1, (decimalHour - 20) / 4);
    }
    // Midnight to 6:15am: gradually decrease
    if (decimalHour <= 6.25) {
      return Math.min(1, (6.25 - decimalHour) / 6.25);
    }
    return 0;
  }, [maldivesTime]);

  // Generate stars with unique properties for each
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size.width * 2;
      positions[i * 3 + 1] = Math.random() * size.height * 0.85;
      positions[i * 3 + 2] = -50 - Math.random() * 20;
      sizes[i] = 1.5 + Math.random() * 2;
    }
    
    return { positions, sizes };
  }, [count, size]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || starVisibility === 0) return;
    
    const material = pointsRef.current.material as THREE.PointsMaterial;
    const time = clock.elapsedTime;
    const baseOpacity = starVisibility * 0.85;
    material.opacity = baseOpacity + Math.sin(time * 2) * 0.08 + Math.sin(time * 3.7) * 0.05;
  });

  if (starVisibility === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2.5}
        color="#ffffff"
        transparent
        opacity={starVisibility * 0.85}
        sizeAttenuation={false}
      />
    </points>
  );
};

// Enhanced Shooting star component - 22-44 minute intervals between 12am-5am
const ShootingStar = ({ phase }: { phase: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const [active, setActive] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [nextTriggerTime, setNextTriggerTime] = useState(() => Date.now() + (22 + Math.random() * 22) * 60 * 1000);
  const [maldivesTime, setMaldivesTime] = useState(getMaldivesTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setMaldivesTime(getMaldivesTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const canShow = useMemo(() => {
    const hour = maldivesTime.getHours();
    return hour >= 0 && hour < 5;
  }, [maldivesTime]);

  useFrame(() => {
    if (!canShow) return;
    
    const now = Date.now();
    
    if (!active && now > nextTriggerTime) {
      setActive(true);
      setStartPos({
        x: (Math.random() - 0.3) * size.width,
        y: size.height * (0.5 + Math.random() * 0.35),
      });
      
      setNextTriggerTime(now + (22 + Math.random() * 22) * 60 * 1000);
      setTimeout(() => setActive(false), 1000);
    }

    if (meshRef.current && active) {
      const progress = ((now - (nextTriggerTime - (22 * 60 * 1000))) % 1000) / 1000;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(progress * Math.PI) * 0.9;
      meshRef.current.position.x = startPos.x + progress * 150;
      meshRef.current.position.y = startPos.y - progress * 80;
    }
  });

  if (!active || !canShow) return null;

  return (
    <mesh ref={meshRef} position={[startPos.x, startPos.y, -42]} rotation={[0, 0, -Math.PI / 5]}>
      <planeGeometry args={[120, 2.5]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
    </mesh>
  );
};

// Enhanced Cloud component with multi-layer parallax
const Cloud = ({ 
  x, y, width, opacity, layer, windSpeed, weatherCondition 
}: { 
  x: number; 
  y: number; 
  width: number; 
  opacity: number; 
  layer: string;
  windSpeed: number;
  weatherCondition: string;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();
  const initialX = useRef(x * size.width - size.width / 2);
  
  const layerDepth = layer === 'high' ? -35 : layer === 'mid' ? -25 : -15;
  const layerSpeed = layer === 'high' ? 0.2 : layer === 'mid' ? 0.4 : 0.7;
  const cloudWidth = width * 250;
  const cloudHeight = cloudWidth * 0.35;

  // Cloud color based on weather
  const cloudColor = useMemo(() => {
    const lowerCondition = weatherCondition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('storm')) {
      return '#808090';
    }
    if (lowerCondition.includes('overcast') || lowerCondition.includes('cloudy')) {
      return '#a0a5b0';
    }
    return '#e8eaf0';
  }, [weatherCondition]);

  useFrame(() => {
    if (!groupRef.current) return;
    
    const speed = layerSpeed * (1 + windSpeed * 0.015) * 0.4;
    groupRef.current.position.x += speed;
    
    if (groupRef.current.position.x > size.width / 2 + cloudWidth) {
      groupRef.current.position.x = -size.width / 2 - cloudWidth;
    }
  });

  const segments = 6 + Math.floor(Math.random() * 3);

  return (
    <group 
      ref={groupRef} 
      position={[initialX.current, y * size.height - size.height / 2, layerDepth]}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const progress = i / (segments - 1);
        const offsetX = (progress - 0.5) * cloudWidth * 0.75;
        const offsetY = Math.sin(progress * Math.PI) * cloudHeight * 0.35;
        const radius = (cloudHeight / 2) * (0.55 + Math.sin(progress * Math.PI) * 0.45);
        
        return (
          <mesh key={i} position={[offsetX, offsetY, 0]}>
            <circleGeometry args={[radius, 32]} />
            <meshBasicMaterial 
              color={cloudColor} 
              transparent 
              opacity={opacity * 0.65}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Enhanced Rain component with layered droplets
const Rain = ({ intensity, windSpeed, windDirection }: { intensity: number; windSpeed: number; windDirection: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { size } = useThree();
  const count = Math.floor(intensity * 500) + 100;

  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size.width * 2.5;
      positions[i * 3 + 1] = Math.random() * size.height * 1.8;
      positions[i * 3 + 2] = -3 - Math.random() * 12;
    }
    return positions;
  }, [count, size]);

  useFrame(() => {
    if (!pointsRef.current) return;
    
    const positionArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const windOffset = Math.sin((windDirection * Math.PI) / 180) * windSpeed * 0.12;
    
    for (let i = 0; i < count; i++) {
      positionArray[i * 3 + 1] -= (10 + intensity * 6);
      positionArray[i * 3] += windOffset;
      
      if (positionArray[i * 3 + 1] < -size.height / 2) {
        positionArray[i * 3 + 1] = size.height * 1.2;
        positionArray[i * 3] = (Math.random() - 0.5) * size.width * 2.5;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (intensity === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={4}
        color="#9ab0c8"
        transparent
        opacity={0.35 + intensity * 0.35}
        sizeAttenuation
      />
    </points>
  );
};

// Lightning flash component
const Lightning = ({ active, intensity }: { active: boolean; intensity: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const [flashActive, setFlashActive] = useState(false);
  const [flashPosition, setFlashPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) return;
    
    const triggerFlash = () => {
      if (Math.random() < 0.03 * intensity) {
        setFlashActive(true);
        setFlashPosition({
          x: (Math.random() - 0.5) * size.width,
          y: size.height * 0.3 + Math.random() * size.height * 0.4,
        });
        setTimeout(() => setFlashActive(false), 100 + Math.random() * 150);
      }
    };
    
    const interval = setInterval(triggerFlash, 500);
    return () => clearInterval(interval);
  }, [active, intensity, size]);

  if (!flashActive) return null;

  return (
    <>
      {/* Lightning bolt */}
      <mesh position={[flashPosition.x, flashPosition.y, -8]}>
        <planeGeometry args={[3, 120]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      {/* Screen flash */}
      <mesh ref={meshRef} position={[0, 0, 5]}>
        <planeGeometry args={[size.width * 2, size.height * 2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>
    </>
  );
};

// Sun component with Disney-style glow
const Sun = ({ visible, position, brightness }: { visible: boolean; position: { x: number; y: number }; brightness: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const scale = 1 + Math.sin(clock.elapsedTime * 0.5) * 0.05;
    meshRef.current.scale.set(scale, scale, 1);
  });

  if (!visible) return null;

  const sunX = (position.x - 0.5) * size.width;
  const sunY = (1 - position.y) * size.height - size.height / 2;

  return (
    <group position={[sunX, sunY, -40]}>
      <mesh>
        <circleGeometry args={[80, 32]} />
        <meshBasicMaterial color="#fffaf0" transparent opacity={0.2 * brightness} />
      </mesh>
      <mesh>
        <circleGeometry args={[50, 32]} />
        <meshBasicMaterial color="#fff5e0" transparent opacity={0.4 * brightness} />
      </mesh>
      <mesh ref={meshRef}>
        <circleGeometry args={[30, 32]} />
        <meshBasicMaterial color="#fffef0" transparent opacity={brightness} />
      </mesh>
    </group>
  );
};

// Moon component with phase shadow
const Moon = ({ 
  visible, 
  position, 
  phase, 
  illumination,
  skyMidColor 
}: { 
  visible: boolean; 
  position: { x: number; y: number }; 
  phase: number; 
  illumination: number;
  skyMidColor: string;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y += Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });

  if (!visible) return null;

  const moonX = (position.x - 0.5) * size.width;
  const moonY = (1 - position.y) * size.height - size.height / 2;
  const radius = 20;

  const shadowOffset = phase < 0.5 
    ? -(1 - phase * 2) * radius * 1.2 
    : (phase - 0.5) * 2 * radius * 1.2;

  return (
    <group ref={groupRef} position={[moonX, moonY, -40]}>
      <mesh>
        <circleGeometry args={[radius * 2.5, 32]} />
        <meshBasicMaterial 
          color="#d0e0ff" 
          transparent 
          opacity={0.15 * (illumination / 100)} 
        />
      </mesh>
      <mesh>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial color="#f0f5ff" />
      </mesh>
      {phase !== 0.5 && (
        <mesh position={[shadowOffset, 0, 0.1]}>
          <circleGeometry args={[radius * 1.1, 32]} />
          <meshBasicMaterial color={skyMidColor} />
        </mesh>
      )}
    </group>
  );
};

// 3D Ocean with realistic reflections
const Ocean = ({ gradient, weatherCondition }: { gradient: { top: string; mid: string; bottom: string }; weatherCondition: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  // Ocean takes bottom 20% of screen
  const oceanHeight = size.height * 0.2;
  const oceanY = -size.height / 2 + oceanHeight / 2;

  const material = useMemo(() => {
    const skyColor = hexToThreeColor(gradient.mid);
    const deepColor = new THREE.Color('#0a1428');
    
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        skyColor: { value: skyColor },
        deepColor: { value: deepColor },
        waveIntensity: { value: weatherCondition.toLowerCase().includes('storm') ? 0.15 : 0.05 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float time;
        uniform float waveIntensity;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Multiple wave layers for realistic ocean
          float wave1 = sin(pos.x * 0.05 + time * 0.8) * waveIntensity;
          float wave2 = sin(pos.x * 0.08 + time * 1.2) * waveIntensity * 0.5;
          float wave3 = cos(pos.x * 0.03 + time * 0.5) * waveIntensity * 0.3;
          
          vElevation = wave1 + wave2 + wave3;
          pos.y += vElevation * 20.0;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 skyColor;
        uniform vec3 deepColor;
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        
        void main() {
          // Gradient from deep to sky reflection
          float reflectionStrength = smoothstep(0.0, 0.8, vUv.y) * 0.6;
          
          // Add wave-based highlights
          float highlight = (vElevation + 0.1) * 2.0;
          highlight = clamp(highlight, 0.0, 1.0);
          
          vec3 oceanColor = mix(deepColor, skyColor, reflectionStrength);
          oceanColor += vec3(highlight * 0.15);
          
          // Subtle animated shimmer
          float shimmer = sin(vUv.x * 50.0 + time * 2.0) * 0.03;
          oceanColor += vec3(shimmer);
          
          // Fresnel-like edge effect
          float fresnel = pow(1.0 - vUv.y, 2.0) * 0.3;
          oceanColor = mix(oceanColor, skyColor, fresnel);
          
          gl_FragColor = vec4(oceanColor, 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, [gradient.mid, weatherCondition]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.time.value = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, oceanY, -5]}>
      <planeGeometry args={[size.width * 2, oceanHeight, 64, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// Film grain overlay for vintage effect
const FilmGrain = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        
        float random(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          float grain = random(vUv + time * 0.01) * 0.06;
          gl_FragColor = vec4(vec3(grain), grain * 0.4);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.time.value = clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 10]}>
      <planeGeometry args={[size.width * 2, size.height * 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// Main scene component
const Scene = ({ weatherData }: { weatherData: WeatherData }) => {
  const maldivesTime = getMaldivesTime();
  const weatherCondition = weatherData?.weather?.condition || 'clear';
  const timeGradient = getTimeGradient(maldivesTime, weatherCondition);
  
  const gradient = {
    top: timeGradient.top,
    mid: timeGradient.mid,
    bottom: timeGradient.bottom,
  };
  
  const phase = weatherData.skyPhase || 'night';
  const sun = weatherData.celestialObjects?.sun || { visible: false, position: { x: 0.5, y: 0.5 }, brightness: 0 };
  const moon = weatherData.celestialObjects?.moon || { visible: false, position: { x: 0.5, y: 0.5 }, phase: 0.5, illumination: 50 };
  const clouds = weatherData.clouds || [];
  const rain = weatherData.rain || { active: false, intensity: 0, windSpeed: 5, windDirection: 180 };
  const windSpeed = weatherData.weather?.windSpeed || 5;
  
  // Determine if lightning should be active
  const isThunderstorm = weatherCondition.toLowerCase().includes('thunder') || weatherCondition.toLowerCase().includes('storm');
  const rainIntensity = rain.active ? rain.intensity : 
    (weatherCondition.toLowerCase().includes('rain') ? 0.6 : 0);

  return (
    <>
      {/* Sky gradient with weather overlay */}
      <SkyGradient gradient={gradient} weatherCondition={weatherCondition} />
      
      {/* Stars */}
      <Stars phase={phase} count={180} />
      
      {/* Shooting stars */}
      <ShootingStar phase={phase} />
      
      {/* Sun */}
      <Sun visible={sun.visible} position={sun.position} brightness={sun.brightness} />
      
      {/* Moon */}
      <Moon 
        visible={moon.visible} 
        position={moon.position} 
        phase={moon.phase} 
        illumination={moon.illumination}
        skyMidColor={gradient.mid}
      />
      
      {/* Clouds with weather-based coloring */}
      {clouds.map((cloud, i) => (
        <Cloud 
          key={i}
          x={cloud.x}
          y={1 - cloud.y}
          width={cloud.width}
          opacity={cloud.opacity}
          layer={cloud.layer}
          windSpeed={windSpeed}
          weatherCondition={weatherCondition}
        />
      ))}
      
      {/* Rain - show if active or if weather condition indicates rain */}
      {rainIntensity > 0 && (
        <Rain 
          intensity={rainIntensity} 
          windSpeed={rain.windSpeed || windSpeed} 
          windDirection={rain.windDirection || 180} 
        />
      )}
      
      {/* Lightning for thunderstorms */}
      <Lightning active={isThunderstorm} intensity={rain.intensity || 0.7} />
      
      {/* 3D Ocean at bottom 20% */}
      <Ocean gradient={gradient} weatherCondition={weatherCondition} />
      
      {/* Film grain overlay */}
      <FilmGrain />
    </>
  );
};

// Main component
const ThreeJsBackground = ({ weatherData }: Props) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !weatherData) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full" style={{ filter: 'grayscale(100%)' }}>
      <Canvas
        orthographic
        camera={{ zoom: 1, position: [0, 0, 100] }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        onError={() => setHasError(true)}
      >
        <Scene weatherData={weatherData} />
      </Canvas>
    </div>
  );
};

export default ThreeJsBackground;