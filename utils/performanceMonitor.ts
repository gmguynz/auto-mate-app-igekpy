
/**
 * Performance monitoring utility for tracking slow operations
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Track an async operation's performance
   */
  async track<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      const duration = Date.now() - startTime;
      this.addMetric({
        operation,
        duration,
        timestamp: startTime,
        success,
        error,
      });

      // Log slow operations (> 1 second)
      if (duration > 1000) {
        console.warn(
          `⚠️ Slow operation detected: ${operation} took ${duration}ms`
        );
      } else {
        console.log(`✅ ${operation} completed in ${duration}ms`);
      }
    }
  }

  /**
   * Add a metric to the history
   */
  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(operation: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.operation === operation);
  }

  /**
   * Get slow operations (> threshold ms)
   */
  getSlowOperations(threshold = 1000): PerformanceMetric[] {
    return this.metrics.filter((m) => m.duration > threshold);
  }

  /**
   * Get failed operations
   */
  getFailedOperations(): PerformanceMetric[] {
    return this.metrics.filter((m) => !m.success);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const metrics = this.getMetricsForOperation(operation);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    slowOperations: number;
    failedOperations: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
  } {
    const slowOps = this.getSlowOperations();
    const failedOps = this.getFailedOperations();
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = this.metrics.length > 0 
      ? totalDuration / this.metrics.length 
      : 0;

    const slowestOperation = this.metrics.length > 0
      ? this.metrics.reduce((slowest, current) => 
          current.duration > slowest.duration ? current : slowest
        )
      : null;

    return {
      totalOperations: this.metrics.length,
      slowOperations: slowOps.length,
      failedOperations: failedOps.length,
      averageDuration,
      slowestOperation,
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    const summary = this.getSummary();
    console.log('📊 Performance Summary:');
    console.log(`  Total Operations: ${summary.totalOperations}`);
    console.log(`  Slow Operations (>1s): ${summary.slowOperations}`);
    console.log(`  Failed Operations: ${summary.failedOperations}`);
    console.log(`  Average Duration: ${summary.averageDuration.toFixed(2)}ms`);
    
    if (summary.slowestOperation) {
      console.log(
        `  Slowest Operation: ${summary.slowestOperation.operation} (${summary.slowestOperation.duration}ms)`
      );
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
