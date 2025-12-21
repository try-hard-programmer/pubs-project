import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useOrganization } from "./OrganizationContext";
import { env } from "@/config/env";
import { useDebugState, logContextAction } from "@/lib/debuggableContext";

/**
 * WebSocket Context
 * Provides global persistent WebSocket connection for real-time chat notifications
 */

// ============================================================================
// TYPES
// ============================================================================

export type WebSocketStatus = "connected" | "disconnected" | "reconnecting";

export interface WebSocketMessage {
  type: "connection_established" | "new_message" | "chat_update";
  timestamp: string;
  data?: any;
}

/**
 * Connection established notification
 */
export interface WebSocketConnectionEstablished extends WebSocketMessage {
  type: "connection_established";
  message: string;
  connection_count: number;
}

/**
 * New message notification from WebSocket
 */
export interface WebSocketNewMessage extends WebSocketMessage {
  type: "new_message";
  data: {
    chat_id: string;
    message_id: string;
    customer_id: string;
    customer_name: string;
    message_content: string;
    // FIX: Added fields to match Backend Update
    sender_name?: string;
    sender_type?: string;
    attachment?: {
      url: string;
      type: string;
      name: string;
    };
    channel:
      | "whatsapp"
      | "telegram"
      | "email"
      | "web"
      | "facebook"
      | "instagram";
    handled_by: "ai" | "human" | "unassigned";
    is_new_chat: boolean;
    was_reopened: boolean;
    assigned_agent_id?: string;
    ticket_id?: string;
  };
}

/**
 * Chat update notification (assignment, escalation, status change)
 */
export interface WebSocketChatUpdate extends WebSocketMessage {
  type: "chat_update";
  update_type?:
    | "assigned"
    | "escalated"
    | "status_changed"
    | "resolved"
    | "ticket_created";
  data: {
    chat_id: string;
    from_agent?: string;
    to_agent?: string;
    reason?: string;
    status?: "open" | "pending" | "assigned" | "resolved" | "closed";
    assigned_agent_id?: string;
    // Added specific fields for ticket creation
    ticket_id?: string;
    ticket_number?: string;
    priority?: string;
    [key: string]: any;
  };
}

/**
 * Union type for all WebSocket notifications
 */
export type WebSocketNotification =
  | WebSocketConnectionEstablished
  | WebSocketNewMessage
  | WebSocketChatUpdate;

/**
 * Callback function type for message subscribers
 */
export type MessageCallback = (notification: WebSocketNotification) => void;

/**
 * Unsubscribe function type
 */
export type UnsubscribeFunction = () => void;

interface WebSocketContextType {
  wsStatus: WebSocketStatus;
  reconnectAttempts: number;
  isConnected: boolean;
  subscribeToMessages: (callback: MessageCallback) => UnsubscribeFunction;
  unreadChatsCount: number;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  reconnect: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

// ============================================================================
// PROVIDER
// ============================================================================

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { user, session } = useAuth();
  const { currentOrganization } = useOrganization();

  // Extract primitive dependencies (prevent object reference issues)
  const organizationId = currentOrganization?.id;
  const accessToken = session?.access_token;

  // WebSocket connection state with debugging
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useDebugState<WebSocketStatus>(
    "WebSocket",
    "status",
    "disconnected"
  );
  const [wsReconnectAttempts, setWsReconnectAttempts] = useDebugState<number>(
    "WebSocket",
    "reconnectAttempts",
    0
  );
  const [unreadChatsCount, setUnreadChatsCount] = useDebugState<number>(
    "WebSocket",
    "unreadCount",
    0
  );
  const [reconnectTrigger, setReconnectTrigger] = useState(0); // Trigger for reconnection (internal only)

  // Refs for managing subscriptions and reconnection
  const wsReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsReconnectAttemptsRef = useRef(0); // Internal tracking (doesn't trigger re-render)
  const isCleaningUpRef = useRef(false); // Prevent reconnection during cleanup
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const subscribersRef = useRef<Set<MessageCallback>>(new Set());

  // ============================================================================
  // PUB/SUB PATTERN
  // ============================================================================

