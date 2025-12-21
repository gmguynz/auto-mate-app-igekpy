
import { checkSupabaseConnection } from '@/integrations/supabase/client';

interface ConnectionStatus {
  isConnected: boolean;
  latency?: number;
  lastCheck: Date;
  error?: string;
}

class ConnectionMonitor {
  private status: ConnectionStatus = {
    isConnected: false,
    lastCheck: new Date(),
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(status: ConnectionStatus) => void> = [];

  constructor() {
    this.checkConnection();
  }

  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const result = await checkSupabaseConnection();
      this.status = {
        isConnected: result.healthy,
        latency: result.latency,
        lastCheck: new Date(),
        error: result.error,
      };
      
      this.notifyListeners();
      return this.status;
    } catch (error) {
      console.error('Connection check failed:', error);
      this.status = {
        isConnected: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.notifyListeners();
      return this.status;
    }
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      this.stopMonitoring();
    }

    console.log(`Starting connection monitoring (interval: ${intervalMs}ms)`);
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMs);

    // Initial check
    this.checkConnection();
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
}

export const connectionMonitor = new ConnectionMonitor();
