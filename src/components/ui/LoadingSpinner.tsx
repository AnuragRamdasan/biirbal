import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'base' | 'lg'
  className?: string
  message?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  base: 'h-8 w-8', 
  lg: 'h-12 w-12'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'base', 
  className,
  message 
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
          sizeClasses[size],
          className
        )}
      />
      {message && (
        <p className="text-gray-600 text-sm font-medium">{message}</p>
      )}
    </div>
  )
}

export default LoadingSpinner