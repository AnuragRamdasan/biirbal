'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StatCard from '@/components/ui/StatCard'
import AudioPlayer from '@/components/dashboard/AudioPlayer'

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
      // Get team and user IDs from localStorage
      const teamId = localStorage.getItem('biirbal_team_id')
      const slackUserId = localStorage.getItem('biirbal_user_id')
      
      if (!teamId) {
        throw new Error('No team found. Please install the bot first.')
      }

      // Build URL with query parameters for user-specific filtering
      const params = new URLSearchParams({
        teamId: teamId
      })
      
      if (slackUserId) {
        params.append('slackUserId', slackUserId)
      }

      const response = await fetch(`/api/dashboard/links?${params.toString()}`)
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
      <Layout currentPage="dashboard">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-20">
            <LoadingSpinner size="lg" message="Loading your podcast library..." />
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout currentPage="dashboard">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-20">
            <Card className="bg-red-50 border-red-200 text-red-800 max-w-md mx-auto" padding="lg">
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
                <p className="text-sm">{error}</p>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="dashboard">
      <div className="container mx-auto px-6 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                🎧 <span>Audio Library</span>
              </h1>
              <p className="text-gray-600 text-lg">Your personalized podcast-style content collection</p>
            </div>
            
            {/* Global Player Controls */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200" padding="base">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={playPrevious}
                  disabled={currentIndex === 0}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-100"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
                <Button 
                  onClick={playNext}
                  disabled={currentIndex >= links.filter(l => l.audioFileUrl && l.processingStatus === 'COMPLETED').length - 1}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-100"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414zm6 0a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Button>
                <div className="text-center">
                  <div className="text-xs text-gray-500 font-medium">Total Episodes</div>
                  <div className="text-xl font-bold text-blue-600">{links.length}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Stats Overview */}
        {links.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Episodes"
              value={links.length}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
              gradient="blue"
            />
            <StatCard
              title="Completed"
              value={links.filter(l => l.listens.some(listen => listen.completed)).length}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
              gradient="green"
            />
            <StatCard
              title="Total Listens"
              value={links.reduce((sum, link) => sum + link.listens.length, 0)}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              }
              gradient="purple"
            />
            <StatCard
              title="Processing"
              value={links.filter(l => l.processingStatus === 'PROCESSING').length}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
              gradient="orange"
            />
          </div>
        )}
        
        {links.length === 0 ? (
          <div className="text-center py-20">
            <Card className="max-w-lg mx-auto text-center" padding="lg">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No episodes yet</h3>
              <p className="text-gray-600 mb-6">Share some links in Slack to get started with your audio library!</p>
              <Button className="mx-auto">
                Learn How It Works
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link, index) => {
              const progress = getListenProgress(link)
              const availableLinks = links.filter(l => l.audioFileUrl && l.processingStatus === 'COMPLETED')
              const linkIndex = availableLinks.findIndex(l => l.id === link.id)
              const isCurrentTrack = currentlyPlaying === link.id
              
              return (
                <div key={link.id} id={`link-${link.id}`}>
                  <AudioPlayer
                    link={link}
                    isCurrentTrack={isCurrentTrack}
                    isPlaying={isPlaying}
                    currentTime={currentTime[link.id] || 0}
                    duration={duration[link.id] || 59}
                    progress={progress}
                    onPlay={() => playAudio(link.id, linkIndex)}
                  />
                  
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
    </Layout>
  )
}