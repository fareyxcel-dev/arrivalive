import * as THREE from "three";

// 72-stop Maldives Sky Dome Gradient System
const SKY_GRADIENTS: Record<string, [string, string, string, string]> = {
  // Deep Night (00:00 – 03:40) - [Zenith, Horizon, Glow, Falloff]
  "00:00": ["#05070F", "#0A1024", "#0E1A3A", "#060913"],
  "00:20": ["#05070F", "#0B1126", "#101D40", "#060913"],
  "00:40": ["#060812", "#0C132A", "#122046", "#070A15"],
  "01:00": ["#060914", "#0D142D", "#14234B", "#070B17"],
  "01:20": ["#070A16", "#0E1631", "#162650", "#080C19"],
  "01:40": ["#070B18", "#0F1835", "#182955", "#090D1B"],
  "02:00": ["#080C1A", "#101A39", "#1A2C59", "#0A0E1D"],
  "02:20": ["#080D1C", "#111C3C", "#1C2F5D", "#0A0F1F"],
  "02:40": ["#090E1E", "#121E40", "#1E3261", "#0B1021"],
  "03:00": ["#090F20", "#132044", "#203565", "#0B1123"],
  "03:20": ["#0A1022", "#142348", "#223869", "#0C1225"],
  "03:40": ["#0A1124", "#15254C", "#243B6D", "#0C1327"],
  // Pre-Dawn / Blue Hour (04:00 – 05:40)
  "04:00": ["#0B1226", "#182852", "#274071", "#0D1429"],
  "04:20": ["#0B1328", "#1B2C58", "#2B4577", "#0E152B"],
  "04:40": ["#0C142A", "#1E305E", "#2F4A7D", "#0E162D"],
  "05:00": ["#0D152C", "#213464", "#334F83", "#0F172F"],
  "05:20": ["#0E162E", "#24386A", "#375489", "#101831"],
  "05:40": ["#0F1730", "#273C70", "#3B598F", "#101933"],
  // Sunrise (06:00 – 07:40)
  "06:00": ["#101A33", "#2C426F", "#4A5E86", "#121B35"],
  "06:20": ["#121C35", "#314874", "#50648A", "#141D37"],
  "06:40": ["#141E37", "#364E79", "#54688C", "#161F39"],
  "07:00": ["#162039", "#3B547E", "#5A6E90", "#18213B"],
  "07:20": ["#18223B", "#405A83", "#607494", "#1A233D"],
  "07:40": ["#1A243D", "#456088", "#667A98", "#1C253F"],
  // Day Sky (08:00 – 16:40)
  "08:00": ["#1C263F", "#4A668D", "#6E829E", "#1E2741"],
  "08:20": ["#1D2841", "#4E6A91", "#7286A2", "#1F2943"],
  "08:40": ["#1E2A43", "#526E95", "#768AA6", "#202B45"],
  "09:00": ["#1F2C45", "#567299", "#7A8EAA", "#212D47"],
  "09:20": ["#202E47", "#5A769D", "#7E92AE", "#222F49"],
  "09:40": ["#213049", "#5E7AA1", "#8296B2", "#23314B"],
  "10:00": ["#22324B", "#627EA5", "#869AB6", "#24334D"],
  "12:00": ["#24364F", "#6886AD", "#8CA0BC", "#263751"],
  "14:00": ["#23344D", "#6582A9", "#889CBA", "#25354F"],
  "16:00": ["#212E49", "#5E7AA1", "#8296B2", "#23314B"],
  "16:40": ["#202E47", "#5C789F", "#8194AE", "#222F49"],
  // Sunset (17:00 – 18:40)
  "17:00": ["#1E2B44", "#556F97", "#7A8DA8", "#202D46"],
  "17:20": ["#1D2942", "#516A93", "#7486A2", "#1F2B44"],
  "17:40": ["#1C2740", "#4D658F", "#70819E", "#1E2942"],
  "18:00": ["#1B253E", "#485F8B", "#6C7C9A", "#1D2740"],
  "18:20": ["#1A233C", "#435987", "#687796", "#1C253E"],
  "18:40": ["#19213A", "#3E5383", "#647292", "#1B233C"],
  // Dusk → Night (19:00 – 23:40)
  "19:00": ["#171F38", "#384C7E", "#5F6D8F", "#191F38"],
  "19:20": ["#161D36", "#334679", "#586689", "#181D36"],
  "19:40": ["#151B34", "#2E4074", "#515F83", "#171B34"],
  "20:00": ["#141932", "#293A6F", "#4A587D", "#161932"],
  "21:00": ["#10152C", "#1F2F5C", "#34466A", "#12172E"],
  "22:00": ["#0D1126", "#16234A", "#26355A", "#0F1328"],
  "23:00": ["#090D20", "#0E1736", "#18244A", "#0B0F22"],
  "23:40": ["#060913", "#091026", "#101B3D", "#070A15"],
};

