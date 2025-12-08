/**
 * WebSocket Status Indicator Component
 * Displays real-time WebSocket connection status with visual feedback
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export type WebSocketStatus = 'connected' | 'disconnected' | 'reconnecting';

interface WebSocketStatusIndicatorProps {
  status: WebSocketStatus;
  reconnectAttempts?: number;
  className?: string;
}

export const WebSocketStatusIndicator: React.FC<WebSocketStatusIndicatorProps> = ({
  status,
  reconnectAttempts = 0,
  className = '',
}) => {
  // Determine badge variant and icon based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          variant: 'default' as const,
          icon: <Wifi className="w-3 h-3" />,
          label: 'Connected',
          color: 'bg-green-500 hover:bg-green-600',
          tooltip: 'Real-time connection active',
        };
      case 'disconnected':
        return {
          variant: 'destructive' as const,
          icon: <WifiOff className="w-3 h-3" />,
          label: 'Offline',
          color: 'bg-red-500 hover:bg-red-600',
          tooltip: 'Connection lost. Using API polling fallback.',
        };
      case 'reconnecting':
        return {
          variant: 'secondary' as const,
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          label: 'Reconnecting',
          color: 'bg-yellow-500 hover:bg-yellow-600',
          tooltip: `Reconnecting... (Attempt ${reconnectAttempts})`,
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: <WifiOff className="w-3 h-3" />,
          label: 'Unknown',
          color: 'bg-gray-500',
          tooltip: 'Connection status unknown',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={`
              ${config.color}
              text-white
              cursor-help
              flex items-center gap-1.5
              px-2 py-1
              text-xs
              transition-all
              ${className}
            `}
          >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{config.tooltip}</p>
          {status === 'connected' && (
            <p className="text-xs text-muted-foreground mt-1">
              Messages update in real-time
            </p>
          )}
          {status === 'disconnected' && (
            <p className="text-xs text-muted-foreground mt-1">
              Will attempt to reconnect automatically
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WebSocketStatusIndicator;
