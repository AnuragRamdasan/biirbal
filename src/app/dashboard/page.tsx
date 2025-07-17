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
  ogImage?: string | null
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
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

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
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id} id={`link-${link.id}`} className="bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200 overflow-hidden">
                <div className="flex items-center">
                  {/* Left Column - Play Button */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-50 flex items-center justify-center">
                    {link.audioFileUrl && link.processingStatus === 'COMPLETED' ? (
                      <button 
                        className="w-10 h-10 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white transition-colors"
                        onClick={() => {
                          const audio = document.getElementById(`audio-${link.id}`) as HTMLAudioElement
                          if (audio) {
                            if (audio.paused) {
                              audio.play()
                              trackListen(link.id)
                            } else {
                              audio.pause()
                            }
                          }
                        }}
                      >
                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        link.processingStatus === 'PROCESSING' ? 'bg-yellow-200 animate-pulse' :
                        link.processingStatus === 'FAILED' ? 'bg-red-200' : 'bg-gray-200'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          link.processingStatus === 'PROCESSING' ? 'bg-yellow-500' :
                          link.processingStatus === 'FAILED' ? 'bg-red-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Column - Content */}
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-start gap-4">
                      {/* Article Image */}
                      <div className="flex-shrink-0 hidden sm:block">
                        {link.ogImage ? (
                          <img 
                            src={link.ogImage} 
                            alt={link.title || 'Article'}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Article Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate mb-1">
                              {link.title || 'Untitled'}
                            </h3>
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs sm:text-sm text-gray-500 hover:text-indigo-600 transition-colors truncate block mb-2"
                            >
                              {link.url}
                            </a>
                            <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-400">
                              <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{link.listens.length} listen{link.listens.length !== 1 ? 's' : ''}</span>
                              {link.listens.some(l => l.completed) && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">✓ Completed</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-2 sm:ml-4">
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
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Hidden Audio Element */}
                {link.audioFileUrl && link.processingStatus === 'COMPLETED' && (
                  <audio 
                    id={`audio-${link.id}`}
                    onEnded={() => {
                      const latestListen = link.listens[link.listens.length - 1]
                      if (latestListen && !latestListen.completed) {
                        markAsCompleted(link.id, latestListen.id)
                      }
                    }}
                  >
                    <source src={link.audioFileUrl} type="audio/mpeg" />
                  </audio>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}