import React from 'react'
import { Card } from './Card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  gradient?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const gradientClasses = {
  blue: 'from-blue-50 to-blue-100 border-blue-200',
  green: 'from-green-50 to-green-100 border-green-200', 
  purple: 'from-purple-50 to-purple-100 border-purple-200',
  orange: 'from-orange-50 to-orange-100 border-orange-200',
  red: 'from-red-50 to-red-100 border-red-200'
}

const iconBgClasses = {
  blue: 'from-blue-500 to-indigo-500',
  green: 'from-green-500 to-emerald-500',
  purple: 'from-purple-500 to-pink-500', 
  orange: 'from-orange-500 to-amber-500',
  red: 'from-red-500 to-pink-500'
}

const valueColorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  red: 'text-red-600'
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  gradient = 'blue'
}) => {
  return (
    <Card 
      className={cn(
        'text-center p-6 bg-gradient-to-br border-2',
        gradientClasses[gradient],
        className
      )}
      padding="sm"
    >
      {/* Icon */}
      {icon && (
        <div className={cn(
          'bg-gradient-to-r w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
          iconBgClasses[gradient]
        )}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      )}

      {/* Value */}
      <div className={cn(
        'text-3xl font-bold mb-2',
        valueColorClasses[gradient]
      )}>
        {value}
      </div>

      {/* Title */}
      <div className="text-sm text-gray-600 font-medium mb-1">
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-gray-500">
          {subtitle}
        </div>
      )}

      {/* Trend */}
      {trend && (
        <div className={cn(
          'flex items-center justify-center mt-2 text-xs font-medium',
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          <span className="mr-1">
            {trend.isPositive ? '↗' : '↘'}
          </span>
          {Math.abs(trend.value)}%
        </div>
      )}
    </Card>
  )
}

export default StatCard