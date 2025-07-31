/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSearchParams } from 'next/navigation'
import SuccessPage from '@/app/success/page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn()
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  )
})

// Note: global.fetch is already mocked in jest.setup.js

describe('Success Page', () => {
  const mockSearchParams = {
    get: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  describe('Loading State', () => {
    it('shows loading spinner when verifying session', async () => {
      mockSearchParams.get.mockReturnValue('cs_test_session_123')
      
      // Mock fetch to return a pending promise initially
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(<SuccessPage />)
      
      expect(screen.getByText('Processing Your Payment')).toBeInTheDocument()
      expect(screen.getByText('Please wait while we confirm your subscription...')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('shows error when no session ID is provided', async () => {
      mockSearchParams.get.mockReturnValue(null)
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Payment Error')).toBeInTheDocument()
        expect(screen.getByText('No session ID provided')).toBeInTheDocument()
      })
    })

    it('shows error when session verification fails', async () => {
      mockSearchParams.get.mockReturnValue('cs_test_session_123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid session'
        })
      })
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Payment Error')).toBeInTheDocument()
        expect(screen.getByText('Invalid session')).toBeInTheDocument()
      })
    })

    it('shows error when fetch throws exception', async () => {
      mockSearchParams.get.mockReturnValue('cs_test_session_123')
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Payment Error')).toBeInTheDocument()
        expect(screen.getByText('An error occurred while verifying your payment')).toBeInTheDocument()
      })
    })

    it('shows correct links in error state', async () => {
      mockSearchParams.get.mockReturnValue(null)
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        const tryAgainLink = screen.getByText('Try Again').closest('a')
        const contactSupportLink = screen.getByText('Contact Support').closest('a')
        
        expect(tryAgainLink).toHaveAttribute('href', '/pricing')
        expect(contactSupportLink).toHaveAttribute('href', '/contact')
      })
    })
  })

  describe('Success State', () => {
    it('shows success message when verification succeeds', async () => {
      mockSearchParams.get.mockReturnValue('cs_test_session_123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true
        })
      })
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Payment Successful!')).toBeInTheDocument()
        expect(screen.getByText('Your subscription has been activated successfully!')).toBeInTheDocument()
      })
    })

    it('dashboard link points to root path after successful payment', async () => {
      mockSearchParams.get.mockReturnValue('cs_test_session_123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true
        })
      })
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        const dashboardLink = screen.getByText('Go to Dashboard').closest('a')
        expect(dashboardLink).toHaveAttribute('href', '/')
      })
    })

    it('shows manage team link in success state', async () => {
      mockSearchParams.get.mockReturnValue('cs_test_session_123')
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true
        })
      })
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        const manageTeamLink = screen.getByText('Manage Team').closest('a')
        expect(manageTeamLink).toHaveAttribute('href', '/team')
      })
    })
  })

  describe('Session Verification API Call', () => {
    it('calls verify-session API with correct parameters', async () => {
      const sessionId = 'cs_test_session_123'
      mockSearchParams.get.mockReturnValue(sessionId)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true })
      })
      
      render(<SuccessPage />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId })
        })
      })
    })
  })

  describe('Suspense Boundary', () => {
    it('shows loading fallback when suspended', () => {
      mockSearchParams.get.mockReturnValue('cs_test_session_123')
      
      render(<SuccessPage />)
      
      // The component should render without crashing - either the Suspense fallback or the component itself
      expect(
        screen.queryByText('Loading...') || 
        screen.queryByText('Processing Your Payment')
      ).toBeTruthy()
    })
  })
})