import { cn } from '@/lib/utils'

describe('Utility functions', () => {
  describe('cn (className utility)', () => {
    it('should combine class names correctly', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle conditional classes', () => {
      const result = cn('class1', false && 'class2', 'class3')
      expect(result).toBe('class1 class3')
    })

    it('should merge conflicting Tailwind classes', () => {
      const result = cn('p-4', 'p-8')
      expect(result).toBe('p-8') // p-8 should override p-4
    })

    it('should handle empty and undefined values', () => {
      const result = cn('class1', '', undefined, null, 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle objects with conditional classes', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true
      })
      expect(result).toBe('class1 class3')
    })

    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        {
          'conditional-class': true,
          'hidden-class': false
        },
        ['array-class1', 'array-class2'],
        'final-class'
      )
      expect(result).toBe('base-class conditional-class array-class1 array-class2 final-class')
    })
  })
})