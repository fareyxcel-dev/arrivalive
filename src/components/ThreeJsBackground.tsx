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

// Stars component with twinkling
const Stars = ({ phase, count = 150 }: { phase: string; count?: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { size } = useThree();
  const [maldivesTime, setMaldivesTime] = useState(getMaldivesTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setMaldivesTime(getMaldivesTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate star visibility based on time (more stars as midnight approaches)
  const starVisibility = useMemo(() => {
    if (phase !== 'night' && phase !== 'astronomical' && phase !== 'nautical') return 0;
    
    const hour = maldivesTime.getHours();
    const minute = maldivesTime.getMinutes();
    const decimalHour = hour + minute / 60;
    
    // Peak at midnight (24/0), less at 6am and 6pm
    if (decimalHour >= 18) {
      // Evening: gradually increase from 6pm to midnight
      return Math.min(1, (decimalHour - 18) / 6);
    } else if (decimalHour <= 6) {
      // Morning: gradually decrease from midnight to 6am
      return Math.min(1, (6 - decimalHour) / 6);
    }
    return 0;
  }, [phase, maldivesTime]);

  const { positions, opacities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size.width * 2;
      positions[i * 3 + 1] = Math.random() * size.height * 0.8;
      positions[i * 3 + 2] = -50 - Math.random() * 20;
      opacities[i] = 0.3 + Math.random() * 0.7;
    }
    
    return { positions, opacities };
  }, [count, size]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || starVisibility === 0) return;
    
    const material = pointsRef.current.material as THREE.PointsMaterial;
    // Twinkle effect
    const baseOpacity = starVisibility * 0.8;
    material.opacity = baseOpacity + Math.sin(clock.elapsedTime * 2) * 0.1;
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
        size={2}
        color="#ffffff"
        transparent
        opacity={starVisibility * 0.8}
        sizeAttenuation={false}
      />
    </points>
  );
};

// Shooting star component
const ShootingStar = ({ phase }: { phase: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const [active, setActive] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [nextTrigger, setNextTrigger] = useState(0);
  const [maldivesTime, setMaldivesTime] = useState(getMaldivesTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setMaldivesTime(getMaldivesTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Only show between 11pm and 4:30am
  const canShow = useMemo(() => {
    if (phase !== 'night' && phase !== 'astronomical') return false;
    
    const hour = maldivesTime.getHours();
    const minute = maldivesTime.getMinutes();
    const decimalHour = hour + minute / 60;
    
    return (decimalHour >= 23 || decimalHour <= 4.5);
  }, [phase, maldivesTime]);

  useFrame(({ clock }) => {
    if (!canShow) return;
    
    const time = clock.elapsedTime * 1000;
    
    // Trigger shooting star every 22-44 seconds (for demo)
    if (!active && time > nextTrigger) {
      setActive(true);
      setStartPos({
        x: (Math.random() - 0.3) * size.width,
        y: size.height * (0.5 + Math.random() * 0.3),
      });
      setNextTrigger(time + 22000 + Math.random() * 22000);
      
      setTimeout(() => setActive(false), 800);
    }

    if (meshRef.current && active) {
      const progress = ((time - (nextTrigger - 22000)) % 800) / 800;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(progress * Math.PI);
    }
  });

  if (!active || !canShow) return null;

  return (
    <mesh ref={meshRef} position={[startPos.x, startPos.y, -45]} rotation={[0, 0, -Math.PI / 4]}>
      <planeGeometry args={[100, 2]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
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