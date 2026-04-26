// Live background luminance sampler.
// Posts a request to the skyview iframe; the iframe samples its current canvas
// and replies with an average brightness value. Falls back to a 24h cosine when
// the iframe doesn't reply (cross-origin or not loaded yet).

let cachedLuminance = 0.4;
let lastSample = 0;
let listenerAttached = false;

const cosineFallback = (): number => {
  // Maldives time approximation
  const now = new Date();
  const mtMs = now.getTime() + (5 * 60 - now.getTimezoneOffset()) * 60_000;
  const hours = (new Date(mtMs).getUTCHours() + new Date(mtMs).getUTCMinutes() / 60) % 24;
  // Brightest at noon (hours=12) -> 1, darkest at midnight -> 0
  return 0.5 - 0.5 * Math.cos((hours / 24) * Math.PI * 2);
};

const attachListener = () => {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;
  window.addEventListener('message', (event) => {
    const data = event?.data;
    if (data && data.type === 'luminance' && typeof data.value === 'number') {
      // EMA smoothing so adaptive doesn't flicker
      const v = Math.max(0, Math.min(1, data.value));
      cachedLuminance = cachedLuminance * 0.8 + v * 0.2;
      lastSample = Date.now();
    }
  });
};

export const requestLuminanceSample = () => {
  attachListener();
  try {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[data-skyview]');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'sample-luminance' }, '*');
    }
  } catch {
    /* cross-origin -> rely on fallback */
  }
};

export const getLuminance = (): number => {
  // If we haven't received a sample in 30s, blend toward cosine fallback
  if (Date.now() - lastSample > 30_000) {
    cachedLuminance = cachedLuminance * 0.5 + cosineFallback() * 0.5;
  }
  return cachedLuminance;
};

// Convenience: start a polling loop from a single place
export const startLuminanceLoop = (intervalMs = 30_000) => {
  attachListener();
  requestLuminanceSample();
  const id = window.setInterval(requestLuminanceSample, intervalMs);
  return () => window.clearInterval(id);
};
