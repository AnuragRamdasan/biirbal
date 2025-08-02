# Biirbal Design System & Layout Guide

This guide explains how to use the new design system and base layout components for consistent UI across the Biirbal application.

## Overview

The design system provides:
- **Design Tokens**: Centralized values for colors, typography, spacing, etc.
- **Base Layout Components**: Reusable layout patterns for different page types
- **Enhanced UI Components**: Design system-aware components with consistent styling
- **Migration Examples**: How to convert existing pages to use the new system

## Design Tokens

### Location
- `/src/lib/design-tokens.ts` - Core design tokens
- All design values are centralized and type-safe

### Key Features
```typescript
import { designTokens } from '@/lib/design-tokens'

// Colors
designTokens.colors.brand.primary[600]      // Primary blue
designTokens.colors.brand.gradient.primary  // Brand gradient
designTokens.colors.semantic.success[500]   // Success green
designTokens.colors.neutral[900]            // Dark text

// Typography
designTokens.typography.fontSize.xl         // 20px
designTokens.typography.fontWeight.bold     // 700
designTokens.typography.fontFamily.sans     // Inter, system fonts

// Spacing (8px grid)
designTokens.spacing[4]  // 16px
designTokens.spacing[8]  // 32px

// Shadows & Borders
designTokens.shadow.lg
designTokens.borderRadius['2xl']
```

## Base Layout Components

### Location
- `/src/components/layout/BaseLayout.tsx`

### Available Layouts

#### 1. BaseLayout (Generic)
```tsx
import { BaseLayout } from '@/components/layout/BaseLayout'

<BaseLayout
  currentPage="profile"
  variant="wide"           // default | fullscreen | centered | wide
  background="gradient"    // default | gradient | neutral | white
  showHeader={true}
  showDevAuth={true}
>
  {children}
</BaseLayout>
```

#### 2. DashboardLayout (For Dashboard Pages)
```tsx
import { DashboardLayout } from '@/components/layout/BaseLayout'

<DashboardLayout currentPage="dashboard">
  {children}
</DashboardLayout>
```

#### 3. ContentLayout (For Marketing/Info Pages)
```tsx
import { ContentLayout } from '@/components/layout/BaseLayout'

<ContentLayout
  currentPage="pricing"
  title="Choose Your Plan"
  subtitle="Start with our free trial"
>
  {children}
</ContentLayout>
```

#### 4. AuthLayout (For Authentication)
```tsx
import { AuthLayout } from '@/components/layout/BaseLayout'

<AuthLayout showHeader={false}>
  {children}
</AuthLayout>
```

#### 5. LandingLayout (For Landing Page)
```tsx
import { LandingLayout } from '@/components/layout/BaseLayout'

<LandingLayout>
  {children}
</LandingLayout>
```

## Enhanced UI Components

### Location
- `/src/components/ui/DesignSystem.tsx`

### Available Components

#### Button
```tsx
import { Button } from '@/components/ui/DesignSystem'

<Button 
  variant="primary"    // primary | secondary | ghost | danger | success
  size="lg"           // sm | base | lg
  loading={false}
  icon={<Icon />}
  iconPosition="left" // left | right
  fullWidth={false}
>
  Click me
</Button>
```

#### Card
```tsx
import { Card } from '@/components/ui/DesignSystem'

<Card 
  variant="elevated"  // default | elevated | bordered | gradient | glass
  padding="lg"       // sm | base | lg | none
  hover={true}
>
  Content here
</Card>
```

#### Badge
```tsx
import { Badge } from '@/components/ui/DesignSystem'

<Badge 
  variant="success"  // success | warning | error | info | neutral | brand
  size="base"       // sm | base | lg
  dot={false}       // Shows dot indicator
>
  Status
</Badge>
```

#### Input
```tsx
import { Input } from '@/components/ui/DesignSystem'

<Input 
  variant="default"  // default | error
  sizing="base"     // sm | base | lg
  leftIcon={<Icon />}
  rightIcon={<Icon />}
  placeholder="Enter text..."
/>
```

## Migration Guide

### Step 1: Replace Layout Component

**Before:**
```tsx
import Layout from '@/components/layout/Layout'

export default function MyPage() {
  return (
    <Layout currentPage="profile">
      {content}
    </Layout>
  )
}
```

**After:**
```tsx
import { DashboardLayout } from '@/components/layout/BaseLayout'

export default function MyPage() {
  return (
    <DashboardLayout currentPage="profile">
      {content}
    </DashboardLayout>
  )
}
```