// Weather modifiers
const WEATHER_MODIFIERS: Record<string, { hueDelta: number; satMult: number; lightMult: number; intensity: number }> = {
  'clear': { hueDelta: 0, satMult: 1.0, lightMult: 1.0, intensity: 0 },
  'few clouds': { hueDelta: -2, satMult: 0.95, lightMult: 0.92, intensity: 0.15 },
  'scattered clouds': { hueDelta: -4, satMult: 0.90, lightMult: 0.88, intensity: 0.30 },
  'broken clouds': { hueDelta: -6, satMult: 0.82, lightMult: 0.80, intensity: 0.45 },
  'overcast': { hueDelta: -8, satMult: 0.70, lightMult: 0.72, intensity: 0.65 },
  'light rain': { hueDelta: -10, satMult: 0.75, lightMult: 0.70, intensity: 0.75 },
  'heavy rain': { hueDelta: -14, satMult: 0.65, lightMult: 0.62, intensity: 0.75 },
  'thunderstorm': { hueDelta: -18, satMult: 0.60, lightMult: 0.55, intensity: 0.85 },
  'haze': { hueDelta: -6, satMult: 0.78, lightMult: 0.82, intensity: 0.35 },
  'mist': { hueDelta: -8, satMult: 0.70, lightMult: 0.85, intensity: 0.40 },
  'fog': { hueDelta: -8, satMult: 0.65, lightMult: 0.88, intensity: 0.50 },
  'rain': { hueDelta: -12, satMult: 0.70, lightMult: 0.65, intensity: 0.75 },
  'drizzle': { hueDelta: -8, satMult: 0.80, lightMult: 0.75, intensity: 0.50 },
  'cloudy': { hueDelta: -6, satMult: 0.75, lightMult: 0.78, intensity: 0.55 },
  'partly cloudy': { hueDelta: -3, satMult: 0.92, lightMult: 0.90, intensity: 0.20 },
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
}

function getGradientForTime(hours: number, minutes: number): [string, string, string, string] {
  const timeKeys = Object.keys(SKY_GRADIENTS).sort();
  const currentTime = hours + minutes / 60;
  
  let prevKey = timeKeys[timeKeys.length - 1];
  let nextKey = timeKeys[0];
  
  for (let i = 0; i < timeKeys.length; i++) {
    const [h, m] = timeKeys[i].split(':').map(Number);
    const keyTime = h + m / 60;
    
    if (keyTime <= currentTime) {
      prevKey = timeKeys[i];
      nextKey = timeKeys[(i + 1) % timeKeys.length];
    }
  }
  
  return SKY_GRADIENTS[prevKey] || SKY_GRADIENTS["12:00"];
}

function getWeatherModifier(condition: string) {
  const lowerCondition = condition.toLowerCase();
  for (const [key, modifier] of Object.entries(WEATHER_MODIFIERS)) {
    if (lowerCondition.includes(key)) {
      return modifier;
    }
  }
  return WEATHER_MODIFIERS['clear'];
}

