
import { checkSupabaseConnection } from '@/integrations/supabase/client';

interface ConnectionStatus {
  isConnected: boolean;
  latency?: number;
  lastCheck: Date;
  error?: string;
}

class ConnectionMonitor {
  private status: ConnectionStatus = {
    isConnected: true, // Default to true to avoid false offline messages
    lastCheck: new Date(),
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(status: ConnectionStatus) => void> = [];
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES_BEFORE_OFFLINE = 3; // Require 3 consecutive failures before marking offline

  constructor() {
    // Don't check immediately on construction to avoid startup false positives
  }

  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const result = await checkSupabaseConnection();
      
      if (result.healthy) {
        // Connection successful - reset failure counter
        this.consecutiveFailures = 0;
        this.status = {
          isConnected: true,
          latency: result.latency,
          lastCheck: new Date(),
          error: undefined,
        };
      } else {
        // Connection failed - increment failure counter
        this.consecutiveFailures++;
        
        // Only mark as offline after multiple consecutive failures
        if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_OFFLINE) {
          console.warn(`Connection check failed ${this.consecutiveFailures} times, marking as offline`);
          this.status = {
            isConnected: false,
            lastCheck: new Date(),
            error: result.error,
          };
        } else {
          console.log(`Connection check failed (${this.consecutiveFailures}/${this.MAX_FAILURES_BEFORE_OFFLINE}), keeping online status`);
          // Keep previous status but update last check time
          this.status = {
            ...this.status,
            lastCheck: new Date(),
          };
        }
      }
      
      this.notifyListeners();
      return this.status;
    } catch (error) {
      console.error('Connection check exception:', error);
      this.consecutiveFailures++;
      
      // Only mark as offline after multiple consecutive failures
      if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_OFFLINE) {
        this.status = {
          isConnected: false,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } else {
        // Keep previous status but update last check time
        this.status = {
          ...this.status,
          lastCheck: new Date(),
        };
      }
      
      this.notifyListeners();
      return this.status;
    }
  }

  startMonitoring(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      this.stopMonitoring();
    }

    console.log(`Starting connection monitoring (interval: ${intervalMs}ms)`);
    
    // Do initial check after a delay to avoid startup false positives
    setTimeout(() => {
      this.checkConnection();
    }, 5000);

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      console.log('Stopping connection monitoring');
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  addListener(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  // Reset the connection status to online (useful after app resume)
  reset(): void {
    console.log('Resetting connection monitor to online state');
    this.consecutiveFailures = 0;
    this.status = {
      isConnected: true,
      lastCheck: new Date(),
      error: undefined,
    };
    this.notifyListeners();
  }
}

export const connectionMonitor = new ConnectionMonitor();
