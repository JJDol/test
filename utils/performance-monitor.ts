export class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now() - this.startTime);
    console.log(`⏱️  ${name}: ${this.checkpoints.get(name)}ms`);
  }

  getDuration(name: string): number {
    return this.checkpoints.get(name) || 0;
  }

  getTotalTime(): number {
    return Date.now() - this.startTime;
  }

  logSummary(): void {
    console.log('📊 Performance Summary:');
    this.checkpoints.forEach((time, name) => {
      console.log(`  ${name}: ${time}ms`);
    });
    console.log(`  Total: ${this.getTotalTime()}ms`);
  }
}

export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor();
} 