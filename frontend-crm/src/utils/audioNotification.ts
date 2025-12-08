/**
 * Audio Notification Utility
 * Handles playing notification sounds for real-time events
 */

type NotificationSoundType = 'message' | 'alert';

// Track if audio has been enabled by user interaction
let audioEnabled = false;
let audioContext: AudioContext | null = null;

/**
 * Initialize audio context on user interaction
 * Call this on any user click/touch event to enable audio
 */
export const enableAudioNotifications = (): void => {
  if (audioEnabled) return;

  try {
    // Create AudioContext to unlock audio playback
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      audioContext = new (AudioContext || (window as any).webkitAudioContext)();
    }

    // Play silent sound to unlock audio
    const silentAudio = new Audio();
    silentAudio.volume = 0;
    silentAudio.play().then(() => {
      audioEnabled = true;
      console.log('🔊 Audio notifications enabled');
    }).catch(() => {
      console.warn('⚠️ Could not enable audio notifications - user interaction required');
    });
  } catch (error) {
    console.warn('⚠️ Failed to initialize audio context:', error);
  }
};

/**
 * Play a notification sound
 * @param type - Type of notification sound to play
 * @param volume - Volume level (0.0 to 1.0), default 0.5
 */
export const playNotificationSound = (
  type: NotificationSoundType = 'message',
  volume: number = 0.5
): void => {
  try {
    const soundPath = `/sounds/${type === 'message' ? 'notification.mp3' : 'alert.mp3'}`;
    console.log('🔊 Attempting to play sound:', soundPath, { audioEnabled, volume });

    const audio = new Audio(soundPath);
    audio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1

    // Play audio and handle potential errors
    audio.play()
      .then(() => {
        console.log('✅ Notification sound played successfully');
      })
      .catch((error) => {
        console.warn('❌ Failed to play notification sound:', error.message);

        // If audio is blocked, try to enable it
        if (error.name === 'NotAllowedError' && !audioEnabled) {
          console.log('💡 Audio blocked by browser. User interaction required to enable audio.');
        }
      });
  } catch (error) {
    console.warn('❌ Error creating audio notification:', error);
  }
};

/**
 * Check if audio notifications are supported in current browser
 */
export const isAudioSupported = (): boolean => {
  try {
    return typeof Audio !== 'undefined';
  } catch {
    return false;
  }
};

/**
 * Check if audio has been enabled by user interaction
 */
export const isAudioEnabled = (): boolean => {
  return audioEnabled;
};

/**
 * Check browser notification permission status
 */
export const getBrowserNotificationPermission = (): NotificationPermission => {
  if (typeof Notification === 'undefined') {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Check if browser notifications are supported
 */
export const isBrowserNotificationSupported = (): boolean => {
  return typeof Notification !== 'undefined';
};

/**
 * Preload notification sounds to reduce latency
 * Call this on app initialization or when user enables notifications
 */
export const preloadNotificationSounds = (): void => {
  if (!isAudioSupported()) return;

  try {
    // Preload message notification
    const messageAudio = new Audio('/sounds/notification.mp3');
    messageAudio.load();

    // Preload alert sound if exists
    const alertAudio = new Audio('/sounds/alert.mp3');
    alertAudio.load();
  } catch (error) {
    console.warn('Failed to preload notification sounds:', error);
  }
};
