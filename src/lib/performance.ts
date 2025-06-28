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

// Decorator function for automatic performance tracking
export function trackPerformance(operationName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const timer = new PerformanceTimer(`${operationName}:${propertyKey}`)
      
      try {
        const result = await originalMethod.apply(this, args)
        const duration = timer.end()
        performanceMetrics.recordTiming(operationName, duration)
        return result
      } catch (error) {
        timer.end()
        throw error
      }
    }

    return descriptor
  }
}

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

// Performance optimization helpers
export class BatchProcessor<T> {
  private items: T[] = []
  private batchSize: number
  private processingFn: (batch: T[]) => Promise<void>
  private timeout: NodeJS.Timeout | null = null
  private maxWaitMs: number

  constructor(
    batchSize: number,
    processingFn: (batch: T[]) => Promise<void>,
    maxWaitMs: number = 5000
  ) {
    this.batchSize = batchSize
    this.processingFn = processingFn
    this.maxWaitMs = maxWaitMs
  }

  add(item: T) {
    this.items.push(item)
    
    // Process if batch is full
    if (this.items.length >= this.batchSize) {
      this.flush()
    } else if (this.timeout === null) {
      // Set timeout for partial batch
      this.timeout = setTimeout(() => this.flush(), this.maxWaitMs)
    }
  }

  async flush() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    if (this.items.length === 0) return

    const batch = this.items.splice(0, this.items.length)
    
    try {
      await this.processingFn(batch)
    } catch (error) {
      console.error('Batch processing failed:', error)
      // Could implement retry logic here
    }
  }
}

// Cache implementation for content
export class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>()
  private maxSize: number
  private maxAge: number // in milliseconds

  constructor(maxSize: number = 100, maxAgeMs: number = 60 * 60 * 1000) {
    this.maxSize = maxSize
    this.maxAge = maxAgeMs
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key)
    if (!item) return undefined

    // Check if expired
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, item)
    
    return item.value
  }

  set(key: K, value: V) {
    // Remove if already exists
    this.cache.delete(key)

    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, { value, timestamp: Date.now() })
  }

  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

// Content cache instance
export const contentCache = new LRUCache<string, any>(50, 30 * 60 * 1000) // 50 items, 30 minutes