### Step 2: Update Component Imports

**Before:**
```tsx
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
```

**After:**
```tsx
import { Button, Card } from '@/components/ui/DesignSystem'
```

### Step 3: Use Design Tokens for Custom Styling

**Before:**
```tsx
<div style={{ 
  background: '#6366f1',
  padding: '24px',
  borderRadius: '16px',
  color: 'white'
}}>
```

**After:**
```tsx
import { designTokens } from '@/lib/design-tokens'

<div style={{ 
  background: designTokens.colors.brand.gradient.primary,
  padding: designTokens.spacing[6],
  borderRadius: designTokens.borderRadius.xl,
  color: designTokens.colors.neutral[0]
}}>
```

### Step 4: Replace Inline Styles with Component Props

**Before:**
```tsx
<button 
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
  onClick={handleClick}
>
  Submit
</button>
```

**After:**
```tsx
<Button 
  variant="primary"
  size="base"
  onClick={handleClick}
>
  Submit
</Button>
```

## Best Practices

### 1. Use Layout Components for Page Structure
- Choose the appropriate layout component for your page type
- Don't create custom layout components unless absolutely necessary

### 2. Prefer Design System Components
- Use design system components over custom implementations
- Only create custom components when design system doesn't meet needs

### 3. Use Design Tokens for Values
- Always use design tokens instead of hardcoded values
- This ensures consistency and makes theme updates easier

### 4. Maintain Consistent Spacing
- Use the 8px spacing grid (`designTokens.spacing`)
- Stick to defined spacing values for consistency

### 5. Follow Color Guidelines
- Use semantic colors for status indicators
- Use brand colors for primary actions
- Use neutral colors for text and backgrounds

## Component Examples

### Complete Page Example
```tsx
'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/BaseLayout'
import { Card, Button, Badge } from '@/components/ui/DesignSystem'
import { designTokens } from '@/lib/design-tokens'

export default function ExamplePage() {
  const [loading, setLoading] = useState(false)

  return (
    <DashboardLayout currentPage="example">
      {/* Header Card */}
      <Card variant="gradient" padding="lg" className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: designTokens.colors.neutral[900] }}
            >
              Page Title
            </h1>
            <p style={{ color: designTokens.colors.neutral[600] }}>
              Page description
            </p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </Card>

      {/* Content Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <h3 className="text-lg font-semibold mb-4">Card Title</h3>
          <p className="mb-4">Card content goes here.</p>
          <Button 
            variant="primary" 
            loading={loading}
            onClick={() => setLoading(!loading)}
          >
            Action Button
          </Button>
        </Card>

        <Card variant="bordered" padding="lg">
          <h3 className="text-lg font-semibold mb-4">Another Card</h3>
          <p className="mb-4">More content here.</p>
          <Button variant="secondary">
            Secondary Action
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  )
}
```

## Ant Design Integration

The design system works alongside Ant Design:

### When to Use Each
- **Design System Components**: Buttons, cards, badges, basic inputs
- **Ant Design Components**: Complex components like tables, forms, date pickers, etc.

### Styling Ant Design Components
```tsx
import { Table } from 'antd'
import { designTokens } from '@/lib/design-tokens'

<Table
  columns={columns}
  dataSource={data}
  style={{
    background: designTokens.colors.neutral[0],
    borderRadius: designTokens.borderRadius.lg
  }}
/>
```

## Browser Support

The design system supports:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Modern CSS features used:
- CSS Custom Properties
- CSS Grid
- Flexbox
- backdrop-filter (with fallbacks)

## TypeScript Support

All components and design tokens are fully typed:

```typescript
import type { 
  ButtonVariant, 
  CardVariant, 
  SpacingToken 
} from '@/lib/design-tokens'

// Type-safe component props
const variant: ButtonVariant = 'primary'
const spacing: SpacingToken = 4
```

## Performance Considerations

- Design tokens are compile-time constants (no runtime overhead)
- CSS-in-JS is minimal and optimized
- Components use React.forwardRef for better performance
- Layout components are lazy-loaded where possible

## Future Enhancements

Planned additions:
- Dark mode support
- Additional component variants
- Animation system
- Responsive design tokens
- Component composition patterns

## Migration Checklist

- [ ] Replace layout components
- [ ] Update component imports
- [ ] Use design tokens for custom styles
- [ ] Replace inline styles with component props
- [ ] Test responsive behavior
- [ ] Verify accessibility
- [ ] Update any custom CSS
- [ ] Test cross-browser compatibility