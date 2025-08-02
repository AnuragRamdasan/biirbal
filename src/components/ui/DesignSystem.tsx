import React from 'react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'

// Enhanced Button Component with Design System
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'base' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'base', 
    loading = false, 
    disabled, 
    icon,
    iconPosition = 'left',
    fullWidth = false,
    children, 
    ...props 
  }, ref) => {
    const variants = {
      primary: `
        text-white 
        hover:opacity-90
        focus:ring-2 focus:ring-offset-2
        transition-opacity duration-200
      `,
      secondary: `
        bg-white 
        border border-gray-300 
        hover:bg-gray-50 hover:border-gray-400
        focus:ring-2 focus:ring-offset-2
        transition-colors duration-200
      `,
      ghost: `
        bg-transparent 
        hover:bg-gray-100
        focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
        transition-colors duration-200
      `,
      danger: `
        bg-red-600 
        text-white 
        hover:bg-red-700
        focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        transition-colors duration-200
      `,
      success: `
        bg-green-600 
        text-white 
        hover:bg-green-700
        focus:ring-2 focus:ring-green-500 focus:ring-offset-2
        transition-colors duration-200
      `
    }

    const sizes = {
      sm: 'h-8 text-sm',
      base: 'h-10 text-base', 
      lg: 'h-12 text-lg'
    }

    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'rounded-md px-4',
          // Size
          sizes[size],
          // Variant
          variants[variant],
          // Primary button background
          variant === 'primary' && 'bg-indigo-600 hover:bg-indigo-700',
          // Full width
          fullWidth && 'w-full',
          // Loading state
          loading && 'cursor-not-allowed',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        style={{
          fontFamily: designTokens.typography.fontFamily.sans.join(', ')
        }}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {icon && iconPosition === 'left' && !loading && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && !loading && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Enhanced Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'gradient' | 'glass'
  padding?: 'sm' | 'base' | 'lg' | 'none'
  hover?: boolean
  children: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'base', hover = true, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-gray-200',
      elevated: 'bg-white shadow-sm',
      bordered: 'bg-white border border-gray-300',
      gradient: 'bg-white',
      glass: 'bg-white'
    }

    const paddings = {
      none: '',
      sm: 'p-4',
      base: 'p-4', // Matching actual usage
      lg: 'p-6'
    }

    return (
      <div
        className={cn(
          'rounded-md',
          variants[variant],
          paddings[padding],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Enhanced Badge Component
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'
  size?: 'sm' | 'base' | 'lg'
  dot?: boolean
  children: React.ReactNode
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'base', dot = false, children, ...props }, ref) => {
    const variants = {
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      neutral: 'bg-gray-100 text-gray-800 border-gray-200',
      brand: 'bg-purple-100 text-purple-800 border-purple-200'
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      base: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-base'
    }

    if (dot) {
      const dotColors = {
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        neutral: 'bg-gray-500',
        brand: 'bg-purple-500'
      }

      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5',
            'rounded-full border font-medium',
            variants[variant],
            sizes[size],
            className
          )}
          ref={ref}
          {...props}
        >
          <div className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
          {children}
        </span>
      )
    }

    return (
      <span
        className={cn(
          'inline-flex items-center',
          'rounded-full border font-medium',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error'
  sizing?: 'sm' | 'base' | 'lg'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', sizing = 'base', leftIcon, rightIcon, ...props }, ref) => {
    const variants = {
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
      error: 'border-red-300 focus:border-red-500 focus:ring-red-500'
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      base: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg'
    }

    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{leftIcon}</span>
            </div>
          )}
          <input
            className={cn(
              'block w-full rounded-xl border shadow-sm',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              variants[variant],
              sizes[sizing],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{rightIcon}</span>
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        className={cn(
          'block w-full rounded-xl border shadow-sm',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          variants[variant],
          sizes[sizing],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

// Utility Classes for Design System
export const spacing = {
  xs: designTokens.spacing[1],
  sm: designTokens.spacing[2],
  base: designTokens.spacing[4],
  lg: designTokens.spacing[6],
  xl: designTokens.spacing[8],
  '2xl': designTokens.spacing[12],
  '3xl': designTokens.spacing[16]
}

export const colors = designTokens.colors

export const typography = designTokens.typography