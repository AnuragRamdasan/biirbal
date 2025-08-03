/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated'
  })),
  signOut: jest.fn()
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  )
})

describe('Header Component', () => {
  const mockPush = jest.fn()
  const mockRouter = { push: mockPush }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    
    // Reset localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    })
  })

  describe('Unauthenticated User', () => {
    beforeEach(() => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue(null)
    })

    it('renders logo and basic navigation for unauthenticated users', () => {
      render(<Header />)
      
      expect(screen.getByText('Biirbal')).toBeInTheDocument()
      expect(screen.getByText('Pricing')).toBeInTheDocument()
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Team')).not.toBeInTheDocument()
      expect(screen.queryByText('Profile')).not.toBeInTheDocument()
      expect(screen.queryByText('Logout')).not.toBeInTheDocument()
    })

    it('has correct href for pricing link', () => {
      render(<Header />)
      
      const pricingLink = screen.getByText('Pricing').closest('a')
      expect(pricingLink).toHaveAttribute('href', '/pricing')
    })
  })

  describe('Authenticated User', () => {
    beforeEach(() => {
      ;(window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'biirbal_user_id') return 'T123456'
        return null
      })
    })

    it('renders full navigation for authenticated users', () => {
      render(<Header />)
      
      expect(screen.getByText('Biirbal')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Team')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Pricing')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('dashboard link points to root path', () => {
      render(<Header />)
      
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveAttribute('href', '/')
    })

    it('highlights dashboard link when currentPage is home', () => {
      render(<Header currentPage="home" />)
      
      const dashboardLink = screen.getByText('Dashboard')
      expect(dashboardLink).toHaveClass('text-white', 'font-semibold')
    })

    it('highlights dashboard link when currentPage is dashboard', () => {
      render(<Header currentPage="dashboard" />)
      
      const dashboardLink = screen.getByText('Dashboard')
      expect(dashboardLink).toHaveClass('text-white', 'font-semibold')
    })

    it('handles logout correctly', () => {
      render(<Header />)
      
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      // Verify localStorage items are removed
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('biirbal_visited_dashboard')
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('biirbal_user_id')
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('biirbal_user_id')
      
      // Verify router push to home
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('clears all biirbal localStorage items on logout', () => {
      // Mock the localStorage storage to have some biirbal_ prefixed keys
      const mockLocalStorage = {
        getItem: jest.fn((key) => {
          if (key === 'biirbal_user_id') return 'T123456'
          return null
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      }
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
      
      // Mock Object.keys to return localStorage keys
      const originalObjectKeys = Object.keys
      Object.keys = jest.fn((obj) => {
        if (obj === window.localStorage) {
          return ['biirbal_custom_setting', 'biirbal_another_setting', 'some_other_key']
        }
        return originalObjectKeys(obj)
      })

      render(<Header />)
      
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      // Verify biirbal_ prefixed items are removed
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('biirbal_custom_setting')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('biirbal_another_setting')
      
      // Restore Object.keys
      Object.keys = originalObjectKeys
    })
  })

  describe('Navigation Visibility', () => {
    it('hides navigation when showNavigation is false', () => {
      render(<Header showNavigation={false} />)
      
      expect(screen.queryByText('Pricing')).not.toBeInTheDocument()
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('shows navigation by default', () => {
      render(<Header />)
      
      expect(screen.getByText('Pricing')).toBeInTheDocument()
    })
  })

  describe('Current Page Highlighting', () => {
    beforeEach(() => {
      ;(window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'biirbal_user_id') return 'T123456'
        return null
      })
    })

    it('highlights team link when currentPage is team', () => {
      render(<Header currentPage="team" />)
      
      const teamLink = screen.getByText('Team')
      expect(teamLink).toHaveClass('text-white', 'font-semibold')
    })

    it('highlights profile link when currentPage is profile', () => {
      render(<Header currentPage="profile" />)
      
      const profileLink = screen.getByText('Profile')
      expect(profileLink).toHaveClass('text-white', 'font-semibold')
    })

    it('highlights pricing link when currentPage is pricing', () => {
      render(<Header currentPage="pricing" />)
      
      const pricingLink = screen.getByText('Pricing')
      expect(pricingLink).toHaveClass('text-white', 'font-semibold')
    })
  })
})