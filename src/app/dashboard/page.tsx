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
  const [currentTime, setCurrentTime] = useState<{[key: string]: number}>({})
  const [duration, setDuration] = useState<{[key: string]: number}>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

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

  const playAudio = (linkId: string, index: number) => {
    // Pause current audio if any
    if (currentlyPlaying && currentlyPlaying !== linkId) {
      const currentAudio = document.getElementById(`audio-${currentlyPlaying}`) as HTMLAudioElement
      if (currentAudio) {
        currentAudio.pause()
      }
    }

    const audio = document.getElementById(`audio-${linkId}`) as HTMLAudioElement
    if (audio) {
      if (audio.paused) {
        audio.play()
        setCurrentlyPlaying(linkId)
        setCurrentIndex(index)
        setIsPlaying(true)
        trackListen(linkId)
      } else {
        audio.pause()
        setIsPlaying(false)
      }
    }
  }

  const playNext = () => {
    const availableLinks = links.filter(link => link.audioFileUrl && link.processingStatus === 'COMPLETED')
    if (currentIndex < availableLinks.length - 1) {
      const nextLink = availableLinks[currentIndex + 1]
      playAudio(nextLink.id, currentIndex + 1)
    }
  }

  const playPrevious = () => {
    const availableLinks = links.filter(link => link.audioFileUrl && link.processingStatus === 'COMPLETED')
    if (currentIndex > 0) {
      const prevLink = availableLinks[currentIndex - 1]
      playAudio(prevLink.id, currentIndex - 1)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getListenProgress = (link: ProcessedLink) => {
    // For the current playing track, show real-time progress
    if (currentlyPlaying === link.id && duration[link.id]) {
      return (currentTime[link.id] || 0) / duration[link.id]
    }
    
    // For completed tracks, show 100%
    if (link.listens.some(l => l.completed)) {
      return 1
    }
    
    // For unplayed tracks, show 0%
    return 0
  }

  const hasBeenListened = (link: ProcessedLink) => {
    return link.listens.some(l => l.completed)
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🎧 Audio Podcast Player</h1>
              <p className="text-gray-600">Your personalized audio content library</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Player Controls */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={playPrevious}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  onClick={playNext}
                  disabled={currentIndex >= links.filter(l => l.audioFileUrl && l.processingStatus === 'COMPLETED').length - 1}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Stats */}
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Episodes</div>
                <div className="text-2xl font-bold text-indigo-600">{links.length}</div>
              </div>
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
          <div className="space-y-1">
            {links.map((link, index) => {
              const isListened = hasBeenListened(link)
              const progress = getListenProgress(link)
              const availableLinks = links.filter(l => l.audioFileUrl && l.processingStatus === 'COMPLETED')
              const linkIndex = availableLinks.findIndex(l => l.id === link.id)
              const isCurrentTrack = currentlyPlaying === link.id
              
              return (
                <div 
                  key={link.id} 
                  id={`link-${link.id}`} 
                  className={`bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200 overflow-hidden ${
                    isListened ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center">
                    {/* Left Column - Play Button */}
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-50 flex items-center justify-center">
                      {link.audioFileUrl && link.processingStatus === 'COMPLETED' ? (
                        <button 
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                            isCurrentTrack && isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                          }`}
                          onClick={() => playAudio(link.id, linkIndex)}
                        >
                          <div className="transition-all duration-300">
                            {isCurrentTrack && isPlaying ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
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
                      <div className="flex items-center gap-4">
                        {/* Article Image */}
                        <div className="flex-shrink-0 hidden sm:block">
                          {link.ogImage ? (
                            <img 
                              src={link.ogImage} 
                              alt={link.title || 'Article'}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* Article Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {link.title || 'Untitled'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                              {link.listens.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{link.listens.length} play{link.listens.length !== 1 ? 's' : ''}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-gray-500 hover:text-indigo-600 transition-colors truncate block mb-2"
                          >
                            {link.url}
                          </a>
                          
                          {/* Progress Bar */}
                          {link.audioFileUrl && link.processingStatus === 'COMPLETED' && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${getListenProgress(link) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-400 min-w-0">
                                {formatTime(currentTime[link.id] || 0)} / {formatTime(duration[link.id] || 59)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Display - Only shown when playing */}
                  {isCurrentTrack && isPlaying && link.ttsScript && (
                    <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500 animate-in slide-in-from-top duration-300">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                            <span>🎧 Now Playing Summary</span>
                          </h4>
                          <p className="text-sm text-green-800 leading-relaxed">
                            {link.ttsScript}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Hidden Audio Element */}
                  {link.audioFileUrl && link.processingStatus === 'COMPLETED' && (
                    <audio 
                      id={`audio-${link.id}`}
                      onLoadedMetadata={(e) => {
                        const audio = e.target as HTMLAudioElement
                        setDuration(prev => ({ ...prev, [link.id]: audio.duration }))
                      }}
                      onTimeUpdate={(e) => {
                        const audio = e.target as HTMLAudioElement
                        setCurrentTime(prev => ({ ...prev, [link.id]: audio.currentTime }))
                      }}
                      onEnded={() => {
                        const latestListen = link.listens[link.listens.length - 1]
                        if (latestListen && !latestListen.completed) {
                          markAsCompleted(link.id, latestListen.id)
                        }
                        setIsPlaying(false)
                        setCurrentlyPlaying(null)
                        // Auto-play next
                        playNext()
                      }}
                      onPause={() => {
                        setIsPlaying(false)
                      }}
                      onPlay={() => {
                        setIsPlaying(true)
                        setCurrentlyPlaying(link.id)
                      }}
                    >
                      <source src={link.audioFileUrl} type="audio/mpeg" />
                    </audio>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}