  /**
   * Subscribe to WebSocket messages
   * Returns unsubscribe function
   */
  const subscribeToMessages = useCallback(
    (callback: MessageCallback): UnsubscribeFunction => {
      console.log("📡 New subscriber added to WebSocket messages");
      subscribersRef.current.add(callback);
      logContextAction("WebSocket", "SUBSCRIBER_ADDED", {
        count: subscribersRef.current.size,
      });

      // Return unsubscribe function
      return () => {
        console.log("📡 Subscriber removed from WebSocket messages");
        subscribersRef.current.delete(callback);
        logContextAction("WebSocket", "SUBSCRIBER_REMOVED", {
          count: subscribersRef.current.size,
        });
      };
    },
    []
  );

  /**
   * Broadcast message to all subscribers
   */
  const broadcastMessage = useCallback(
    (notification: WebSocketNotification) => {
      console.log(
        `📢 Broadcasting message to ${subscribersRef.current.size} subscriber(s):`,
        notification.type
      );

      subscribersRef.current.forEach((callback) => {
        try {
          callback(notification);
        } catch (error) {
          console.error("❌ Error in subscriber callback:", error);
        }
      });
    },
    []
  );

  // ============================================================================
  // MESSAGE DEDUPLICATION
  // ============================================================================

  /**
   * Check if message has already been processed
   */
  const isMessageProcessed = useCallback((messageId: string): boolean => {
    return processedMessageIdsRef.current.has(messageId);
  }, []);

  /**
   * Mark message as processed
   * Implements LRU-like behavior to prevent memory leaks
   */
  const markMessageProcessed = useCallback((messageId: string) => {
    const processed = processedMessageIdsRef.current;

    // Limit set size to prevent memory leaks (keep last 1000 message IDs)
    if (processed.size >= 1000) {
      const firstItem = processed.values().next().value;
      processed.delete(firstItem);
    }

    processed.add(messageId);
  }, []);

  // ============================================================================
  // UNREAD COUNT MANAGEMENT
  // ============================================================================

  const incrementUnreadCount = useCallback(() => {
    setUnreadChatsCount((prev) => prev + 1);
  }, []);