// Vertex shader for sky + ocean
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float iTime;
  uniform float oceanHeight;
  uniform float waveIntensity;
  
  void main() {
    vUv = uv;
    vPosition = position;
    
    vec3 pos = position;
    
    // Only apply waves to ocean region (bottom 20%)
    if (vUv.y < oceanHeight) {
      float wave1 = sin(pos.x * 3.0 + iTime * 0.8) * waveIntensity;
      float wave2 = sin(pos.x * 5.0 + iTime * 1.2) * waveIntensity * 0.5;
      float wave3 = cos(pos.x * 2.0 + iTime * 0.5) * waveIntensity * 0.3;
      pos.y += (wave1 + wave2 + wave3) * 0.02;
    }
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment shader for sky + ocean with full 72-stop gradient
const fragmentShader = `
  uniform float iTime;
  uniform float iDay;
  uniform vec2 iRes;
  uniform vec3 zenithColor;
  uniform vec3 horizonColor;
  uniform vec3 glowColor;
  uniform vec3 falloffColor;
  uniform float weatherIntensity;
  uniform float oceanHeight;
  uniform float starVisibility;
  uniform vec3 sunPosition;
  uniform float sunBrightness;
  uniform vec3 moonPosition;
  uniform float moonPhase;
  uniform float moonIllumination;
  uniform float cloudCoverage;
  uniform float rainIntensity;
  uniform float isThunderstorm;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Noise functions for stars and effects
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  
  // Star field
  float stars(vec2 uv, float time) {
    float starField = 0.0;
    vec2 starUv = uv * 150.0;
    float starHash = hash(floor(starUv));
    
    if (starHash > 0.985) {
      vec2 starCenter = fract(starUv) - 0.5;
      float dist = length(starCenter);
      float twinkle = sin(time * (2.0 + starHash * 4.0) + starHash * 6.28) * 0.3 + 0.7;
      starField = smoothstep(0.1, 0.0, dist) * twinkle;
    }
    
    return starField;
  }
  
  // Cloud layer
  float clouds(vec2 uv, float time, float coverage) {
    float cloud = 0.0;
    vec2 cloudUv = uv * 3.0 + vec2(time * 0.02, 0.0);
    
    cloud += noise(cloudUv) * 0.5;
    cloud += noise(cloudUv * 2.0 + 0.5) * 0.25;
    cloud += noise(cloudUv * 4.0 + 1.0) * 0.125;
    
    cloud = smoothstep(0.4 - coverage * 0.3, 0.7, cloud);
    return cloud;
  }
  
  // Rain effect
  float rain(vec2 uv, float time, float intensity) {
    if (intensity < 0.01) return 0.0;
    
    float rainDrop = 0.0;
    vec2 rainUv = uv * vec2(50.0, 100.0);
    rainUv.y -= time * 15.0;
    
    float rainHash = hash(floor(rainUv));
    if (rainHash > 1.0 - intensity * 0.3) {
      vec2 dropCenter = fract(rainUv) - 0.5;
      float dist = abs(dropCenter.x) + abs(dropCenter.y) * 0.1;
      rainDrop = smoothstep(0.05, 0.0, dist) * 0.3;
    }
    
    return rainDrop;
  }
  
  void main() {
    vec2 uv = vUv;
    float y = uv.y;
    
    // Sky gradient - 4-stop interpolation
    vec3 skyColor;
    float skyY = (y - oceanHeight) / (1.0 - oceanHeight); // Normalize to sky region
    
    if (y > oceanHeight) {
      // Sky region
      if (skyY > 0.7) {
        // Zenith to horizon blend
        float t = (skyY - 0.7) / 0.3;
        skyColor = mix(horizonColor, zenithColor, t);
      } else if (skyY > 0.3) {
        // Horizon to glow blend
        float t = (skyY - 0.3) / 0.4;
        skyColor = mix(glowColor, horizonColor, t);
      } else {
        // Glow to falloff blend
        float t = skyY / 0.3;
        skyColor = mix(falloffColor, glowColor, t);
      }
      
      // Weather overlay
      vec3 weatherOverlay = vec3(0.7, 0.75, 0.85);
      skyColor = mix(skyColor, weatherOverlay, weatherIntensity * 0.3);
      
      // Stars - only at night (starVisibility > 0)
      if (starVisibility > 0.0) {
        float starField = stars(uv, iTime);
        skyColor += vec3(starField) * starVisibility;
      }
      
      // Sun glow
      if (sunBrightness > 0.0) {
        float sunDist = distance(uv, sunPosition.xy);
        float sunGlow = smoothstep(0.25, 0.0, sunDist) * sunBrightness;
        float sunCore = smoothstep(0.03, 0.0, sunDist) * sunBrightness;
        skyColor += vec3(1.0, 0.95, 0.85) * sunGlow * 0.4;
        skyColor += vec3(1.0, 1.0, 0.95) * sunCore;
      }
      
      // Moon glow
      if (moonIllumination > 0.0) {
        float moonDist = distance(uv, moonPosition.xy);
        float moonGlow = smoothstep(0.15, 0.0, moonDist) * (moonIllumination / 100.0);
        float moonCore = smoothstep(0.02, 0.0, moonDist) * (moonIllumination / 100.0);
        skyColor += vec3(0.8, 0.85, 1.0) * moonGlow * 0.3;
        skyColor += vec3(0.95, 0.97, 1.0) * moonCore;
      }
      
      // Clouds
      if (cloudCoverage > 0.0) {
        float cloudLayer = clouds(uv, iTime, cloudCoverage);
        vec3 cloudColor = mix(vec3(0.9), vec3(0.6), rainIntensity);
        skyColor = mix(skyColor, cloudColor, cloudLayer * cloudCoverage * 0.6);
      }
      
      // Rain
      float rainEffect = rain(uv, iTime, rainIntensity);
      skyColor += vec3(0.6, 0.65, 0.7) * rainEffect;
      
      // Lightning flash
      if (isThunderstorm > 0.5) {
        float flash = step(0.98, hash(vec2(floor(iTime * 2.0), 0.0)));
        skyColor += vec3(flash * 0.4);
      }
      
    } else {
      // Ocean region
      float oceanY = y / oceanHeight;
      vec3 deepColor = vec3(0.04, 0.08, 0.16);
      vec3 surfaceColor = mix(glowColor, horizonColor, 0.5);
      
      // Gradient from deep to surface with sky reflection
      float reflectionStrength = smoothstep(0.0, 1.0, oceanY) * 0.6;
      skyColor = mix(deepColor, surfaceColor, reflectionStrength);
      
      // Wave highlights
      float wave = sin(uv.x * 30.0 + iTime) * 0.5 + 0.5;
      wave *= sin(uv.x * 50.0 + iTime * 1.3) * 0.5 + 0.5;
      skyColor += vec3(wave * 0.05 * oceanY);
      
      // Shimmer effect
      float shimmer = sin(uv.x * 80.0 + iTime * 2.0) * 0.02;
      skyColor += vec3(shimmer * oceanY);
      
      // Fresnel-like edge glow
      float fresnel = pow(oceanY, 2.0) * 0.2;
      skyColor = mix(skyColor, surfaceColor, fresnel);
    }
    
    // Film grain
    float grain = hash(uv + iTime * 0.01) * 0.04;
    skyColor += vec3(grain);
    
    // Clamp brightness for UI safety
    skyColor = clamp(skyColor, vec3(0.0), vec3(0.56)); // Max #8FAFCF brightness
    
    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

export interface SkyOceanUniforms {
  weatherCondition?: string;
  cloudCoverage?: number;
  rainIntensity?: number;
  isThunderstorm?: boolean;
  sunVisible?: boolean;
  sunPosition?: { x: number; y: number };
  sunBrightness?: number;
  moonVisible?: boolean;
  moonPosition?: { x: number; y: number };
  moonPhase?: number;
  moonIllumination?: number;
}

export function initSkyOcean(container: HTMLElement, externalUniforms?: SkyOceanUniforms) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    iTime: { value: 0 },
    iRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    iDay: { value: 0 },
    zenithColor: { value: new THREE.Vector3(0.14, 0.21, 0.31) },
    horizonColor: { value: new THREE.Vector3(0.41, 0.53, 0.68) },
    glowColor: { value: new THREE.Vector3(0.55, 0.63, 0.74) },
    falloffColor: { value: new THREE.Vector3(0.15, 0.22, 0.32) },
    weatherIntensity: { value: 0 },
    oceanHeight: { value: 0.2 },
    waveIntensity: { value: 0.05 },
    starVisibility: { value: 0 },
    sunPosition: { value: new THREE.Vector3(0.5, 0.7, 0) },
    sunBrightness: { value: 0 },
    moonPosition: { value: new THREE.Vector3(0.3, 0.6, 0) },
    moonPhase: { value: 0.5 },
    moonIllumination: { value: 50 },
    cloudCoverage: { value: 0 },
    rainIntensity: { value: 0 },
    isThunderstorm: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthWrite: false,
  });

  scene.add(new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    material
  ));

  const clock = new THREE.Clock();

  function getMaldivesTime(): Date {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 5 * 3600000);
  }

  function updateUniforms(ext?: SkyOceanUniforms) {
    const maldives = getMaldivesTime();
    const hours = maldives.getHours();
    const minutes = maldives.getMinutes();
    const seconds = maldives.getSeconds();
    
    // Update day progress
    uniforms.iDay.value = (hours + minutes / 60 + seconds / 3600) / 24;
    
    // Get gradient for current time
    const gradient = getGradientForTime(hours, minutes);
    const [zenith, horizon, glow, falloff] = gradient.map(hexToRgb);
    
    uniforms.zenithColor.value.set(zenith[0], zenith[1], zenith[2]);
    uniforms.horizonColor.value.set(horizon[0], horizon[1], horizon[2]);
    uniforms.glowColor.value.set(glow[0], glow[1], glow[2]);
    uniforms.falloffColor.value.set(falloff[0], falloff[1], falloff[2]);
    
    // Star visibility: fade in 8pm, peak midnight, fade out 6:15am
    const decimalHour = hours + minutes / 60;
    let starVis = 0;
    if (decimalHour >= 20) {
      starVis = Math.min(1, (decimalHour - 20) / 4);
    } else if (decimalHour <= 6.25) {
      starVis = Math.min(1, (6.25 - decimalHour) / 6.25);
    }
    uniforms.starVisibility.value = starVis;
    
    // Weather modifiers
    if (ext?.weatherCondition) {
      const modifier = getWeatherModifier(ext.weatherCondition);
      uniforms.weatherIntensity.value = modifier.intensity;
    }
    
    // External uniform updates
    if (ext) {
      if (ext.cloudCoverage !== undefined) uniforms.cloudCoverage.value = ext.cloudCoverage;
      if (ext.rainIntensity !== undefined) uniforms.rainIntensity.value = ext.rainIntensity;
      if (ext.isThunderstorm !== undefined) uniforms.isThunderstorm.value = ext.isThunderstorm ? 1 : 0;
      
      if (ext.sunVisible && ext.sunPosition) {
        uniforms.sunBrightness.value = ext.sunBrightness || 1;
        uniforms.sunPosition.value.set(ext.sunPosition.x, ext.sunPosition.y, 0);
      } else {
        uniforms.sunBrightness.value = 0;
      }
      
      if (ext.moonVisible && ext.moonPosition) {
        uniforms.moonIllumination.value = ext.moonIllumination || 50;
        uniforms.moonPosition.value.set(ext.moonPosition.x, ext.moonPosition.y, 0);
        uniforms.moonPhase.value = ext.moonPhase || 0.5;
      } else {
        uniforms.moonIllumination.value = 0;
      }
    }
    
    // Wave intensity based on weather
    if (ext?.weatherCondition?.toLowerCase().includes('storm')) {
      uniforms.waveIntensity.value = 0.15;
    } else if (ext?.weatherCondition?.toLowerCase().includes('rain')) {
      uniforms.waveIntensity.value = 0.08;
    } else {
      uniforms.waveIntensity.value = 0.05;
    }
  }

  let animationId: number;
  let externalUniformsRef = externalUniforms;

  function animate() {
    animationId = requestAnimationFrame(animate);
    uniforms.iTime.value += clock.getDelta();
    updateUniforms(externalUniformsRef);
    renderer.render(scene, camera);
  }

  animate();

  function handleResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.iRes.value.set(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", handleResize);

  // Return cleanup and update functions
  return {
    cleanup: () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      material.dispose();
      container.innerHTML = "";
    },
    updateWeather: (newUniforms: SkyOceanUniforms) => {
      externalUniformsRef = newUniforms;
    }
  };
}
