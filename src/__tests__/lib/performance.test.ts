import { PerformanceTimer } from '@/lib/performance'

describe('Performance utilities', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    jest.clearAllMocks()
    
    // Mock performance.now()
    global.performance = { now: jest.fn(() => Date.now()) } as any
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('PerformanceTimer', () => {
    it('should create performance timer instance', () => {
      const timer = new PerformanceTimer('test-operation')
      expect(timer).toBeDefined()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test-operation] Started')
      )
    })

    it('should mark intermediate timings', () => {
      const timer = new PerformanceTimer('test-operation')
      
      const elapsed = timer.mark('checkpoint-1')
      
      expect(elapsed).toBeGreaterThanOrEqual(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test-operation] checkpoint-1')
      )
    })

    it('should end timer and show total time', () => {
      const timer = new PerformanceTimer('test-operation')
      
      timer.mark('checkpoint-1')
      const totalTime = timer.end()
      
      expect(totalTime).toBeGreaterThanOrEqual(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test-operation] Completed in')
      )
    })

    it('should get all markers', () => {
      const timer = new PerformanceTimer('test-operation')
      
      timer.mark('checkpoint-1')
      timer.mark('checkpoint-2')
      
      const markers = timer.getMarkers()
      
      expect(markers).toHaveLength(2)
      expect(markers[0][0]).toBe('checkpoint-1')
      expect(markers[1][0]).toBe('checkpoint-2')
    })

    it('should show performance breakdown when ending', () => {
      const timer = new PerformanceTimer('test-operation')
      
      timer.mark('checkpoint-1')
      timer.mark('checkpoint-2')
      timer.end()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance breakdown')
      )
    })
  })
})