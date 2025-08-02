// Design Tokens - Core design system values matching biirbal.com
// These tokens define the visual foundation of the Biirbal application

export const designTokens = {
  // Color System - Based on existing biirbal.com design
  colors: {
    // Brand Identity - Indigo primary color
    brand: {
      primary: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',  // Primary accent from globals.css
        600: '#4f46e5',  // Hover state from globals.css
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81'
      },
      // No secondary gradient - keep it simple and clean
      accent: '#6366f1',      // Direct reference to CSS custom property
      accentHover: '#4f46e5'  // Direct reference to CSS custom property
    },

    // Neutral Palette - Matching biirbal.com clean aesthetic
    neutral: {
      0: '#ffffff',    // Card background from globals.css
      50: '#fafafa',   // Background from globals.css
      100: '#f3f4f6',
      200: '#e5e7eb',  // Card border from globals.css
      300: '#d1d5db',
      400: '#9ca3af',  // Muted light from globals.css
      500: '#6b7280',  // Muted from globals.css
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#1a1a1a',  // Foreground from globals.css
      950: '#0f0f0f'   // Dark background from globals.css
    },

    // Semantic Colors
    semantic: {
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d'
      },
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309'
      },
      error: {
        50: '#fef2f2',
        100: '#fee2e2',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c'
      },
      info: {
        50: '#eff6ff',
        100: '#dbeafe',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8'
      }
    }
  },

  // Typography System - Matching actual biirbal.com usage
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'monospace']
    },
    
    fontSize: {
      xs: '10px',      // Used for tiny labels 
      sm: '12px',      // Used extensively for secondary text, metadata
      base: '14px',    // Used for filter labels, small buttons
      md: '16px',      // Used for main content, titles, form inputs
      lg: '18px',      // Used for page titles (level 3), section headers
      xl: '20px',      // Used for larger titles
      '2xl': '24px',   // Used for icons, large titles
      '3xl': '32px',   // Used for main page titles
      '4xl': '36px',   // Reserved for hero titles
      '5xl': '48px',   // Reserved for landing page
      '6xl': '60px'    // Reserved for marketing
    },
    
    fontWeight: {
      normal: 400,    // Regular text
      medium: 500,    // Not commonly used
      semibold: 600,  // Used for emphasis, link titles
      bold: 700       // Used for stats numbers, important headings
    },
    
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6
    }
  },

  // Spacing System - Based on actual biirbal.com usage patterns
  spacing: {
    0: '0px',
    1: '4px',       // Small gaps
    2: '6px',       // Icon-text gaps
    3: '8px',       // Small margins between elements
    4: '12px',      // Card gaps, small spacing
    5: '16px',      // Standard spacing (very common)
    6: '20px',      // Section padding
    7: '24px',      // Card padding, container spacing
    8: '32px',      // Large section spacing
    9: '40px',      // Page margins
    10: '48px',     // Section breaks
    12: '60px',     // Large section padding
    16: '80px',     // Major section padding
    20: '100px',    // Hero section spacing
    24: '120px'     // Major layout spacing
  },

  // Border Radius - Matching biirbal.com patterns
  borderRadius: {
    none: '0',
    sm: '4px',       // Small elements
    base: '6px',     // Default border radius
    md: '8px',       // Cards, buttons
    lg: '12px',      // Larger cards
    xl: '16px',      // Special containers
    '2xl': '20px',   // Hero sections
    full: '50%'      // Circular elements
  },

  // Shadows
  shadow: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    glow: '0 0 0 3px rgb(59 130 246 / 0.15)',
    glowLg: '0 0 20px rgb(59 130 246 / 0.15)'
  },

  // Animation & Transitions
  animation: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms'
    },
    
    easing: {
      linear: 'cubic-bezier(0, 0, 1, 1)',
      ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  // Layout & Grid
  layout: {
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    
    maxWidth: {
      content: '65ch',
      prose: '75ch',
      screen: '100vw'
    },
    
    zIndex: {
      hide: -1,
      auto: 'auto',
      base: 0,
      dropdown: 1000,
      sticky: 1020,
      fixed: 1030,
      overlay: 1040,
      modal: 1050,
      popover: 1060,
      tooltip: 1070,
      toast: 1080,
      maximum: 9999
    }
  },

  // Component-specific tokens
  components: {
    header: {
      height: '4rem',    // 64px
      background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
      blur: 'blur(8px)'
    },
    
    sidebar: {
      width: '16rem',    // 256px
      widthCollapsed: '4rem' // 64px
    },
    
    card: {
      background: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: '1px',
      borderRadius: '1rem', // 16px
      padding: '1.5rem'    // 24px
    },
    
    button: {
      height: {
        sm: '2rem',     // 32px
        base: '2.5rem', // 40px
        lg: '3rem'      // 48px
      },
      padding: {
        sm: '0.5rem 1rem',     // 8px 16px
        base: '0.75rem 1.5rem', // 12px 24px
        lg: '1rem 2rem'        // 16px 32px
      }
    }
  }
} as const

// Type exports for TypeScript
export type ColorScale = typeof designTokens.colors.brand.primary
export type SpacingToken = keyof typeof designTokens.spacing
export type TypographySize = keyof typeof designTokens.typography.fontSize
export type BorderRadiusToken = keyof typeof designTokens.borderRadius
export type ShadowToken = keyof typeof designTokens.shadow