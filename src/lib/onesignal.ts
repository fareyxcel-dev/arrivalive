// OneSignal Web SDK integration for PWA push notifications

const ONESIGNAL_APP_ID = "86275d4b-ecc9-408f-8bf8-256243e254c6";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

// Initialize OneSignal SDK
export const initOneSignal = (): Promise<void> => {
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: "web.onesignal.auto.47d572d6-ef9d-4d9d-8962-815db43f4beb",
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false,
                text: {
                  actionMessage: "Get notified about flight status changes",
                  acceptButton: "Allow",
                  cancelButton: "Maybe Later",
                },
              },
            ],
          },
        },
        welcomeNotification: {
          disable: true,
        },
      });
      resolve();
    });
  });
};

// Load OneSignal SDK script
export const loadOneSignalScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.OneSignal) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => {
      initOneSignal().then(resolve);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    await loadOneSignalScript();
    
    if (!window.OneSignal) {
      console.error("OneSignal not loaded");
      return false;
    }

    const permission = await window.OneSignal.Notifications.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Get OneSignal player ID for current user
export const getPlayerId = async (): Promise<string | null> => {
  try {
    await loadOneSignalScript();
    
    if (!window.OneSignal) {
      return null;
    }

    const playerId = await window.OneSignal.User.PushSubscription.id;
    return playerId || null;
  } catch (error) {
    console.error("Error getting player ID:", error);
    return null;
  }
};

// Subscribe user to push notifications and get player ID
export const subscribeToNotifications = async (): Promise<string | null> => {
  try {
    const permitted = await requestNotificationPermission();
    
    if (!permitted) {
      return null;
    }

    // Wait a moment for subscription to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const playerId = await getPlayerId();
    return playerId;
  } catch (error) {
    console.error("Error subscribing to notifications:", error);
    return null;
  }
};

// Check if user is subscribed
export const isSubscribed = async (): Promise<boolean> => {
  try {
    await loadOneSignalScript();
    
    if (!window.OneSignal) {
      return false;
    }

    const isPushEnabled = await window.OneSignal.User.PushSubscription.optedIn;
    return isPushEnabled || false;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
};

// Set external user ID for targeting
export const setExternalUserId = async (userId: string): Promise<void> => {
  try {
    await loadOneSignalScript();
    
    if (!window.OneSignal) {
      return;
    }

    await window.OneSignal.login(userId);
  } catch (error) {
    console.error("Error setting external user ID:", error);
  }
};

// Add tag for flight subscription
export const addFlightTag = async (flightId: string, flightDate: string): Promise<void> => {
  try {
    await loadOneSignalScript();
    
    if (!window.OneSignal) {
      return;
    }

    await window.OneSignal.User.addTag(`flight_${flightId}_${flightDate}`, "subscribed");
  } catch (error) {
    console.error("Error adding flight tag:", error);
  }
};

// Remove tag for flight subscription
export const removeFlightTag = async (flightId: string, flightDate: string): Promise<void> => {
  try {
    await loadOneSignalScript();
    
    if (!window.OneSignal) {
      return;
    }

    await window.OneSignal.User.removeTag(`flight_${flightId}_${flightDate}`);
  } catch (error) {
    console.error("Error removing flight tag:", error);
  }
};
