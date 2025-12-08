import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Notification Preferences Context
 * Manages user preferences for chat notifications across the application
 */

export interface NotificationPreferences {
  enableToast: boolean;
  enableBrowserNotification: boolean;
  enableSound: boolean;
  filterAssignedOnly: boolean;
}

interface NotificationPreferencesContextType {
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  requestBrowserNotificationPermission: () => Promise<NotificationPermission>;
  browserNotificationPermission: NotificationPermission;
  resetToDefaults: () => void;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enableToast: true,
  enableBrowserNotification: true,
  enableSound: true,
  filterAssignedOnly: true, // By default, only show notifications for assigned chats
};

const STORAGE_KEY = 'syntra_notification_preferences';

const NotificationPreferencesContext = createContext<NotificationPreferencesContextType | undefined>(undefined);

export const useNotificationPreferences = () => {
  const context = useContext(NotificationPreferencesContext);
  if (context === undefined) {
    throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
  }
  return context;
};

interface NotificationPreferencesProviderProps {
  children: ReactNode;
}

export const NotificationPreferencesProvider: React.FC<NotificationPreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    // Load preferences from localStorage on initialization
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📋 Loaded notification preferences from localStorage:', parsed);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.warn('⚠️ Failed to load notification preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  });

  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof Notification !== 'undefined') {
      return Notification.permission;
    }
    return 'default';
  });

  // Persist preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      console.log('💾 Saved notification preferences to localStorage:', preferences);
    } catch (error) {
      console.warn('⚠️ Failed to save notification preferences:', error);
    }
  }, [preferences]);

  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...updates };
      console.log('🔄 Updated notification preferences:', updated);
      return updated;
    });
  };

  const requestBrowserNotificationPermission = async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') {
      console.warn('⚠️ Browser notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserNotificationPermission(permission);
      console.log('🔔 Browser notification permission:', permission);

      // If permission granted, enable browser notifications in preferences
      if (permission === 'granted') {
        updatePreferences({ enableBrowserNotification: true });
      } else if (permission === 'denied') {
        updatePreferences({ enableBrowserNotification: false });
      }

      return permission;
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return 'denied';
    }
  };

  const resetToDefaults = () => {
    console.log('🔄 Resetting notification preferences to defaults');
    setPreferences(DEFAULT_PREFERENCES);
  };

  const value: NotificationPreferencesContextType = {
    preferences,
    updatePreferences,
    requestBrowserNotificationPermission,
    browserNotificationPermission,
    resetToDefaults,
  };

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
};
