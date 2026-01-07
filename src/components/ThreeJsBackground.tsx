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
  "09:00": { zenith: "#1F2C45", horizon: "#567299", glow: "#7A8EAA", falloff: "#212D47" },
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

// Get interpolated gradient for current time
const getTimeGradient = (date: Date): { top: string; mid: string; bottom: string } => {
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
  return {
    top: gradient.zenith,
    mid: gradient.horizon,
    bottom: gradient.glow,
  };
};

// Sky gradient plane component
const SkyGradient = ({ gradient }: { gradient: { top: string; mid: string; bottom: string } }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const material = useMemo(() => {
    const topColor = hexToThreeColor(gradient.top);
    const midColor = hexToThreeColor(gradient.mid);
    const bottomColor = hexToThreeColor(gradient.bottom);

    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: topColor },
        midColor: { value: midColor },
        bottomColor: { value: bottomColor },
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
        varying vec2 vUv;
        void main() {
          vec3 color;
          if (vUv.y > 0.5) {
            color = mix(midColor, topColor, (vUv.y - 0.5) * 2.0);
          } else {
            color = mix(bottomColor, midColor, vUv.y * 2.0);
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
    });
  }, [gradient]);

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
      return Math.min(1, (decimalHour - 20) / 4); // 0 at 8pm, 1 at midnight
    }
    // Midnight to 6:15am: gradually decrease
    if (decimalHour <= 6.25) {
      return Math.min(1, (6.25 - decimalHour) / 6.25);
    }
    return 0;
  }, [maldivesTime]);

  // Generate stars with unique properties for each
  const { positions, fadeDelays, twinkleSpeeds, shineBrightness } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const fadeDelays = new Float32Array(count);
    const twinkleSpeeds = new Float32Array(count);
    const shineBrightness = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size.width * 2;
      positions[i * 3 + 1] = Math.random() * size.height * 0.85;
      positions[i * 3 + 2] = -50 - Math.random() * 20;
      fadeDelays[i] = Math.random() * 2; // Unique fade-in delay
      twinkleSpeeds[i] = 1 + Math.random() * 3; // Unique twinkle speed
      shineBrightness[i] = 0.4 + Math.random() * 0.6;
    }
    
    return { positions, fadeDelays, twinkleSpeeds, shineBrightness };
  }, [count, size]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || starVisibility === 0) return;
    
    const material = pointsRef.current.material as THREE.PointsMaterial;
    const time = clock.elapsedTime;
    // Aggregate twinkle effect
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

  // Only show between 12am (0:00) and 5am (5:00)
  const canShow = useMemo(() => {
    const hour = maldivesTime.getHours();
    return hour >= 0 && hour < 5;
  }, [maldivesTime]);

  useFrame(() => {
    if (!canShow) return;
    
    const now = Date.now();
    
    // Trigger shooting star at scheduled time
    if (!active && now > nextTriggerTime) {
      setActive(true);
      setStartPos({
        x: (Math.random() - 0.3) * size.width,
        y: size.height * (0.5 + Math.random() * 0.35),
      });
      
      // Schedule next shooting star (22-44 minutes)
      setNextTriggerTime(now + (22 + Math.random() * 22) * 60 * 1000);
      
      // Shooting star lasts 1 second
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

// Cloud component with Disney-style softness
const Cloud = ({ 
  x, y, width, opacity, layer, windSpeed 
}: { 
  x: number; 
  y: number; 
  width: number; 
  opacity: number; 
  layer: string;
  windSpeed: number;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();
  const initialX = useRef(x * size.width - size.width / 2);
  
  const layerDepth = layer === 'high' ? -30 : layer === 'mid' ? -20 : -10;
  const layerSpeed = layer === 'high' ? 0.3 : layer === 'mid' ? 0.5 : 0.8;
  const cloudWidth = width * 200;
  const cloudHeight = cloudWidth * 0.4;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    // Move cloud with wind
    const speed = layerSpeed * (1 + windSpeed * 0.02) * 0.5;
    groupRef.current.position.x += speed;
    
    // Wrap around
    if (groupRef.current.position.x > size.width / 2 + cloudWidth) {
      groupRef.current.position.x = -size.width / 2 - cloudWidth;
    }
  });

  // Create fluffy cloud shape with multiple circles
  const segments = 5 + Math.floor(Math.random() * 3);

  return (
    <group 
      ref={groupRef} 
      position={[initialX.current, y * size.height - size.height / 2, layerDepth]}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const progress = i / (segments - 1);
        const offsetX = (progress - 0.5) * cloudWidth * 0.7;
        const offsetY = Math.sin(progress * Math.PI) * cloudHeight * 0.3;
        const radius = (cloudHeight / 2) * (0.6 + Math.sin(progress * Math.PI) * 0.4);
        
        return (
          <mesh key={i} position={[offsetX, offsetY, 0]}>
            <circleGeometry args={[radius, 32]} />
            <meshBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={opacity * 0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Rain component
const Rain = ({ intensity, windSpeed, windDirection }: { intensity: number; windSpeed: number; windDirection: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { size } = useThree();
  const count = Math.floor(intensity * 300) + 50;

  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size.width * 2;
      positions[i * 3 + 1] = Math.random() * size.height * 1.5;
      positions[i * 3 + 2] = -5 - Math.random() * 10;
    }
    return positions;
  }, [count, size]);

  useFrame(() => {
    if (!pointsRef.current) return;
    
    const positionArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const windOffset = Math.sin((windDirection * Math.PI) / 180) * windSpeed * 0.1;
    
    for (let i = 0; i < count; i++) {
      positionArray[i * 3 + 1] -= (8 + intensity * 4);
      positionArray[i * 3] += windOffset;
      
      if (positionArray[i * 3 + 1] < -size.height / 2) {
        positionArray[i * 3 + 1] = size.height;
        positionArray[i * 3] = (Math.random() - 0.5) * size.width * 2;
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
        size={3}
        color="#a0b0c0"
        transparent
        opacity={0.4 + intensity * 0.3}
        sizeAttenuation
      />
    </points>
  );
};

// Sun component with Disney-style glow
const Sun = ({ visible, position, brightness }: { visible: boolean; position: { x: number; y: number }; brightness: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    // Subtle pulse effect
    const scale = 1 + Math.sin(clock.elapsedTime * 0.5) * 0.05;
    meshRef.current.scale.set(scale, scale, 1);
  });

  if (!visible) return null;

  const sunX = (position.x - 0.5) * size.width;
  const sunY = (1 - position.y) * size.height - size.height / 2;

  return (
    <group position={[sunX, sunY, -40]}>
      {/* Outer glow */}
      <mesh>
        <circleGeometry args={[80, 32]} />
        <meshBasicMaterial color="#fffaf0" transparent opacity={0.2 * brightness} />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <circleGeometry args={[50, 32]} />
        <meshBasicMaterial color="#fff5e0" transparent opacity={0.4 * brightness} />
      </mesh>
      {/* Sun body */}
      <mesh ref={meshRef}>
        <circleGeometry args={[30, 32]} />
        <meshBasicMaterial color="#fffef0" transparent opacity={brightness} />
      </mesh>
    </group>
  );
};

// Moon component with phase shadow that blends with sky
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
    // Subtle float effect
    groupRef.current.position.y += Math.sin(clock.elapsedTime * 0.3) * 0.1;
  });

  if (!visible) return null;

  const moonX = (position.x - 0.5) * size.width;
  const moonY = (1 - position.y) * size.height - size.height / 2;
  const radius = 20;

  // Calculate shadow offset based on phase
  const shadowOffset = phase < 0.5 
    ? -(1 - phase * 2) * radius * 1.2 
    : (phase - 0.5) * 2 * radius * 1.2;

  return (
    <group ref={groupRef} position={[moonX, moonY, -40]}>
      {/* Moon glow */}
      <mesh>
        <circleGeometry args={[radius * 2.5, 32]} />
        <meshBasicMaterial 
          color="#d0e0ff" 
          transparent 
          opacity={0.15 * (illumination / 100)} 
        />
      </mesh>
      {/* Moon body */}
      <mesh>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial color="#f0f5ff" />
      </mesh>
      {/* Phase shadow - uses sky color to blend */}
      {phase !== 0.5 && (
        <mesh position={[shadowOffset, 0, 0.1]}>
          <circleGeometry args={[radius * 1.1, 32]} />
          <meshBasicMaterial color={skyMidColor} />
        </mesh>
      )}
    </group>
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
          float grain = random(vUv + time * 0.01) * 0.08;
          gl_FragColor = vec4(vec3(grain), grain * 0.5);
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
  const gradient = weatherData.gradient || { top: '#0c0c0e', mid: '#141416', bottom: '#1c1c1f' };
  const phase = weatherData.skyPhase || 'night';
  const sun = weatherData.celestialObjects?.sun || { visible: false, position: { x: 0.5, y: 0.5 }, brightness: 0 };
  const moon = weatherData.celestialObjects?.moon || { visible: false, position: { x: 0.5, y: 0.5 }, phase: 0.5, illumination: 50 };
  const clouds = weatherData.clouds || [];
  const rain = weatherData.rain || { active: false, intensity: 0, windSpeed: 5, windDirection: 180 };
  const windSpeed = weatherData.weather?.windSpeed || 5;

  return (
    <>
      {/* Sky gradient */}
      <SkyGradient gradient={gradient} />
      
      {/* Stars */}
      <Stars phase={phase} count={180} />
      
      {/* Shooting stars */}
      <ShootingStar phase={phase} />
      
      {/* Sun */}
      <Sun visible={sun.visible} position={sun.position} brightness={sun.brightness} />
      
      {/* Moon with sky-blended shadow */}
      <Moon 
        visible={moon.visible} 
        position={moon.position} 
        phase={moon.phase} 
        illumination={moon.illumination}
        skyMidColor={gradient.mid}
      />
      
      {/* Clouds */}
      {clouds.map((cloud, i) => (
        <Cloud 
          key={i}
          x={cloud.x}
          y={1 - cloud.y}
          width={cloud.width}
          opacity={cloud.opacity}
          layer={cloud.layer}
          windSpeed={windSpeed}
        />
      ))}
      
      {/* Rain */}
      {rain.active && (
        <Rain 
          intensity={rain.intensity} 
          windSpeed={rain.windSpeed} 
          windDirection={rain.windDirection} 
        />
      )}
      
      {/* Film grain overlay for vintage look */}
      <FilmGrain />
    </>
  );
};

// Main component with error boundary fallback
const ThreeJsBackground = ({ weatherData }: Props) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !weatherData) {
    return null; // Fallback to DisneyWeatherBackground
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