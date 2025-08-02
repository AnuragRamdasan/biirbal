'use client'

import { useEffect, useState, useRef } from 'react'

// Add CSS animation for slide down effect
const slideDownKeyframes = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
      max-height: 0;
    }
    to {
      opacity: 1;
      transform: translateY(0);
      max-height: 500px;
    }
  }
`

// Inject the keyframes into the document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = slideDownKeyframes
  document.head.appendChild(style)
}
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Typography, 
  Space, 
  Spin, 
  Alert, 
  Switch, 
  Empty,
  Badge,
  Tooltip,
  Select,
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  LinkOutlined,
  SoundOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  ReadOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { useAnalytics } from '@/hooks/useAnalytics'

const { Title, Text } = Typography

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
  source?: string | null
  channel?: {
    channelName: string | null
    slackChannelId: string
  }
}

interface DashboardStats {
  totalLinks: number
  completedLinks: number
  totalListens: number
  totalMinutesCurated: number
  totalMinutesListened: number
  timestamp: string
}

interface AudioListen {
  id: string
  listenedAt: string
  completed: boolean
  listenDuration: number | null
  resumePosition?: number | null
}

export default function Dashboard() {
  const [links, setLinks] = useState<ProcessedLink[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [showListened, setShowListened] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({})
  const [usageWarning, setUsageWarning] = useState<string | null>(null)
  const [linkLimitExceeded, setLinkLimitExceeded] = useState<boolean>(false)
  const [isExceptionTeam, setIsExceptionTeam] = useState<boolean>(false)
  const [userCanConsume, setUserCanConsume] = useState<boolean>(true)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null)
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  const audioStartTimes = useRef<Record<string, number>>({})
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)
  const completedListens = useRef<Set<string>>(new Set())
  const currentListenRecord = useRef<string | null>(null)
  const currentPlayingLinkId = useRef<string | null>(null)
  
  // Initialize analytics
  const analytics = useAnalytics({
    autoTrackPageViews: true,
    trackScrollDepth: true,
    trackTimeOnPage: true
  })

  useEffect(() => {
    fetchData()
    
    // Set up auto-refresh every 30 seconds
    refreshInterval.current = setInterval(() => {
      fetchData()
    }, 30000) // 30 seconds
    
    // Check if mobile
    const checkIfMobile = () => setIsMobile(window.innerWidth <= 768)
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
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
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current)
      }
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [])

  // Reset source filter if the selected option is no longer available
  useEffect(() => {
    if (sourceFilter !== 'all' && links.length > 0) {
      const availableOptions = getChannelOptions()
      if (!availableOptions.includes(sourceFilter)) {
        setSourceFilter('all')
      }
    }
  }, [links, sourceFilter])

  // Load audio durations for completed links
  useEffect(() => {
    const loadAudioDurations = async () => {
      const completedLinks = links.filter(link => 
        link.processingStatus === 'COMPLETED' && 
        link.audioFileUrl &&
        !audioDurations[link.id]
      )
      
      for (const link of completedLinks) {
        try {
          const audio = new Audio(link.audioFileUrl)
          audio.addEventListener('loadedmetadata', () => {
            setAudioDurations(prev => ({
              ...prev,
              [link.id]: audio.duration
            }))
          })
          audio.load()
        } catch (error) {
          console.error('Failed to load audio metadata for link', link.id, error)
        }
      }
    }
    
    if (links.length > 0) {
      loadAudioDurations()
    }
  }, [links, audioDurations])

  const fetchLinks = async () => {
    try {
      // Get user ID from localStorage
      const userId = localStorage.getItem('biirbal_user_id')
      
      if (!userId) {
        throw new Error('No user found. Please log in again.')
      }

      // Build URL with query parameters
      const params = new URLSearchParams({
        userId: userId
      })

      const response = await fetch(`/api/dashboard/links?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch links')
      }
      const data = await response.json()
      setLinks(data.links)
      
      // Check usage stats and warnings
      await checkUsageWarnings(teamId, userId)
      
      // Track dashboard visit with analytics
      analytics.trackDashboard(teamId, userId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      await fetchData() // This will refresh both links and stats
    } catch (err) {
      console.error('Failed to refresh stats:', err)
    }
  }

  const checkUsageWarnings = async (teamId: string, userId: string | null) => {
    try {
      // Include userId in the request for user-specific access control
      const params = new URLSearchParams({ teamId })
      if (userId) {
        params.append('userId', userId)
      }
      
      const response = await fetch(`/api/dashboard/usage?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setUsageWarning(data.warning)
        setLinkLimitExceeded(data.linkLimitExceeded || false)
        setIsExceptionTeam(data.isExceptionTeam || false)
        setUserCanConsume(data.userCanConsume !== false) // Default to true if not provided
        
        // Set analytics user properties
        analytics.setUser({
          team_id: teamId,
          user_id: localStorage.getItem('biirbal_user_id') || undefined,
          plan_type: data.plan?.id || 'free',
          team_size: data.currentUsers || 1,
          monthly_usage: data.currentLinks || 0,
          usage_percentage: data.linkUsagePercentage || 0,
          is_exception_team: data.isExceptionTeam || false
        })
        
        // Track usage patterns
        if (data.currentLinks && data.plan?.monthlyLinkLimit) {
          analytics.trackUsage('monthly_links', data.currentLinks, data.plan.monthlyLinkLimit)
        }
        
        if (data.currentUsers && data.plan?.userLimit) {
          analytics.trackUsage('team_users', data.currentUsers, data.plan.userLimit)
        }
      }
    } catch (error) {
      console.error('Failed to check usage warnings:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const userId = localStorage.getItem('biirbal_user_id')
      
      if (!userId) {
        return
      }

      const response = await fetch(`/api/dashboard/stats?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchData = async () => {
    await Promise.all([fetchLinks(), fetchStats()])
  }

  const trackListen = async (linkId: string): Promise<{ listen: any } | null> => {
    try {
      // Get the current user ID from localStorage
      const userId = localStorage.getItem('biirbal_user_id')
      
      const requestBody = { 
        linkId: linkId,
        userId: userId
      }
      
      const response = await fetch('/api/dashboard/track-listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        throw new Error('Failed to track listen')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to track listen:', error)
      return null
    }
  }

  const updateListenProgress = async (listenId: string, currentTime: number, completed: boolean = false, completionPercentage?: number) => {
    try {
      const linkId = currentPlayingLinkId.current
      
      if (!linkId) {
        console.error('❌ Cannot update progress: linkId is null')
        return null
      }

      // Calculate actual listening duration from start time
      const actualListenDuration = audioStartTimes.current[linkId] 
        ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
        : currentTime

      const payload = {
        linkId: linkId,
        listenId: listenId,
        duration: actualListenDuration,
        currentTime: currentTime,
        completed: completed,
        completionPercentage: completionPercentage
      }



      const response = await fetch('/api/dashboard/update-listen-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Progress update failed:', response.status, errorText)
        throw new Error(`Failed to update progress: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      
      // If link was archived, refresh the data to reflect changes
      if (result.archived) {

        setTimeout(() => fetchData(), 1000) // Refresh after a short delay
      }

      return result
    } catch (error) {
      console.error('❌ Failed to update listen progress:', error)
      return null
    }
  }

  const handlePlayAudio = async (linkId: string, audioUrl: string) => {
    // Prevent multiple simultaneous play attempts
    if (loadingAudio === linkId) {
      return
    }
    
    // Set loading state immediately
    setLoadingAudio(linkId)
    
    try {
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause()
        if (currentListenRecord.current && progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
          await updateListenProgress(currentListenRecord.current, audioElement.currentTime, false)
        }
      }

      // Reset progress state
      setCurrentTime(0)
      setProgress(0)
      setDuration(0)

      // Track listen and get resume position
      const trackResult = await trackListen(linkId)
      if (!trackResult) {
        console.error('Failed to start tracking listen')
        setLoadingAudio(null)
        return
      }

      const listenRecord = trackResult.listen
      currentListenRecord.current = listenRecord.id
      currentPlayingLinkId.current = linkId

      // Create new audio element
      const audio = new Audio(audioUrl)
      audioStartTimes.current[linkId] = Date.now()
      
      // Clean up completion tracking for this audio
      if (listenRecord.id) {
        completedListens.current.delete(listenRecord.id)
      }
    
    // Add event listeners for progress tracking
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      
      // Resume from saved position if available
      const resumePosition = listenRecord.resumePosition || 0
      if (resumePosition > 0 && resumePosition < audio.duration - 5) {
        audio.currentTime = resumePosition
        setCurrentTime(resumePosition)
        setProgress(resumePosition / audio.duration)
      }
      
      // Track audio play event
      analytics.trackAudioPlay(linkId, audio.duration, 'dashboard')
    })
    
    audio.addEventListener('timeupdate', async () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration > 0) {
        const progressPercentage = (audio.currentTime / audio.duration) * 100
        setProgress(audio.currentTime / audio.duration)
        
        // Mark as completed when user reaches 85% of the audio
        if (progressPercentage >= 85 && currentListenRecord.current && !completedListens.current.has(currentListenRecord.current)) {
          completedListens.current.add(currentListenRecord.current)
          
          // Update listen record as completed
          await updateListenProgress(currentListenRecord.current, audio.currentTime, true, progressPercentage)
          
          // Clear the record so we don't mark it completed multiple times
          currentListenRecord.current = null
          currentPlayingLinkId.current = null
            
          // Refresh stats to update listen counts
          await refreshStats()
        }
      }
    })
    
    audio.addEventListener('ended', async () => {
      const listenDuration = audioStartTimes.current[linkId] 
        ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
        : audio.duration
      
      // Track audio completion
      analytics.trackAudioComplete(linkId, 100, listenDuration)
      
      // Mark listen as completed (only if not already marked at 85%)
      if (currentListenRecord.current && !completedListens.current.has(currentListenRecord.current)) {
        completedListens.current.add(currentListenRecord.current)
        try {
          await updateListenProgress(currentListenRecord.current, audio.currentTime, true, 100)
        } catch (error) {
          console.error('Failed to update listen completion:', error)
        }
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      }
      
      // Refresh stats to update listen counts and minutes listened
      await refreshStats()
      
      setCurrentlyPlaying(null)
      setAudioElement(null)
      currentListenRecord.current = null
      currentPlayingLinkId.current = null
      setCurrentTime(0)
      setProgress(0)
      setDuration(0)
      setLoadingAudio(null) // Clear loading state when track ends
    })
    
      audio.addEventListener('error', () => {
        console.error('Audio playback failed')
        analytics.trackFeature('audio_play_error', { link_id: linkId })
        setCurrentlyPlaying(null)
        setAudioElement(null)
        currentListenRecord.current = null
        currentPlayingLinkId.current = null
        setCurrentTime(0)
        setProgress(0)
        setDuration(0)
        setLoadingAudio(null) // Clear loading state on error
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      })

      // Start playing
      audio.play().then(() => {
        setCurrentlyPlaying(linkId)
        setAudioElement(audio)
        setLoadingAudio(null) // Clear loading state on success
        
        // Set up periodic progress updates
        progressUpdateInterval.current = setInterval(async () => {
          try {
            if (audio.duration > 0 && currentListenRecord.current && !audio.paused) {
              const completionPercentage = (audio.currentTime / audio.duration) * 100
              
              const result = await updateListenProgress(currentListenRecord.current, audio.currentTime, false, completionPercentage)
              
              if (!result) {
                console.warn('⚠️ Progress update returned null - network or server error')
              }
              
              // Refresh stats every minute of listening
              const currentListenDuration = audioStartTimes.current[linkId] 
                ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
                : 0
              
              if (currentListenDuration > 0 && Math.floor(currentListenDuration) % 60 === 0) {
                await refreshStats()
              }
            }
            
            if (audio.duration > 0 && currentListenRecord.current && !audio.paused) {
              const completionPercentage = (audio.currentTime / audio.duration) * 100

              
              const result = await updateListenProgress(currentListenRecord.current, audio.currentTime, false, completionPercentage)
              
              if (!result) {
                console.warn('⚠️ Progress update returned null - network or server error')
              }
              
              // Refresh stats every minute of listening
              const currentListenDuration = audioStartTimes.current[linkId] 
                ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
                : 0
              
              if (currentListenDuration > 0 && Math.floor(currentListenDuration) % 60 === 0) {
                await refreshStats()
              }
            } else {

            }
          } catch (error) {
            console.error('❌ Error in progress update interval:', error)
          }
        }, 5000) // Update every 5 seconds
        
      }).catch((error) => {
        console.error('Failed to play audio:', error)
        analytics.trackFeature('audio_play_error', { link_id: linkId, error: error.message })
        setCurrentlyPlaying(null)
        setAudioElement(null)
        currentListenRecord.current = null
        currentPlayingLinkId.current = null
        setCurrentTime(0)
        setProgress(0)
        setDuration(0)
        setLoadingAudio(null) // Clear loading state on error
      })
    } catch (error) {
      console.error('Error in handlePlayAudio:', error)
      setLoadingAudio(null) // Clear loading state on any error
    }
  }

  const handlePauseAudio = async () => {
    if (audioElement && currentlyPlaying) {
      const listenDuration = audioStartTimes.current[currentlyPlaying] 
        ? (Date.now() - audioStartTimes.current[currentlyPlaying]) / 1000 
        : 0
      const completionPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0
      
      // Save current progress
      if (currentListenRecord.current) {
        await updateListenProgress(currentListenRecord.current, audioElement.currentTime, false, completionPercentage)
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      }
      
      // Track partial completion if user listened to some of the audio
      if (completionPercentage > 10) {
        analytics.trackAudioComplete(currentlyPlaying, completionPercentage, listenDuration)
      }
      
      // Refresh stats if user listened for more than 30 seconds or 50% completion
      if (listenDuration > 30 || completionPercentage > 50) {
        await refreshStats()
      }
      
      analytics.trackFeature('audio_paused', { 
        link_id: currentlyPlaying, 
        completion_percentage: completionPercentage,
        listen_duration: listenDuration
      })
      
      audioElement.pause()
      setCurrentlyPlaying(null)
      setAudioElement(null)
      currentListenRecord.current = null
      setCurrentTime(0)
      setProgress(0)
      setDuration(0)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'PROCESSING':
        return <LoadingOutlined style={{ color: '#1890ff' }} />
      case 'FAILED':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />
    }
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSourceDisplay = (record: ProcessedLink) => {
    if (record.source === 'chrome') {
      return {
        text: 'Chrome Extension',
        icon: '🌐',
        color: '#4285f4'
      }
    } else {
      // Default to Slack source
      return {
        text: record.channel?.channelName ? `#${record.channel.channelName}` : 'Slack',
        icon: '💬',
        color: '#4a154b'
      }
    }
  }

  const getListenCount = (link: ProcessedLink) => {
    return link.listens?.length || 0
  }

  const hasUserListened = (link: ProcessedLink) => {
    // Only consider articles as "listened" if they have at least one completed listen
    return link.listens && link.listens.some(listen => listen.completed === true)
  }

  // Stats are now fetched from API and stored in stats state



  // Get unique channel names for filter options
  const getChannelOptions = () => {
    const channels = new Set<string>()
    links.forEach(link => {
      if (link.source === 'chrome') {
        channels.add('chrome')
      } else if (link.channel?.channelName) {
        channels.add(link.channel.channelName)
      }
    })
    return Array.from(channels).sort()
  }

  // Filter links based on the toggle and source filter
  const filteredLinks = links
    .filter(link => {
      // First apply the source filter
      if (sourceFilter === 'all') {
        return true
      } else if (sourceFilter === 'chrome') {
        return link.source === 'chrome'
      } else {
        // Filter by channel name
        return link.channel?.channelName === sourceFilter
      }
    })
    .filter(link => {
      // Then apply the listened filter
      return showListened ? true : !hasUserListened(link)
    })



  if (loading) {
    return (
      <Layout currentPage="dashboard">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Loading your audio summaries...</Text>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout currentPage="dashboard">
        <div style={{ maxWidth: 600, margin: '50px auto', padding: '0 16px' }}>
          <Alert
            message="Error Loading Dashboard"
            description={error}
            type="error"
            showIcon
            action={
              <Button type="primary" size="small" onClick={fetchData}>
                Retry
              </Button>
            }
          />
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPage="dashboard">
      <div style={{ 
        padding: isMobile ? '24px 16px' : '32px 24px', 
        maxWidth: 1400, 
        margin: '0 auto',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        minHeight: '100vh'
      }}>
        {/* Exception Team Banner */}
        {isExceptionTeam && (
          <div style={{
            background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(82, 196, 26, 0.15)',
            border: '1px solid rgba(82, 196, 26, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircleOutlined style={{ color: 'white', fontSize: '16px' }} />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                  Complimentary Access
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                  🎉 You're using Biirbal with complimentary access! No usage limits apply to your team.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Warning */}
        {usageWarning && !isExceptionTeam && (
          <div style={{
            background: 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(250, 173, 20, 0.15)',
            border: '1px solid rgba(250, 173, 20, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExclamationCircleOutlined style={{ color: 'white', fontSize: '16px' }} />
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                    Usage Warning
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                    {usageWarning}
                  </div>
                </div>
              </div>
              <Button 
                size="small" 
                href="/pricing"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: 500
                }}
              >
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}

        {/* User Access Restricted Alert */}
        {!userCanConsume && !isExceptionTeam && (
          <div style={{
            background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(255, 77, 79, 0.15)',
            border: '1px solid rgba(255, 77, 79, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExclamationCircleOutlined style={{ color: 'white', fontSize: '16px' }} />
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                    Access Restricted
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                    Your access to audio playback has been disabled because the team has exceeded its seat limit. Contact your admin to upgrade the plan or manage team members.
                  </div>
                </div>
              </div>
              <Space>
                <Button 
                  size="small" 
                  href="/team"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: 500
                  }}
                >
                  Manage Team
                </Button>
                <Button 
                  size="small" 
                  href="/pricing" 
                  type="primary"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    color: '#ff4d4f',
                    borderRadius: '8px',
                    fontWeight: 600
                  }}
                >
                  View Plans
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* Link Limit Exceeded Alert */}
        {linkLimitExceeded && !isExceptionTeam && userCanConsume && (
          <div style={{
            background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(255, 77, 79, 0.15)',
            border: '1px solid rgba(255, 77, 79, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ExclamationCircleOutlined style={{ color: 'white', fontSize: '16px' }} />
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                    Playback Restricted
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                    You've exceeded your monthly link limit. Audio playback is disabled. Links will continue to be processed and posted to Slack.
                  </div>
                </div>
              </div>
              <Button 
                size="small" 
                href="/pricing" 
                type="primary"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  color: '#ff4d4f',
                  borderRadius: '8px',
                  fontWeight: 600
                }}
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        )}

        {/* Modern Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Accent */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }} />
          
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ 
                margin: 0, 
                fontSize: '24px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                <Space size="small">
                  <SoundOutlined style={{ fontSize: '24px' }} />
                  Audio Summaries
                </Space>
              </Title>
            </Col>
            <Col xs={24} sm={24} md={16} lg={18}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#1890ff',
                      marginBottom: '4px'
                    }}>
                      {stats?.totalLinks ?? links.length}
                    </div>
                    <Text style={{ fontSize: '12px', color: '#666' }}>Total</Text>
                  </div>
                </Col>
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#722ed1',
                      marginBottom: '4px'
                    }}>
                      {stats?.totalListens ?? links.reduce((total, link) => total + getListenCount(link), 0)}
                    </div>
                    <Text style={{ fontSize: '12px', color: '#666' }}>Listens</Text>
                  </div>
                </Col>
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#52c41a',
                      marginBottom: '4px'
                    }}>
                      {stats?.totalMinutesCurated ?? 0}
                    </div>
                    <Text style={{ fontSize: '12px', color: '#666' }}>Min Curated</Text>
                  </div>
                </Col>
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#fa8c16',
                      marginBottom: '4px'
                    }}>
                      {stats?.totalMinutesListened ?? 0}
                    </div>
                    <Text style={{ fontSize: '12px', color: '#666' }}>Min Listened</Text>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>

        {/* Modern Filter Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)'
        }}>
          <Row justify="end">
            <Col>
              <Space size="large">
                {/* Source Filter */}
                <Space size="small">
                  <Text style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>Filter:</Text>
                  <Select
                    size="middle"
                    value={sourceFilter}
                    onChange={(value) => {
                      setSourceFilter(value)
                      analytics.trackFeature('source_filter_change', { 
                        source_filter: value 
                      })
                    }}
                    style={{ 
                      width: 180,
                      borderRadius: '8px'
                    }}
                    options={[
                      { value: 'all', label: '🔗 All Sources' },
                      ...getChannelOptions().map(channel => ({
                        value: channel,
                        label: channel === 'chrome' ? '🌐 Chrome' : `💬 #${channel}`
                      }))
                    ]}
                  />
                </Space>
                
                {/* Show Archived Toggle */}
                <Space size="small">
                  <Text style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>Show Archived:</Text>
                  <Switch
                    size="default"
                    checked={showListened}
                    onChange={(checked) => {
                      setShowListened(checked)
                      analytics.trackFeature('toggle_show_listened', { 
                        show_listened: checked 
                      })
                    }}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                  />
                </Space>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Modern Card-based Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredLinks.length === 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              borderRadius: '20px',
              padding: '60px 24px',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)'
            }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ 
                    fontSize: '16px',
                    color: '#666',
                    marginTop: '16px'
                  }}>
                    {showListened 
                      ? "No audio summaries available yet."
                      : "No unlistened links. Toggle 'Show All' to see all links including listened ones."
                    }
                  </span>
                }
                style={{ padding: '20px 0' }}
              />
            </div>
          ) : (
            filteredLinks.map((record) => (
              <div 
                key={record.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: currentlyPlaying === record.id 
                    ? '2px solid #1890ff' 
                    : '1px solid rgba(102, 126, 234, 0.1)',
                  borderRadius: '20px',
                  padding: '24px',
                  opacity: hasUserListened(record) ? 0.8 : 1,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: currentlyPlaying === record.id
                    ? '0 12px 40px rgba(24, 144, 255, 0.2)'
                    : '0 8px 24px rgba(0, 0, 0, 0.06)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={async () => {
                  if (record.processingStatus === 'COMPLETED' && record.audioFileUrl) {
                    // Check access restrictions and loading state
                    if ((!userCanConsume || linkLimitExceeded) && !isExceptionTeam) return
                    if (loadingAudio === record.id) return
                    
                    if (currentlyPlaying === record.id) {
                      await handlePauseAudio()
                    } else {
                      await handlePlayAudio(record.id, record.audioFileUrl)
                    }
                  }
                }}
              >
                {/* Background Accent for Playing State */}
                {currentlyPlaying === record.id && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Left Column - Image and Info */}
                  <div style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* OG Image */}
                    <div style={{ 
                      width: 60, 
                      height: 60, 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {record.ogImage ? (
                        <img 
                          src={record.ogImage} 
                          alt={record.title || 'Article'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <LinkOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
                      )}
                    </div>
                    
                    {/* Title and URL */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ 
                          fontSize: 16, 
                          fontWeight: 600, 
                          color: '#262626',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          marginBottom: 4
                        }}>
                          {record.title || 'Untitled'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 4,
                              fontSize: 11,
                              color: getSourceDisplay(record).color,
                              backgroundColor: `${getSourceDisplay(record).color}15`,
                              padding: '2px 6px',
                              borderRadius: '12px',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              const source = getSourceDisplay(record)
                              analytics.trackFeature('source_badge_click', { 
                                link_id: record.id,
                                source: record.source,
                                channel_name: record.channel?.channelName,
                                source_text: source.text
                              })
                            }}
                          >
                            <span>{getSourceDisplay(record).icon}</span>
                            <span>{getSourceDisplay(record).text}</span>
                          </div>
                          {hasUserListened(record) && (
                            <Badge 
                              count="✓" 
                              style={{ backgroundColor: '#52c41a', fontSize: 10 }}
                            />
                          )}
                        </div>
                      </div>
                      <a 
                        href={record.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation()
                          analytics.trackFeature('source_link_click', { 
                            link_id: record.id,
                            source_url: record.url,
                            domain: new URL(record.url).hostname
                          })
                        }}
                        style={{ 
                          fontSize: 12, 
                          color: '#1890ff',
                          marginBottom: 8,
                          wordBreak: 'break-all',
                          lineHeight: 1.3,
                          maxHeight: '2.6em',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          textDecoration: 'none',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#40a9ff'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#1890ff'}
                      >
                        {record.url}
                      </a>
                      
                      {/* Status and Stats Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        {/* Status - Only show when processing */}
                        {record.processingStatus === 'PROCESSING' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {getStatusIcon(record.processingStatus)}
                            <Text style={{ fontSize: 12, color: '#1890ff' }}>
                              Processing...
                            </Text>
                          </div>
                        )}
                        
                        {/* Listen Count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <EyeOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                          <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                            {getListenCount(record)} listens
                          </Text>
                        </div>
                        
                        {/* Created Date */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CalendarOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                          <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                            {formatDate(record.createdAt)}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Audio Controls */}
                  <div style={{ flexShrink: 0, minWidth: 120 }}>
                    {record.processingStatus === 'COMPLETED' && record.audioFileUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Play Button */}
                          <Tooltip 
                            title={
                              (!userCanConsume && !isExceptionTeam) ? "Access disabled due to seat limit exceeded. Contact admin to upgrade plan." :
                              ((linkLimitExceeded && !isExceptionTeam) ? "Monthly limit exceeded. Upgrade your plan to access playback." : "Play audio summary")
                            }
                          >
                            <Button
                              type="primary"
                              shape="circle"
                              size="large"
                              disabled={(!userCanConsume || linkLimitExceeded) && !isExceptionTeam}
                              loading={loadingAudio === record.id}
                              icon={
                                loadingAudio === record.id ? <LoadingOutlined /> :
                                currentlyPlaying === record.id ? <PauseCircleOutlined /> : 
                                <PlayCircleOutlined />
                              }
                              onClick={async (e) => {
                                e.stopPropagation()
                                // Prevent action if disabled, loading, or access restricted
                                if ((!userCanConsume || linkLimitExceeded) && !isExceptionTeam) return
                                if (loadingAudio === record.id) return
                                
                                if (currentlyPlaying === record.id) {
                                  await handlePauseAudio()
                                } else {
                                  await handlePlayAudio(record.id, record.audioFileUrl!)
                                }
                              }}
                              style={{
                                background: ((!userCanConsume || linkLimitExceeded) && !isExceptionTeam) ? '#d9d9d9' : (currentlyPlaying === record.id ? '#ff4d4f' : '#52c41a'),
                                borderColor: ((!userCanConsume || linkLimitExceeded) && !isExceptionTeam) ? '#d9d9d9' : (currentlyPlaying === record.id ? '#ff4d4f' : '#52c41a'),
                                opacity: ((!userCanConsume || linkLimitExceeded) && !isExceptionTeam) ? 0.6 : 1
                              }}
                            />
                          </Tooltip>
                          
                          {/* Progress Info */}
                          <div style={{ textAlign: 'center', minWidth: 80 }}>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                              {currentlyPlaying === record.id ? formatTime(currentTime) : '0:00'} / {currentlyPlaying === record.id && duration > 0 ? formatTime(duration) : (audioDurations[record.id] ? formatTime(audioDurations[record.id]) : '--:--')}
                            </div>
                            <div style={{ 
                              width: '100%', 
                              height: 4, 
                              backgroundColor: '#f0f0f0', 
                              borderRadius: 2,
                              marginTop: 4
                            }}>
                              <div style={{ 
                                width: currentlyPlaying === record.id ? `${progress * 100}%` : '0%', 
                                height: '100%', 
                                backgroundColor: '#1890ff', 
                                borderRadius: 2,
                                transition: 'width 0.1s ease'
                              }} />
                            </div>
                          </div>
                        </div>
                        
                        {/* Read Summary Button */}
                        {record.ttsScript && (
                          <Tooltip title="Read text summary">
                            <Button
                              type="default"
                              size="small"
                              icon={<ReadOutlined />}
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedSummary(expandedSummary === record.id ? null : record.id)
                                analytics.trackFeature('read_summary_toggle', { 
                                  link_id: record.id,
                                  expanded: expandedSummary !== record.id
                                })
                              }}
                              style={{
                                fontSize: 12,
                                height: 28,
                                background: expandedSummary === record.id ? '#1890ff' : 'transparent',
                                color: expandedSummary === record.id ? 'white' : '#1890ff',
                                borderColor: '#1890ff'
                              }}
                            >
                              Read Summary
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: 80,
                        backgroundColor: '#fafafa',
                        borderRadius: 8,
                        border: '1px dashed #d9d9d9'
                      }}>
                        {record.processingStatus === 'PROCESSING' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Spin size="small" />
                            <Text type="secondary" style={{ fontSize: 12 }}>Processing...</Text>
                          </div>
                        ) : record.processingStatus === 'FAILED' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                            <Text type="danger" style={{ fontSize: 12 }}>Failed</Text>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ClockCircleOutlined style={{ color: '#faad14' }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>Pending</Text>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Expandable Summary Panel */}
                {expandedSummary === record.id && record.ttsScript && (
                  <div style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid #f0f0f0',
                    animation: 'slideDown 0.3s ease-out',
                    opacity: 1,
                    transform: 'translateY(0)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ReadOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                        <Text strong style={{ fontSize: 14, color: '#262626' }}>
                          Text Summary
                        </Text>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedSummary(null)
                        }}
                        style={{ color: '#8c8c8c' }}
                      />
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: 16,
                      alignItems: 'flex-start'
                    }}>
                      {/* Summary Text */}
                      <div style={{ 
                        flex: 1,
                        backgroundColor: '#fafafa',
                        padding: 16,
                        borderRadius: 8,
                        border: '1px solid #f0f0f0'
                      }}>
                        <Text style={{ 
                          fontSize: 13, 
                          lineHeight: 1.6, 
                          color: '#595959',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {record.ttsScript}
                        </Text>
                      </div>
                      
                      {/* Original Link Card */}
                      <div style={{ 
                        width: isMobile ? '100%' : 200,
                        flexShrink: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #e6f7ff',
                        borderRadius: 8,
                        padding: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <LinkOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                          <Text style={{ fontSize: 12, fontWeight: 600, color: '#1890ff' }}>
                            Original Article
                          </Text>
                        </div>
                        
                        {record.ogImage && (
                          <img 
                            src={record.ogImage} 
                            alt={record.title || 'Article'}
                            style={{ 
                              width: '100%', 
                              height: 80, 
                              objectFit: 'cover',
                              borderRadius: 4,
                              marginBottom: 8
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 500, 
                          color: '#262626',
                          marginBottom: 6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {record.title || 'Untitled'}
                        </div>
                        
                        <a 
                          href={record.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation()
                            analytics.trackFeature('summary_panel_link_click', { 
                              link_id: record.id,
                              source_url: record.url
                            })
                          }}
                          style={{ 
                            fontSize: 11, 
                            color: '#1890ff',
                            textDecoration: 'none',
                            wordBreak: 'break-all',
                            lineHeight: 1.3,
                            maxHeight: '2.6em',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          Read Full Article →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </Layout>
  )
}