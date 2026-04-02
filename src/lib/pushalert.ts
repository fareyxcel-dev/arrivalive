// PushAlert Web Push SDK integration
// Public website integration key - safe for client-side use

const PUSHALERT_API_KEY = '770494a54b29b2cc5b086ceecc33b7a3';

declare global {
  interface Window {
    PushAlertCo?: any;
    pushalertbyiw?: any;
  }
}

// Load PushAlert SDK script
export const loadPushAlertScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.PushAlertCo) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://pushalert.co/integrate_${PUSHALERT_API_KEY}.js`;
    script.async = true;
    script.onload = () => {
      // Wait for PushAlert to initialize
      const checkReady = setInterval(() => {
        if (window.PushAlertCo || window.pushalertbyiw) {
          clearInterval(checkReady);
          resolve();
        }
      }, 200);
      // Timeout after 10s
      setTimeout(() => {
        clearInterval(checkReady);
        resolve(); // resolve anyway, subscription will fail gracefully
      }, 10000);
    };
    script.onerror = () => {
      console.warn('PushAlert script failed to load');
      reject(new Error('PushAlert script failed to load'));
    };
    document.head.appendChild(script);
  });
};

// Request notification permission and subscribe via PushAlert
export const subscribeToNotifications = async (): Promise<string | null> => {
  try {
    await loadPushAlertScript();

    // Request browser notification permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }
    }

    // Try to get PushAlert subscriber ID
    const pa = window.PushAlertCo || window.pushalertbyiw;
    if (pa && typeof pa.getSubsId === 'function') {
      const subsId = pa.getSubsId();
      if (subsId) return subsId;
    }

    // Fallback: wait for subscription to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (pa && typeof pa.getSubsId === 'function') {
      return pa.getSubsId() || null;
    }

    return null;
  } catch (error) {
    console.error('PushAlert subscription error:', error);
    return null;
  }
};

// Set external user attributes
export const setExternalUserId = async (userId: string): Promise<void> => {
  try {
    const pa = window.PushAlertCo || window.pushalertbyiw;
    if (pa && typeof pa.addAttributes === 'function') {
      pa.addAttributes({ user_id: userId });
    }
  } catch (error) {
    console.error('Error setting PushAlert user ID:', error);
  }
};

// Add segment/tag for flight subscription
export const addFlightTag = async (flightId: string, flightDate: string): Promise<void> => {
  try {
    const pa = window.PushAlertCo || window.pushalertbyiw;
    if (pa && typeof pa.addAttributes === 'function') {
      pa.addAttributes({ [`flight_${flightId}_${flightDate}`]: 'subscribed' });
    }
  } catch (error) {
    console.error('Error adding PushAlert flight tag:', error);
  }
};

// Remove flight tag
export const removeFlightTag = async (flightId: string, flightDate: string): Promise<void> => {
  try {
    const pa = window.PushAlertCo || window.pushalertbyiw;
    if (pa && typeof pa.removeAttributes === 'function') {
      pa.removeAttributes([`flight_${flightId}_${flightDate}`]);
    } else if (pa && typeof pa.addAttributes === 'function') {
      pa.addAttributes({ [`flight_${flightId}_${flightDate}`]: '' });
    }
  } catch (error) {
    console.error('Error removing PushAlert flight tag:', error);
  }
};

// Check if user is subscribed
export const isSubscribed = async (): Promise<boolean> => {
  try {
    const pa = window.PushAlertCo || window.pushalertbyiw;
    if (pa && typeof pa.getSubsId === 'function') {
      return !!pa.getSubsId();
    }
    return false;
  } catch {
    return false;
  }
};
