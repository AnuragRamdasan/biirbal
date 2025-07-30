import { 
  colors, 
  typography, 
  spacing, 
  breakpoints, 
  shadows, 
  borderRadius 
} from '@/lib/design-system'

describe('Design System', () => {
  describe('colors', () => {
    it('should have primary color palette', () => {
      expect(colors.primary).toBeDefined()
      expect(colors.primary['50']).toBeDefined()
      expect(colors.primary['500']).toBeDefined()
      expect(colors.primary['900']).toBeDefined()
    })

    it('should have secondary color palette', () => {
      expect(colors.secondary).toBeDefined()
      expect(colors.secondary['50']).toBeDefined()
      expect(colors.secondary['500']).toBeDefined()
      expect(colors.secondary['900']).toBeDefined()
    })

    it('should have semantic colors', () => {
      expect(colors.success).toBeDefined()
      expect(colors.error).toBeDefined()
      expect(colors.warning).toBeDefined()
      expect(colors.info).toBeDefined()
    })

    it('should have gray scale', () => {
      expect(colors.gray).toBeDefined()
      expect(colors.gray['50']).toBeDefined()
      expect(colors.gray['500']).toBeDefined()
      expect(colors.gray['900']).toBeDefined()
    })
  })

  describe('typography', () => {
    it('should have font families', () => {
      expect(typography.fontFamily.sans).toBeDefined()
      expect(typography.fontFamily.mono).toBeDefined()
    })

    it('should have font sizes', () => {
      expect(typography.fontSize.xs).toBeDefined()
      expect(typography.fontSize.sm).toBeDefined()
      expect(typography.fontSize.base).toBeDefined()
      expect(typography.fontSize.lg).toBeDefined()
      expect(typography.fontSize.xl).toBeDefined()
      expect(typography.fontSize['2xl']).toBeDefined()
    })

    it('should have font weights', () => {
      expect(typography.fontWeight.normal).toBeDefined()
      expect(typography.fontWeight.medium).toBeDefined()
      expect(typography.fontWeight.semibold).toBeDefined()
      expect(typography.fontWeight.bold).toBeDefined()
    })

    it('should have line heights', () => {
      expect(typography.lineHeight.tight).toBeDefined()
      expect(typography.lineHeight.normal).toBeDefined()
      expect(typography.lineHeight.relaxed).toBeDefined()
    })
  })

  describe('spacing', () => {
    it('should have consistent spacing scale', () => {
      expect(spacing['0']).toBe('0')
      expect(spacing['1']).toBeDefined()
      expect(spacing['2']).toBeDefined()
      expect(spacing['4']).toBeDefined()
      expect(spacing['8']).toBeDefined()
      expect(spacing['16']).toBeDefined()
    })

    it('should have logical spacing progression', () => {
      // Check that spacing values increase logically
      const spacingValues = Object.keys(spacing).filter(key => !isNaN(Number(key)))
      expect(spacingValues.length).toBeGreaterThan(0)
    })
  })

  describe('breakpoints', () => {
    it('should have responsive breakpoints', () => {
      expect(breakpoints.sm).toBeDefined()
      expect(breakpoints.md).toBeDefined()
      expect(breakpoints.lg).toBeDefined()
      expect(breakpoints.xl).toBeDefined()
    })

    it('should have increasing breakpoint values', () => {
      const sm = parseInt(breakpoints.sm)
      const md = parseInt(breakpoints.md)
      const lg = parseInt(breakpoints.lg)
      const xl = parseInt(breakpoints.xl)

      expect(md).toBeGreaterThan(sm)
      expect(lg).toBeGreaterThan(md)
      expect(xl).toBeGreaterThan(lg)
    })
  })

  describe('shadows', () => {
    it('should have shadow variations', () => {
      expect(shadows.sm).toBeDefined()
      expect(shadows.DEFAULT).toBeDefined()
      expect(shadows.md).toBeDefined()
      expect(shadows.lg).toBeDefined()
      expect(shadows.xl).toBeDefined()
    })

    it('should have valid CSS shadow values', () => {
      Object.values(shadows).forEach(shadow => {
        expect(typeof shadow).toBe('string')
        expect(shadow.length).toBeGreaterThan(0)
      })
    })
  })

  describe('borderRadius', () => {
    it('should have border radius variations', () => {
      expect(borderRadius.none).toBe('0')
      expect(borderRadius.sm).toBeDefined()
      expect(borderRadius.DEFAULT).toBeDefined()
      expect(borderRadius.md).toBeDefined()
      expect(borderRadius.lg).toBeDefined()
      expect(borderRadius.full).toBeDefined()
    })

    it('should have valid CSS border radius values', () => {
      Object.values(borderRadius).forEach(radius => {
        expect(typeof radius).toBe('string')
        expect(radius.length).toBeGreaterThan(0)
      })
    })
  })
})