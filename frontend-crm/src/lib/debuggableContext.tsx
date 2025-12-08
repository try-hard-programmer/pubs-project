/**
 * Debuggable Context Utilities
 * Enhanced React hooks with automatic state logging to Redux DevTools
 *
 * Usage:
 * Replace standard useState with useDebugState in your Context components
 *
 * Example:
 * // Before:
 * const [user, setUser] = useState<User | null>(null);
 *
 * // After:
 * const [user, setUser] = useDebugState<User | null>('Auth', 'user', null);
 */

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { contextDebugger } from './contextDebugger';

/**
 * Enhanced useState with automatic logging to Redux DevTools
 *
 * @param contextName - Name of the context (e.g., "Auth", "Organization", "WebSocket")
 * @param stateName - Name of the state variable (e.g., "user", "loading", "status")
 * @param initialValue - Initial value or initializer function
 * @returns Tuple of [state, setState] compatible with useState
 */
export function useDebugState<T>(
  contextName: string,
  stateName: string,
  initialValue: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);

  // Log initial state only once
  useEffect(() => {
    if (contextDebugger.enabled) {
      contextDebugger.logInit(`${contextName}.${stateName}`, state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - only run on mount

  // Wrapped setter with logging
  const setStateWithLog: Dispatch<SetStateAction<T>> = (value) => {
    setState((prev) => {
      const newState = value instanceof Function ? value(prev) : value;

      // Only log if state actually changed
      if (contextDebugger.enabled && newState !== prev) {
        contextDebugger.logUpdate(
          contextName,
          `SET_${stateName.toUpperCase()}`,
          newState
        );
      }

      return newState;
    });
  };

  return [state, setStateWithLog];
}

/**
 * Log a custom action without changing state
 * Useful for logging side effects, API calls, etc.
 *
 * @param contextName - Name of the context
 * @param action - Action description
 * @param payload - Optional payload data
 */
export function logContextAction(
  contextName: string,
  action: string,
  payload?: any
) {
  if (contextDebugger.enabled) {
    contextDebugger.logUpdate(contextName, action, payload);
  }
}

/**
 * Log an error in context
 *
 * @param contextName - Name of the context
 * @param error - Error object or message
 */
export function logContextError(contextName: string, error: any) {
  if (contextDebugger.enabled) {
    contextDebugger.logError(contextName, error);
  }
}
