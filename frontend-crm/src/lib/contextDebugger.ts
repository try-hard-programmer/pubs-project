/**
 * Context Debugger Middleware
 * Integrates React Context with Redux DevTools Extension for state tracking
 *
 * Usage:
 * - Automatically connects to Redux DevTools Extension (if installed)
 * - Logs all context state changes with timestamps
 * - Provides time-travel debugging capability
 * - Development mode only - zero production overhead
 */

type DevToolsExtension = {
  connect: (options?: any) => DevToolsConnection;
};

type DevToolsConnection = {
  init: (state: any) => void;
  send: (action: { type: string; payload?: any }, state: any) => void;
  subscribe: (listener: (message: any) => void) => () => void;
};

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: DevToolsExtension;
  }
}

class ContextDebugger {
  private devTools: DevToolsConnection | null = null;
  private state: Record<string, any> = {};
  private isEnabled: boolean;

  constructor() {
    // Only enable in development mode
    this.isEnabled = import.meta.env.DEV;

    if (this.isEnabled && typeof window !== 'undefined') {
      const extension = window.__REDUX_DEVTOOLS_EXTENSION__;

      if (extension) {
        this.devTools = extension.connect({
          name: 'Syntra Context State',
          features: {
            pause: true,    // Allow pausing state updates
            export: true,   // Allow exporting state
            import: true,   // Allow importing state
            jump: true,     // Allow jumping to specific state
            skip: true,     // Allow skipping actions
          },
          trace: true,      // Include stack trace
          traceLimit: 25,   // Limit stack trace to 25 frames
        });

        this.devTools.init(this.state);
        console.log('✅ Context Debugger connected to Redux DevTools');
        console.log('💡 Open Redux DevTools Extension to see context state changes');
      } else {
        console.warn('⚠️  Redux DevTools Extension not found.');
        console.warn('📥 Install it from: https://github.com/reduxjs/redux-devtools');
      }
    }
  }

  /**
   * Log a state update
   * @param contextName - Name of the context (e.g., "Auth", "Organization")
   * @param action - Action description (e.g., "SET_USER", "UPDATE_STATUS")
   * @param newState - New state value
   */
  logUpdate(contextName: string, action: string, newState: any) {
    if (!this.isEnabled || !this.devTools) return;

    // Update internal state
    this.state[contextName] = newState;

    // Send to DevTools with timestamp
    this.devTools.send(
      {
        type: `${contextName}/${action}`,
        payload: newState,
      },
      this.state
    );

    // Console log in development for quick reference
    console.log(`🔄 [${contextName}] ${action}:`, newState);
  }

  /**
   * Log an initial state
   * @param contextName - Name of the context
   * @param initialState - Initial state value
   */
  logInit(contextName: string, initialState: any) {
    if (!this.isEnabled || !this.devTools) return;

    this.state[contextName] = initialState;
    this.devTools.send(
      {
        type: `${contextName}/INIT`,
        payload: initialState,
      },
      this.state
    );

    console.log(`🎬 [${contextName}] Initialized:`, initialState);
  }

  /**
   * Log an error
   * @param contextName - Name of the context
   * @param error - Error object or message
   */
  logError(contextName: string, error: any) {
    if (!this.isEnabled) return;

    const errorPayload = {
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    };

    if (this.devTools) {
      this.devTools.send(
        {
          type: `${contextName}/ERROR`,
          payload: errorPayload,
        },
        this.state
      );
    }

    console.error(`❌ [${contextName}] Error:`, errorPayload);
  }

  /**
   * Check if debugger is enabled
   */
  get enabled(): boolean {
    return this.isEnabled && this.devTools !== null;
  }
}

// Singleton instance - shared across all contexts
export const contextDebugger = new ContextDebugger();
