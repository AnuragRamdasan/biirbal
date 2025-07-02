// Performance monitoring and optimization utilities

export class PerformanceTimer {
  private startTime: number
  private markers: Map<string, number> = new Map()
  private name: string

  constructor(name: string) {
    this.name = name
    this.startTime = performance.now()
    console.log(`⏱️  [${this.name}] Started`)
  }

  mark(label: string) {
    const elapsed = performance.now() - this.startTime
    this.markers.set(label, elapsed)
    console.log(`📊 [${this.name}] ${label}: ${elapsed.toFixed(2)}ms`)
    return elapsed
  }

  end() {
    const totalTime = performance.now() - this.startTime
    console.log(`🏁 [${this.name}] Completed in ${totalTime.toFixed(2)}ms`)
    
    // Log all markers for analysis
    if (this.markers.size > 0) {
      console.log(`📈 [${this.name}] Performance breakdown:`)
      for (const [label, time] of this.markers.entries()) {
        const percentage = ((time / totalTime) * 100).toFixed(1)
        console.log(`   ${label}: ${time.toFixed(2)}ms (${percentage}%)`)
      }
    }
    
    return totalTime
  }

  getMarkers() {
    return Array.from(this.markers.entries())
  }
}

// Singleton performance metrics collector
class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map()

  recordTiming(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    this.metrics.get(operation)!.push(duration)
    
    // Keep only last 100 measurements per operation
    const timings = this.metrics.get(operation)!
    if (timings.length > 100) {
      timings.shift()
    }
  }

  getStats(operation: string) {
    const timings = this.metrics.get(operation)
    if (!timings || timings.length === 0) {
      return null
    }

    const sorted = [...timings].sort((a, b) => a - b)
    const sum = timings.reduce((a, b) => a + b, 0)
    
    return {
      count: timings.length,
      min: Math.min(...timings),
      max: Math.max(...timings),
      avg: sum / timings.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  getAllStats() {
    const result: Record<string, any> = {}
    for (const operation of this.metrics.keys()) {
      result[operation] = this.getStats(operation)
    }
    return result
  }

  logStats() {
    console.log('📊 Performance Statistics:')
    for (const [operation, stats] of Object.entries(this.getAllStats())) {
      if (stats) {
        console.log(`   ${operation}:`)
        console.log(`     Avg: ${stats.avg.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms`)
        console.log(`     Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms (${stats.count} samples)`)
      }
    }
  }
}

export const performanceMetrics = new PerformanceMetrics()


// Memory monitoring
export function logMemoryUsage(label: string) {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage()
    console.log(`💾 [${label}] Memory Usage:`)
    console.log(`   RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`)
  }
}


