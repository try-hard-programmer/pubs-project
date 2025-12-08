import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare, UserCircle } from 'lucide-react';
import { useWebSocket, WebSocketNotification, WebSocketNewMessage, WebSocketChatUpdate } from '@/contexts/WebSocketContext';
import { useNotificationPreferences } from '@/contexts/NotificationPreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/utils/audioNotification';

/**
 * GlobalChatNotifications Component
 *
 * Handles real-time chat notifications across the entire application.
 * Shows toast and browser notifications when not on /crm page.
 * Allows users to click notifications to navigate to the chat.
 */
export const GlobalChatNotifications = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribeToMessages, incrementUnreadCount } = useWebSocket();
  const { preferences, browserNotificationPermission } = useNotificationPreferences();

  // Track currently shown browser notifications to close them when clicked
  const browserNotificationsRef = useRef<Map<string, Notification>>(new Map());

  /**
   * Check if user is currently on CRM page
   */
  const isOnCRMPage = (): boolean => {
    return location.pathname === '/crm' || location.hash === '#/crm';
  };

  /**
   * Show browser notification
   */
  const showBrowserNotification = (title: string, body: string, chatId: string) => {
    if (!preferences.enableBrowserNotification) return;
    if (browserNotificationPermission !== 'granted') return;
    if (typeof Notification === 'undefined') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `chat-${chatId}`, // Prevent duplicate notifications for same chat
        requireInteraction: false,
        silent: !preferences.enableSound, // Use system sound only if sound enabled
      });

      // Store notification reference
      browserNotificationsRef.current.set(chatId, notification);

      // Handle click - navigate to CRM with chat opened
      notification.onclick = () => {
        console.log('🖱️ Browser notification clicked, navigating to chat:', chatId);
        navigate('/crm', { state: { openChatId: chatId } });
        notification.close();
        browserNotificationsRef.current.delete(chatId);
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
        browserNotificationsRef.current.delete(chatId);
      }, 10000);

    } catch (error) {
      console.warn('⚠️ Failed to show browser notification:', error);
    }
  };

  /**
   * Show toast notification
   */
  const showToastNotification = (
    title: string,
    message: string,
    chatId: string,
    icon: React.ReactNode
  ) => {
    if (!preferences.enableToast) return;

    toast.info(
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{message}</div>
        </div>
      </div>,
      {
        action: {
          label: 'View Chat',
          onClick: () => {
            console.log('🖱️ Toast notification clicked, navigating to chat:', chatId);
            navigate('/crm', { state: { openChatId: chatId } });
          },
        },
        duration: 5000,
      }
    );
  };

  /**
   * Handle new message notification
   */
  const handleNewMessageNotification = (notification: WebSocketNewMessage) => {
    const { data } = notification;
    const {
      chat_id,
      customer_name,
      message_content,
      handled_by,
      assigned_agent_id,
    } = data;

    // Skip if user is on CRM page (CustomerService will handle it)
    if (isOnCRMPage()) {
      console.log('⏭️ Skipping notification - user is on CRM page');
      return;
    }

    // Filter: Only show if assigned to current user (if preference enabled)
    if (preferences.filterAssignedOnly) {
      if (!assigned_agent_id || assigned_agent_id !== user?.id) {
        console.log('⏭️ Skipping notification - chat not assigned to current user');
        return;
      }
    }

    // Don't notify for messages sent by current user (AI or human agent)
    if (handled_by === 'human' && assigned_agent_id === user?.id) {
      console.log('⏭️ Skipping notification - message from current user');
      return;
    }

    console.log('🔔 Showing notification for new message from:', customer_name);

    // Increment unread count
    incrementUnreadCount();

    // Show toast notification
    showToastNotification(
      `New message from ${customer_name}`,
      message_content,
      chat_id,
      <MessageSquare className="h-5 w-5 text-blue-500" />
    );

    // Show browser notification
    showBrowserNotification(
      `New message from ${customer_name}`,
      message_content,
      chat_id
    );

    // Play sound notification
    if (preferences.enableSound) {
      playNotificationSound('message', 0.5);
    }
  };

  /**
   * Handle chat update notification (assignment, escalation, etc.)
   */
  const handleChatUpdateNotification = (notification: WebSocketChatUpdate) => {
    const { data, update_type } = notification;
    const { chat_id, to_agent, reason, status, assigned_agent_id } = data;

    // Skip if user is on CRM page
    if (isOnCRMPage()) {
      return;
    }

    // Only show notifications for important updates (assigned to me or escalated to me)
    if (update_type === 'assigned' && to_agent === user?.id) {
      console.log('🔔 Showing notification for chat assignment');

      showToastNotification(
        'New Chat Assigned',
        `A chat has been assigned to you${reason ? `: ${reason}` : ''}`,
        chat_id,
        <UserCircle className="h-5 w-5 text-green-500" />
      );

      showBrowserNotification(
        'New Chat Assigned',
        `A chat has been assigned to you${reason ? `: ${reason}` : ''}`,
        chat_id
      );

      if (preferences.enableSound) {
        playNotificationSound('alert', 0.6);
      }

      incrementUnreadCount();
    } else if (update_type === 'escalated' && to_agent === user?.id) {
      console.log('🔔 Showing notification for chat escalation');

      showToastNotification(
        'Chat Escalated to You',
        `A chat has been escalated to you${reason ? `: ${reason}` : ''}`,
        chat_id,
        <UserCircle className="h-5 w-5 text-orange-500" />
      );

      showBrowserNotification(
        'Chat Escalated',
        `A chat has been escalated to you${reason ? `: ${reason}` : ''}`,
        chat_id
      );

      if (preferences.enableSound) {
        playNotificationSound('alert', 0.6);
      }

      incrementUnreadCount();
    }
    // For other update types (status_changed, resolved), we don't show notifications
    // unless user wants to be notified for all updates
  };

  /**
   * Handle all WebSocket messages
   */
  const handleWebSocketMessage = (notification: WebSocketNotification) => {
    switch (notification.type) {
      case 'connection_established':
        console.log('✅ WebSocket connection established (global handler)');
        // No user notification needed
        break;

      case 'new_message':
        handleNewMessageNotification(notification);
        break;

      case 'chat_update':
        handleChatUpdateNotification(notification);
        break;

      default:
        console.warn('⚠️ Unknown notification type:', (notification as any).type);
    }
  };

  /**
   * Subscribe to WebSocket messages
   */
  useEffect(() => {
    console.log('📡 GlobalChatNotifications: Subscribing to WebSocket messages');

    const unsubscribe = subscribeToMessages(handleWebSocketMessage);

    return () => {
      console.log('📡 GlobalChatNotifications: Unsubscribing from WebSocket messages');
      unsubscribe();

      // Close all active browser notifications
      browserNotificationsRef.current.forEach((notification) => {
        notification.close();
      });
      browserNotificationsRef.current.clear();
    };
  }, [subscribeToMessages, preferences, user?.id, navigate, incrementUnreadCount]);

  // This component doesn't render anything
  return null;
};