  const decrementUnreadCount = useCallback(() => {
    setUnreadChatsCount((prev) => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadChatsCount(0);
  }, []);

  // ============================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Manual reconnect trigger
   */
  const reconnect = useCallback(() => {
    console.log("🔄 Manual reconnect triggered");
    wsReconnectAttemptsRef.current += 1;
    setWsReconnectAttempts(wsReconnectAttemptsRef.current);
    setReconnectTrigger((prev) => prev + 1);
  }, []);

  /**
   * Main WebSocket connection effect
   */
  useEffect(() => {
    // Reset cleanup flag when starting new connection attempt
    isCleaningUpRef.current = false;

    // Wait for authentication and organization
    if (!user || !accessToken || !organizationId) {
      console.log(
        "⏸️ WebSocket: Waiting for authentication and organization...",
        {
          hasUser: !!user,
          hasToken: !!accessToken,
          hasOrgId: !!organizationId,
        }
      );
      setWsStatus("disconnected");
      return;
    }

    console.log("🔌 Initializing WebSocket connection...", {
      organizationId,
      attempt: wsReconnectAttemptsRef.current + 1,
    });

    setWsStatus("reconnecting");

    try {
      // Construct WebSocket URL
      const wsUrl = env.agentApiUrl
        .replace("https://", "wss://")
        .replace("http://", "ws://");
      const token = accessToken;
      const wsEndpoint = `${wsUrl}/ws/${organizationId}?token=${token}`;

      console.log(
        "🔌 Connecting to WebSocket:",
        wsEndpoint.replace(/token=[^&]+/, "token=***")
      );

      const ws = new WebSocket(wsEndpoint);

      // Connection opened
      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setWsStatus("connected");
        wsReconnectAttemptsRef.current = 0; // Reset internal counter
        setWsReconnectAttempts(0); // Reset display counter
        setWsConnection(ws);
        logContextAction("WebSocket", "CONNECTION_OPENED", { organizationId });
      };

      // Receive messages
      ws.onmessage = (event) => {
        try {
          const notification: WebSocketNotification = JSON.parse(event.data);

          // Defensive: Only handle message if connection is still active
          if (ws.readyState !== WebSocket.OPEN) {
            return;
          }

          console.log("📨 WebSocket message received:", notification.type);

          // Handle connection_established separately (no deduplication needed)
          if (notification.type === "connection_established") {
            console.log(
              "✅ WebSocket connection established:",
              notification.message
            );
            broadcastMessage(notification);
            return;
          }

          // Deduplication for other message types
          let messageId: string | undefined;

          if (notification.type === "new_message") {
            messageId = notification.data.message_id;
          } else if (notification.type === "chat_update") {
            // Create unique ID for chat updates
            messageId = `${notification.type}_${notification.data.chat_id}_${notification.timestamp}`;
          }

          if (messageId) {
            if (isMessageProcessed(messageId)) {
              console.log("⏭️ Skipping duplicate message:", messageId);
              return;
            }
            markMessageProcessed(messageId);
          }

          // Broadcast to all subscribers
          broadcastMessage(notification);
          logContextAction("WebSocket", "MESSAGE_RECEIVED", {
            type: notification.type,
            subscriberCount: subscribersRef.current.size,
          });
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
        }
      };

      // Connection error
      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setWsStatus("disconnected");
      };

      // Connection closed
      ws.onclose = (event) => {
        console.log("🔌 WebSocket disconnected:", event.code, event.reason);
        setWsStatus("disconnected");
        setWsConnection(null);
        logContextAction("WebSocket", "CONNECTION_CLOSED", {
          code: event.code,
          reason: event.reason,
        });

        // Don't reconnect if this was an intentional cleanup
        if (isCleaningUpRef.current) {
          console.log(
            "⏸️ WebSocket: Cleanup in progress, skipping auto-reconnect"
          );
          logContextAction("WebSocket", "CLEANUP_SKIP_RECONNECT", null);
          return;
        }

        // Auto-reconnect with exponential backoff (unless user logged out)
        if (user && accessToken && organizationId) {
          const MAX_RECONNECT_ATTEMPTS = 10;
          const currentAttempt = wsReconnectAttemptsRef.current;

          // Check max reconnection limit
          if (currentAttempt >= MAX_RECONNECT_ATTEMPTS) {
            console.error(
              "❌ Maximum reconnection attempts reached. Please refresh the page or check your connection."
            );
            setWsStatus("disconnected");
            return;
          }

          const delay = Math.min(1000 * Math.pow(2, currentAttempt), 30000);
          console.log(
            `🔄 Will attempt reconnect in ${delay / 1000}s (attempt ${
              currentAttempt + 1
            })`
          );

          wsReconnectTimeoutRef.current = setTimeout(() => {
            // Double-check cleanup flag before triggering reconnect
            if (!isCleaningUpRef.current) {
              wsReconnectAttemptsRef.current += 1;
              setWsReconnectAttempts(wsReconnectAttemptsRef.current); // Update display
              setReconnectTrigger((prev) => prev + 1); // Trigger reconnection
            } else {
              console.log(
                "⏸️ WebSocket: Cleanup detected in timeout, aborting reconnect"
              );
            }
          }, delay);
        } else {
          console.log(
            "⏸️ WebSocket: Not reconnecting (user logged out or missing credentials)"
          );
        }
      };

      // // Cleanup function
      // return () => {
      //   console.log('🧹 Cleaning up WebSocket connection');
      //
      //   // Set cleanup flag to prevent reconnection attempts
      //   isCleaningUpRef.current = true;
      //
      //   // Clear reconnection timeout
      //   if (wsReconnectTimeoutRef.current) {
      //     clearTimeout(wsReconnectTimeoutRef.current);
      //     wsReconnectTimeoutRef.current = null;
      //   }
      //
      //   // Close WebSocket connection
      //   try {
      //     if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
      //       ws.close(1000, 'Component cleanup or dependency change');
      //     }
      //   } catch (error) {
      //     console.error('❌ Error closing WebSocket during cleanup:', error);
      //   }
      // };

      // return () => {}
    } catch (error) {
      console.error("❌ Failed to initialize WebSocket:", error);
      setWsStatus("disconnected");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, organizationId, reconnectTrigger]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: WebSocketContextType = {
    wsStatus,
    reconnectAttempts: wsReconnectAttempts,
    isConnected: wsStatus === "connected",
    subscribeToMessages,
    unreadChatsCount,
    incrementUnreadCount,
    decrementUnreadCount,
    resetUnreadCount,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
