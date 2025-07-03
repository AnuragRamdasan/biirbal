'use client'

import { useEffect, useState } from 'react'

interface ProcessedLink {
  id: string
  url: string
  title: string | null
  extractedText: string | null
  audioFileUrl: string | null
  ttsScript: string | null
  createdAt: string
  processingStatus: string
  listens: AudioListen[]
}

interface AudioListen {
  id: string
  listenedAt: string
  completed: boolean
  listenDuration: number | null
}

export default function Dashboard() {
  const [links, setLinks] = useState<ProcessedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLinks()
    
    // Scroll to specific link if hash is present
    const hash = window.location.hash.substring(1)
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(`link-${hash}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
          element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
          }, 3000)
        }
      }, 500)
    }
  }, [])

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/dashboard/links')
      if (!response.ok) {
        throw new Error('Failed to fetch links')
      }
      const data = await response.json()
      setLinks(data.links)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const trackListen = async (linkId: string) => {
    try {
      // Get the current user ID from localStorage if available
      const slackUserId = localStorage.getItem('biirbal_user_id')
      
      await fetch('/api/dashboard/track-listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          linkId,
          slackUserId 
        }),
      })
      fetchLinks()
    } catch (err) {
      console.error('Failed to track listen:', err)
    }
  }

  const markAsCompleted = async (linkId: string, listenId: string) => {
    try {
      await fetch('/api/dashboard/complete-listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkId, listenId }),
      })
      fetchLinks()
    } catch (err) {
      console.error('Failed to mark as completed:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">🧠 Biirbal.ai</span>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/profile" className="text-white/80 hover:text-white transition-colors text-sm">
                  Profile
                </a>
                <a href="/" className="text-white/80 hover:text-white transition-colors text-sm">
                  ← Home
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your links...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">🧠 biirbal.ai</span>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/profile" className="text-white/80 hover:text-white transition-colors text-sm">
                  Profile
                </a>
                <a href="/" className="text-white/80 hover:text-white transition-colors text-sm">
                  ← Home
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl max-w-md mx-auto">
              ❌ Error: {error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">🧠 biirbal.ai</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/profile" className="text-white/80 hover:text-white transition-colors text-sm">
                Profile
              </a>
              <a href="/" className="text-white/80 hover:text-white transition-colors text-sm">
                ← Home
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Audio Dashboard</h1>
              <p className="text-gray-600">All your processed links and audio summaries in one place</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Links</div>
              <div className="text-2xl font-bold text-indigo-600">{links.length}</div>
            </div>
          </div>
        </div>
        
        {links.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-md mx-auto">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No links yet</h3>
              <p className="text-gray-600 text-sm">Share some links in Slack to get started with audio summaries!</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {links.map((link) => (
              <div key={link.id} id={`link-${link.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-4">
                <div className="flex items-start gap-4">
                  {/* Status Indicator */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-3 h-3 rounded-full ${
                      link.processingStatus === 'COMPLETED' 
                        ? 'bg-green-500' 
                        : link.processingStatus === 'PROCESSING'
                        ? 'bg-yellow-500 animate-pulse'
                        : link.processingStatus === 'FAILED'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                        {link.title || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          link.processingStatus === 'COMPLETED' 
                            ? 'bg-green-100 text-green-800' 
                            : link.processingStatus === 'PROCESSING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : link.processingStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {link.processingStatus}
                        </span>
                        {link.listens.some(l => l.completed) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{link.listens.length} listen{link.listens.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 transition-colors truncate max-w-md"
                      >
                        {link.url}
                      </a>
                    </div>

                    {link.extractedText && (
                      <p className="text-gray-700 text-sm mb-3">{link.extractedText}</p>
                    )}

                    {link.audioFileUrl && link.processingStatus === 'COMPLETED' && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-sm font-medium text-gray-900">Audio Summary:</span>
                          <audio 
                            controls 
                            className="flex-1 h-8"
                            style={{ maxHeight: '32px' }}
                            onPlay={() => trackListen(link.id)}
                            onEnded={() => {
                              const latestListen = link.listens[link.listens.length - 1]
                              if (latestListen && !latestListen.completed) {
                                markAsCompleted(link.id, latestListen.id)
                              }
                            }}
                          >
                            <source src={link.audioFileUrl} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}