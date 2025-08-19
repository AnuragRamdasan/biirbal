'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef, Suspense } from 'react'
import Script from 'next/script'
// Removed web platform-specific imports
import { 
  Row, 
  Col, 
  Button, 
  Card, 
  Typography, 
  Space, 
  Alert, 
  Statistic, 
  Badge,
  Divider,
  List,
  Timeline,
  Switch,
  Empty,
  Tooltip,
  Select,
  Slider,
} from 'antd'
import {
  SoundOutlined,
  GlobalOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  LinkOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ClockCircleOutlined,
  ReadOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  BulbOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  CloseOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  FastBackwardOutlined,
  PauseOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { useAnalytics } from '@/hooks/useAnalytics'
import { ExtensionButton } from '@/components/ExtensionButton'
import { HeroSection } from '@/components/landing/HeroSection'
import { ExtensionHeaderSection } from '@/components/landing/ExtensionHeaderSection'
import { ConversionStatsSection } from '@/components/landing/ConversionStatsSection'
import { ProblemAgitationSection } from '@/components/landing/ProblemAgitationSection'
import { BenefitsSection } from '@/components/landing/BenefitsSection'
// Removed team selector component

const { Title, Text, Paragraph } = Typography

// Format large numbers with K, M, B suffixes
const formatLargeNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// Smooth transitions without layout shifts
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .smooth-expand {
      transition: opacity 0.2s ease-in-out;
    }
  `
  document.head.appendChild(style)
}

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
    channelId: string
  }
}

interface DashboardStats {
  totalLinks: number
  completedLinks: number
  totalListens: number
  totalMinutesCurated: number
  totalMinutesListened: number
  totalWordsConsumed: number
  timestamp: string
}

interface AudioListen {
  id: string
  listenedAt: string
  completed: boolean
  listenDuration: number | null
  resumePosition?: number | null
}

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [devSession, setDevSession] = useState<any>(null)
  
  // Home page state
  const [installed, setInstalled] = useState(false)
  const [error, setError] = useState('')
  const [showDashboard, setShowDashboard] = useState(false)
  const [currentTeamId, setCurrentTeamId] = useState<string | undefined>(undefined)
  
  // Dashboard state
  const [links, setLinks] = useState<ProcessedLink[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [showListened, setShowListened] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
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
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  
  // Audio player state
  const [showAudioPlayer, setShowAudioPlayer] = useState(false)
  const [audioVolume, setAudioVolume] = useState(1)
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  const [currentTrackInfo, setCurrentTrackInfo] = useState<{id: string, title: string, url: string} | null>(null)
  
  // Dashboard refs
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

  // Conversion-focused landing page content
  const benefits = [
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: 'Stop Reading, Start Learning with AI',
      description: 'Our AI tool transforms any article into a 59-second audio summary automatically. Absorb key insights while multitasking or commuting.',
      stats: 'Save 3+ hours weekly',
      color: '#1890ff'
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: 'AI Kills Your Reading Backlog',
      description: 'Our AI tool turns your overwhelming reading list into manageable audio summaries. Finally catch up on industry news and research.',
      stats: 'Process 10x more content',
      color: '#52c41a'
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: 'AI Keeps You Ahead Without Burnout',
      description: 'Our AI tool keeps your team informed and competitive without the stress of endless articles. AI-powered knowledge becomes accessible to everyone.',
      stats: 'Zero information anxiety',
      color: '#722ed1'
    }
  ]

  const socialProof = [
    { text: '500+ readers trust Biirbal', icon: <GlobalOutlined /> },
    { text: '10,000+ hours saved monthly', icon: <ClockCircleOutlined /> },
    { text: '4.9/5 average rating', icon: <CheckCircleOutlined /> }
  ]

  const conversionStats = [
    { number: '59', unit: 'seconds', label: 'Average summary length' },
    { number: '90%', unit: '', label: 'Time saved per article' },
    { number: '24/7', unit: '', label: 'Always available' }
  ]

  // Authentication URLs
  const authSigninUrl = '/auth/signin'
  let webInstallUrl = authSigninUrl
  try {
    webInstallUrl = getWebInstallUrl()
  } catch (error) {
    console.warn('Web platform not configured, falling back to auth signin')
  }

  // Check for dev authentication first
  useEffect(() => {
    const checkDevAuth = async () => {
      try {
        // Check if URL has dev=true or devLogin=true parameter
        const urlParams = new URLSearchParams(window.location.search)
        const hasDevParam = urlParams.get('dev') === 'true' || urlParams.get('devLogin') === 'true'
        
        if (!hasDevParam) {
          return // Skip dev auth check if no dev parameter
        }
        
        // Pass current URL parameters to the dev-auth endpoint
        const currentUrl = new URL(window.location.href)
        const devAuthUrl = new URL('/api/dev-auth', window.location.origin)
        devAuthUrl.searchParams.set('dev', urlParams.get('dev') || urlParams.get('devLogin') || 'true')
        devAuthUrl.searchParams.set('t', Date.now().toString())
        
        const response = await fetch(devAuthUrl.toString())
        const result = await response.json()
        
        if (result.success && result.session) {
          setDevSession(result.session)
          setShowDashboard(true)
          setInstalled(true)
          
          const teamId = result.session.user.teamId
          if (!currentTeamId && teamId) {
            setCurrentTeamId(teamId)
          }
        }
      } catch (error) {
        // Silent fail for dev auth check
      }
    }
    
    checkDevAuth()
  }, [])

  // Authentication check using NextAuth
  useEffect(() => {
    // Skip if dev session is active
    if (devSession) {
      return
    }
    
    // Don't proceed if session is still loading
    if (status === 'loading') {
      return
    }

    // Handle OAuth errors
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || 'Authentication failed')
      return
    }

    // Handle web platform app installation success
    if (searchParams.get('installed') === 'true') {
      setInstalled(true)
    }

    // Check if user is authenticated via NextAuth
    if (session?.user) {
      setShowDashboard(true)
      setInstalled(true)
      
      // Initialize current team if not set
      if (!currentTeamId && session.user.currentTeam) {
        setCurrentTeamId(session.user.currentTeam.id)
      }
    }
  }, [searchParams, session, status, devSession])

  // Handle team change
  const handleTeamChange = (teamId: string) => {
    setCurrentTeamId(teamId)
    // Refresh dashboard data for the new team
    if (showDashboard) {
      fetchData(true)
    }
  }

  // Dashboard data fetching with loading state control
  const fetchData = async (isInitialLoad = false) => {
    const currentSession = devSession || session
    
    if (!showDashboard || (!currentSession?.user)) {
      return
    }
    
    try {
      // Only show loading spinner on initial load
      if (isInitialLoad) {
        setLoading(true)
        setInitialLoading(true)
      }
      
      const userId = currentSession.user.dbUserId || currentSession.user.id
      const teamId = currentTeamId || currentSession.user.currentTeam?.id
      
      if (!userId) {
        setShowDashboard(false)
        return
      }

      // Build query parameters
      const queryParams = new URLSearchParams({ userId })
      if (teamId) {
        queryParams.append('teamId', teamId)
      }

      const [linksResponse, statsResponse, usageResponse] = await Promise.all([
        fetch(`/api/dashboard/links?${queryParams}`),
        fetch(`/api/dashboard/stats?${queryParams}`),
        fetch(`/api/dashboard/usage?${queryParams}`)
      ])

      if (!linksResponse.ok || !statsResponse.ok || !usageResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [linksData, statsData, usageData] = await Promise.all([
        linksResponse.json(),
        statsResponse.json(),
        usageResponse.json()
      ])

      setLinks(linksData.links || [])
      setStats(statsData)
      setUsageWarning(usageData.message || null)
      setLinkLimitExceeded(usageData.linkLimitExceeded || false)
      setIsExceptionTeam(usageData.isExceptionTeam || false)
      setUserCanConsume(usageData.userCanConsume !== false)
      setDashboardError(null)
    } catch (error) {
      setDashboardError('Failed to load data')
    } finally {
      if (isInitialLoad) {
        setLoading(false)
        setInitialLoading(false)
      }
    }
  }

  // Load dashboard data when showDashboard becomes true or team changes
  useEffect(() => {
    if (showDashboard) {
      fetchData(true) // Initial load with spinner
      
      // Set up auto-refresh every 30 seconds without spinner
      refreshInterval.current = setInterval(() => {
        fetchData(false) // Background refresh without spinner
      }, 30000) // 30 seconds
      
      // Check if mobile
      const checkIfMobile = () => setIsMobile(window.innerWidth <= 768)
      checkIfMobile()
      window.addEventListener('resize', checkIfMobile)
      
      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current)
        }
        window.removeEventListener('resize', checkIfMobile)
      }
    }
  }, [showDashboard, currentTeamId, devSession, session])

  // Dashboard helper functions
  const trackListen = async (linkId: string) => {
    try {
      const currentSession = devSession || session
      const userId = currentSession?.user?.dbUserId || currentSession?.user?.id
      
      const requestBody = {
        linkId,
        userId
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
      return null
    }
  }

  const updateListenProgress = async (listenId: string, currentTime: number, completed: boolean = false, completionPercentage?: number) => {
    try {
      const linkId = currentPlayingLinkId.current
      
  
      
      if (!linkId) {
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
        throw new Error(`Failed to update progress: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      
      // No global archiving - completion is tracked per-user in audioListens
      // Refresh data to show updated listen status
      setTimeout(() => fetchData(false), 1000) // Background refresh after completion

      return result
    } catch (error) {
      return null
    }
  }

  const handlePlayAudio = async (linkId: string, audioUrl: string) => {
    
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
            return
      }

      const listenRecord = trackResult.listen
      currentListenRecord.current = listenRecord.id
      currentPlayingLinkId.current = linkId

      // Create new audio element
      const audio = new Audio(audioUrl)
      audioStartTimes.current[linkId] = Date.now()
      
      // Set up track info and show player
      const linkData = links.find(link => link.id === linkId)
      setCurrentTrackInfo({
        id: linkId,
        title: linkData?.title || 'Untitled',
        url: linkData?.url || ''
      })
      setShowAudioPlayer(true)
      
      // Clean up completion tracking for this audio
      if (listenRecord.id) {
        completedListens.current.delete(listenRecord.id)
      }
    
    // Add event listeners for progress tracking
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      
      // Set volume and playback rate
      audio.volume = audioVolume
      audio.playbackRate = audioPlaybackRate
      
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
          await fetchData(false)
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
          // Wait for the progress update to complete before cleaning up state
          const result = await updateListenProgress(currentListenRecord.current, audio.currentTime, true, 100)

        } catch (error) {
          // Silent fail
        }
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      } else {

      }
      
      // Clean up state AFTER the progress update completes
      
      setCurrentlyPlaying(null)
      setAudioElement(null)
      currentListenRecord.current = null
      currentPlayingLinkId.current = null
      setCurrentTime(0)
      setProgress(0)
      setDuration(0)
      
      // Refresh stats to update listen counts and minutes listened (after cleanup)
      
      await fetchData(false)
    })
    
      audio.addEventListener('error', () => {
        analytics.trackFeature('audio_play_error', { link_id: linkId })
        setCurrentlyPlaying(null)
        setAudioElement(null)
        currentListenRecord.current = null
        currentPlayingLinkId.current = null
        setCurrentTime(0)
        setProgress(0)
        setDuration(0)
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      })

      // Start playing
      audio.play().then(() => {
        setCurrentlyPlaying(linkId)
        setAudioElement(audio)
        
        // Set up periodic progress updates
        progressUpdateInterval.current = setInterval(async () => {
          try {
            if (audio.duration > 0 && currentListenRecord.current && !audio.paused) {
              const completionPercentage = (audio.currentTime / audio.duration) * 100
              
              const result = await updateListenProgress(currentListenRecord.current, audio.currentTime, false, completionPercentage)
              
              // Refresh stats every minute of listening
              const currentListenDuration = audioStartTimes.current[linkId] 
                ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
                : 0
              
              if (currentListenDuration > 0 && Math.floor(currentListenDuration) % 60 === 0) {
                await fetchData(false)
              }
            }
          } catch (error) {
            // Silent fail
          }
        }, 5000) // Update every 5 seconds
        
      }).catch((error) => {
        analytics.trackFeature('audio_play_error', { link_id: linkId, error: error.message })
        setCurrentlyPlaying(null)
        setAudioElement(null)
        currentListenRecord.current = null
        currentPlayingLinkId.current = null
        setCurrentTime(0)
        setProgress(0)
        setDuration(0)
      })
    } catch (error) {
      // Silent fail
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
        await fetchData(false)
      }
      
      setCurrentlyPlaying(null)
      // Keep player visible - don't reset other states when pausing
    }
  }

  // Audio player control functions
  const handleClosePlayer = async () => {
    if (audioElement) {
      audioElement.pause()
      if (currentListenRecord.current && progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current)
        await updateListenProgress(currentListenRecord.current, audioElement.currentTime, false)
      }
    }
    
    setShowAudioPlayer(false)
    setCurrentlyPlaying(null)
    setAudioElement(null)
    setCurrentTrackInfo(null)
    currentListenRecord.current = null
    currentPlayingLinkId.current = null
    setCurrentTime(0)
    setProgress(0)
    setDuration(0)
  }

  const handleRestartTrack = () => {
    if (audioElement) {
      audioElement.currentTime = 0
      setCurrentTime(0)
      setProgress(0)
    }
  }

  const handlePlayNext = async () => {
    if (!currentTrackInfo) return
    
    const currentIndex = links.findIndex(link => link.id === currentTrackInfo.id)
    if (currentIndex < links.length - 1) {
      const nextLink = links[currentIndex + 1]
      if (nextLink.processingStatus === 'COMPLETED' && nextLink.audioFileUrl) {
        await handlePlayAudio(nextLink.id, nextLink.audioFileUrl)
      }
    }
  }

  const handleVolumeChange = (volume: number) => {
    setAudioVolume(volume)
    if (audioElement) {
      audioElement.volume = volume
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    setAudioPlaybackRate(rate)
    if (audioElement) {
      audioElement.playbackRate = rate
    }
  }

  const getListenCount = (link: ProcessedLink) => {
    return link.listens?.length || 0
  }

  const hasUserListened = (link: ProcessedLink) => {
    // Only consider articles as "listened" if they have at least one completed listen
    return link.listens && link.listens.some(listen => listen.completed === true)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Render Dashboard content
  const renderDashboard = () => {
    // No loading states - just show data immediately

    if (dashboardError) {
      return (
        <Alert
          message="Error Loading Dashboard"
          description={dashboardError}
          type="error"
          showIcon
          style={{ margin: '40px 0' }}
        />
      )
    }

    const filteredLinks = links.filter(link => {
      if (sourceFilter === 'all') return true
      return link.source === sourceFilter || (sourceFilter === 'web' && !link.source)
    })

    // Get current user ID for filtering completed links
    const currentSession = devSession || session
    const currentUserId = currentSession?.user?.dbUserId || currentSession?.user?.id
    
    // Helper function to check if current user has completed this link
    const hasUserCompleted = (link: any) => {
      if (!currentUserId) return false
      return link.listens?.some((listen: any) => 
        listen.userId === currentUserId && listen.completed
      )
    }
    
    const visibleLinks = showListened 
      ? filteredLinks 
      : filteredLinks.filter(link => !hasUserListened(link))

    return (
      <Layout currentPage="dashboard" showHeader={true}>
        <div style={{ 
          padding: isMobile ? '12px 16px' : '16px 24px', 
          maxWidth: 1400, 
          margin: '0 auto'
        }}>
          {/* Usage Warning */}
          {usageWarning && (
            <Alert
              message="Usage Warning"
              description={usageWarning}
              type="warning"
              showIcon
              closable
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" href="/pricing">
                  Upgrade Plan
                </Button>
              }
            />
          )}

          {/* Team Selector */}
          {((devSession?.user?.teams || session?.user?.teams) && (devSession?.user?.teams?.length > 1 || session?.user?.teams?.length > 1)) && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <TeamSelector 
                onTeamChange={handleTeamChange}
                style={{ maxWidth: 400 }}
              />
            </Card>
          )}

          {/* Compact Header */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Title level={3} style={{ margin: 0, fontSize: 18 }}>
                  <Space size="small">
                    <SoundOutlined />
                    Audio Summaries
                    {((devSession?.user?.teams || session?.user?.teams) && (devSession?.user?.teams?.length > 1 || session?.user?.teams?.length > 1) && currentTeamId) && (
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        ({(devSession?.user?.teams || session?.user?.teams)?.find(t => t.id === currentTeamId)?.name})
                      </Text>
                    )}
                  </Space>
                </Title>
              </Col>
              <Col xs={24} sm={24} md={16} lg={18}>
                <Row gutter={[8, 8]} align="middle">
                  <Col xs={8} sm={8} md={4} lg={4}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 12 : 16, fontWeight: 'bold', color: '#1890ff' }}>
                        {stats?.totalLinks ? formatLargeNumber(stats.totalLinks) : formatLargeNumber(links.length)}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 8 : 10 }}>Total</Text>
                    </div>
                  </Col>
                  <Col xs={8} sm={8} md={4} lg={4}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 12 : 16, fontWeight: 'bold', color: '#722ed1' }}>
                        {stats?.totalListens ? formatLargeNumber(stats.totalListens) : formatLargeNumber(links.reduce((total, link) => total + getListenCount(link), 0))}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 8 : 10 }}>Listens</Text>
                    </div>
                  </Col>
                  <Col xs={8} sm={8} md={4} lg={4}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 12 : 16, fontWeight: 'bold', color: '#52c41a' }}>
                        {stats?.totalMinutesCurated ? formatLargeNumber(stats.totalMinutesCurated) : 0}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 8 : 10 }}>Min Curated</Text>
                    </div>
                  </Col>
                  <Col xs={8} sm={8} md={4} lg={4}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 12 : 16, fontWeight: 'bold', color: '#fa8c16' }}>
                        {stats?.totalMinutesListened ? formatLargeNumber(stats.totalMinutesListened) : 0}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 8 : 10 }}>Min Listened</Text>
                    </div>
                  </Col>
                  <Col xs={16} sm={8} md={4} lg={4}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 12 : 16, fontWeight: 'bold', color: '#eb2f96' }}>
                        {stats?.totalWordsConsumed ? formatLargeNumber(stats.totalWordsConsumed) : 0}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 8 : 10 }}>Words Consumed</Text>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* Filter Controls Row */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row justify="space-between" align="middle" wrap>
              <Col>
                <Space>
                  <Switch
                    size="small"
                    checked={showListened}
                    onChange={setShowListened}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                  />
                  <Text style={{ fontSize: 12 }}>Show listened</Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Links List - Row-based Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleLinks.length === 0 ? (
              <div>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ fontSize: 12 }}>
                      {showListened 
                        ? "No AI-powered audio summaries available yet. Try some publications below to see our AI tool in action!"
                        : "No unlistened AI summaries. Toggle 'Show All' to see all links including listened ones, or try publications below."
                      }
                    </span>
                  }
                  style={{ padding: '20px 0' }}
                />
                
                {/* 50 Worldwide Famous Publications */}
                <Card style={{ marginTop: 24 }}>
                  <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>
                    🌍 Try Our AI Tool on These World-Famous Publications
                  </Title>
                  <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24, fontSize: 14 }}>
                    Click any publication below to experience our AI-powered summarization tool
                  </Text>
                  
                  {/* Category Filter */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Select
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      style={{ width: 200 }}
                      placeholder="Filter by category"
                    >
                      <Select.Option value="All">All Categories</Select.Option>
                      <Select.Option value="News">News</Select.Option>
                      <Select.Option value="Business">Business</Select.Option>
                      <Select.Option value="Tech">Technology</Select.Option>
                      <Select.Option value="Science">Science</Select.Option>
                      <Select.Option value="Culture">Culture</Select.Option>
                      <Select.Option value="International">International</Select.Option>
                      <Select.Option value="Health">Health & Medical</Select.Option>
                      <Select.Option value="Environment">Environment</Select.Option>
                      <Select.Option value="Sports">Sports</Select.Option>
                      <Select.Option value="Entertainment">Entertainment</Select.Option>
                    </Select>
                  </div>
                  
                  <Row gutter={[16, 16]}>
                    {(() => {
                      const publications = [
                        // News & Current Affairs
                        { name: 'BBC News', url: 'https://www.bbc.com/news', category: 'News', logo: '/logos/bbc.png' },
                        { name: 'CNN', url: 'https://www.cnn.com', category: 'News', logo: '/logos/cnn.png' },
                        { name: 'The Guardian', url: 'https://www.theguardian.com', category: 'News', logo: '/logos/guardian.png' },
                        { name: 'Reuters', url: 'https://www.reuters.com', category: 'News', logo: '/logos/reuters.png' },
                        { name: 'Associated Press', url: 'https://apnews.com', category: 'News', logo: '/logos/ap.png' },
                        { name: 'The New York Times', url: 'https://www.nytimes.com', category: 'News', logo: '/logos/nytimes.png' },
                        { name: 'The Washington Post', url: 'https://www.washingtonpost.com', category: 'News', logo: '/logos/washingtonpost.png' },
                        { name: 'Wall Street Journal', url: 'https://www.wsj.com', category: 'Business', logo: '/logos/wsj.png' },
                        { name: 'Financial Times', url: 'https://www.ft.com', category: 'Business', logo: '/logos/ft.png' },
                        { name: 'Bloomberg', url: 'https://www.bloomberg.com', category: 'Business', logo: '/logos/bloomberg.png' },
                        
                        // Technology
                        { name: 'TechCrunch', url: 'https://techcrunch.com', category: 'Tech', logo: '/logos/techcrunch.png' },
                        { name: 'Wired', url: 'https://www.wired.com', category: 'Tech', logo: '/logos/wired.png' },
                        { name: 'Ars Technica', url: 'https://arstechnica.com', category: 'Tech', logo: '/logos/arstechnica.png' },
                        { name: 'The Verge', url: 'https://www.theverge.com', category: 'Tech', logo: '/logos/theverge.png' },
                        { name: 'Engadget', url: 'https://www.engadget.com', category: 'Tech', logo: '/logos/engadget.png' },
                        { name: 'MIT Technology Review', url: 'https://www.technologyreview.com', category: 'Tech', logo: '/logos/mit-tech-review.png' },
                        
                        // Science & Research
                        { name: 'Nature', url: 'https://www.nature.com', category: 'Science', logo: '/logos/nature.png' },
                        { name: 'Science Magazine', url: 'https://www.science.org', category: 'Science', logo: '/logos/science.png' },
                        { name: 'Scientific American', url: 'https://www.scientificamerican.com', category: 'Science', logo: '/logos/scientific-american.png' },
                        { name: 'New Scientist', url: 'https://www.newscientist.com', category: 'Science', logo: '/logos/new-scientist.png' },
                        { name: 'Smithsonian Magazine', url: 'https://www.smithsonianmag.com', category: 'Science', logo: '/logos/smithsonian.png' },
                        
                        // Business & Economics
                        { name: 'Harvard Business Review', url: 'https://hbr.org', category: 'Business', logo: '/logos/hbr.png' },
                        { name: 'Forbes', url: 'https://www.forbes.com', category: 'Business', logo: '/logos/forbes.png' },
                        { name: 'Fortune', url: 'https://fortune.com', category: 'Business', logo: '/logos/fortune.png' },
                        { name: 'Fast Company', url: 'https://www.fastcompany.com', category: 'Business', logo: '/logos/fastcompany.png' },
                        { name: 'The Economist', url: 'https://www.economist.com', category: 'Business', logo: '/logos/economist.png' },
                        
                        // Culture & Lifestyle
                        { name: 'The Atlantic', url: 'https://www.theatlantic.com', category: 'Culture', logo: '/logos/atlantic.png' },
                        { name: 'The New Yorker', url: 'https://www.newyorker.com', category: 'Culture', logo: '/logos/new-yorker.png' },
                        { name: 'Vox', url: 'https://www.vox.com', category: 'Culture', logo: '/logos/vox.png' },
                        { name: 'Medium', url: 'https://medium.com', category: 'Culture', logo: '/logos/medium.png' },
                        { name: 'Quartz', url: 'https://qz.com', category: 'Business', logo: '/logos/quartz.png' },
                        
                        // International
                        { name: 'Le Monde', url: 'https://www.lemonde.fr', category: 'International', logo: '/logos/lemonde.png' },
                        { name: 'Der Spiegel', url: 'https://www.spiegel.de', category: 'International', logo: '/logos/spiegel.png' },
                        { name: 'The Times of India', url: 'https://timesofindia.indiatimes.com', category: 'International', logo: '/logos/times-of-india.png' },
                        { name: 'South China Morning Post', url: 'https://www.scmp.com', category: 'International', logo: '/logos/scmp.png' },
                        { name: 'Al Jazeera', url: 'https://www.aljazeera.com', category: 'International', logo: '/logos/al-jazeera.png' },
                        
                        // Health & Medicine
                        { name: 'The Lancet', url: 'https://www.thelancet.com', category: 'Health', logo: '/logos/lancet.png' },
                        { name: 'NEJM', url: 'https://www.nejm.org', category: 'Health', logo: '/logos/nejm.png' },
                        { name: 'Mayo Clinic News', url: 'https://newsnetwork.mayoclinic.org', category: 'Health', logo: '/logos/mayo-clinic.png' },
                        { name: 'WebMD', url: 'https://www.webmd.com', category: 'Health', logo: '/logos/webmd.png' },
                        
                        // Environment & Climate
                        { name: 'National Geographic', url: 'https://www.nationalgeographic.com', category: 'Environment', logo: '/logos/natgeo.png' },
                        { name: 'Yale Environment 360', url: 'https://e360.yale.edu', category: 'Environment', logo: '/logos/yale.png' },
                        { name: 'Climate Central', url: 'https://www.climatecentral.org', category: 'Environment', logo: '/logos/climate-central.png' },
                        
                        // Education & Academia
                        { name: 'Chronicle of Higher Education', url: 'https://www.chronicle.com', category: 'Education', logo: '/logos/chronicle.png' },
                        { name: 'Inside Higher Ed', url: 'https://www.insidehighered.com', category: 'Education', logo: '/logos/inside-higher-ed.png' },
                        
                        // Arts & Entertainment
                        { name: 'Variety', url: 'https://variety.com', category: 'Entertainment', logo: '/logos/variety.png' },
                        { name: 'The Hollywood Reporter', url: 'https://www.hollywoodreporter.com', category: 'Entertainment', logo: '/logos/thr.png' },
                        { name: 'Rolling Stone', url: 'https://www.rollingstone.com', category: 'Entertainment', logo: '/logos/rolling-stone.png' },
                        
                        // Sports
                        { name: 'ESPN', url: 'https://www.espn.com', category: 'Sports', logo: '/logos/espn.png' },
                        { name: 'Sports Illustrated', url: 'https://www.si.com', category: 'Sports', logo: '/logos/si.png' },
                        
                        // Specialized
                        { name: 'Politico', url: 'https://www.politico.com', category: 'Politics', logo: '/logos/politico.png' },
                        { name: 'Foreign Affairs', url: 'https://www.foreignaffairs.com', category: 'Politics', logo: '/logos/foreign-affairs.png' },
                      ];
                      
                      // Filter publications based on selected category
                      const filteredPublications = selectedCategory === 'All' 
                        ? publications 
                        : publications.filter(pub => {
                            if (selectedCategory === 'Health') return pub.category === 'Health' || pub.category === 'Medical';
                            return pub.category === selectedCategory;
                          });
                      
                      return filteredPublications.map((publication, index) => (
                        <Col xs={12} sm={8} md={6} lg={4} xl={4} key={index}>
                        <Card 
                          hoverable 
                          size="small"
                          style={{ 
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid #f0f0f0'
                          }}
                          bodyStyle={{ padding: '12px 8px' }}
                          onClick={() => {
                            // Copy URL to clipboard or open in new tab
                            navigator.clipboard.writeText(publication.url).then(() => {
                              // You could add a toast notification here
                              window.open(publication.url, '_blank')
                            })
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0px)'
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          <div style={{ marginBottom: '12px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                              src={publication.logo} 
                              alt={publication.name}
                              style={{ 
                                maxHeight: '64px', 
                                maxWidth: '96px', 
                                objectFit: 'contain',
                                borderRadius: '6px'
                              }}
                              onError={(e) => {
                                // Fallback to first letter if logo fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div style="width: 64px; height: 64px; border-radius: 50%; background: #1890ff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px;">${publication.name.charAt(0)}</div>`;
                                }
                              }}
                            />
                          </div>
                          <Text 
                            style={{ 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              display: 'block',
                              lineHeight: '1.3',
                              marginBottom: '4px'
                            }}
                          >
                            {publication.name}
                          </Text>
                          <Badge 
                            size="small" 
                            style={{ 
                              backgroundColor: '#f0f0f0', 
                              color: '#666',
                              fontSize: '10px',
                              border: 'none'
                            }}
                            text={publication.category}
                          />
                        </Card>
                      </Col>
                      ))
                    })()}
                  </Row>
                  
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      💡 Our AI tool works with any URL - these are just popular examples to get you started!
                    </Text>
                  </div>
                </Card>
              </div>
            ) : (
              visibleLinks.map((record) => (
                <Card 
                  key={record.id}
                  size="small" 
                  style={{ 
                    border: currentlyPlaying === record.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                    borderRadius: 8,
                    opacity: hasUserListened(record) ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  bodyStyle={{ padding: '16px' }}
                  onClick={async () => {
                    if (record.processingStatus === 'COMPLETED' && record.audioFileUrl) {
                      if (currentlyPlaying === record.id) {
                        await handlePauseAudio()
                      } else {
                        await handlePlayAudio(record.id, record.audioFileUrl)
                      }
                    }
                  }}
                >
                  {/* Main Card Content */}
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
                            marginBottom: 4,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto'
                          }}>
                            {record.title || 'Untitled'}
                          </div>
                          {hasUserListened && hasUserListened(record) && (
                            <Badge 
                              count="✓" 
                              style={{ backgroundColor: '#52c41a', fontSize: 10, marginBottom: 4 }}
                            />
                          )}
                        </div>
                        <div style={{ 
                          fontSize: 12, 
                          color: '#8c8c8c',
                          marginBottom: 8,
                          wordBreak: 'break-all',
                          overflowWrap: 'break-word',
                          lineHeight: 1.3,
                          maxWidth: '100%',
                          hyphens: 'auto'
                        }}>
                          {record.url}
                        </div>
                        
                        {/* Metadata Row */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: isMobile ? 8 : 16, 
                          marginBottom: 8,
                          flexWrap: isMobile ? 'wrap' : 'nowrap',
                          minWidth: 0
                        }}>
                          {/* Listen Count */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <EyeOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                            <Text style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>
                              {getListenCount(record)} listens
                            </Text>
                          </div>
                          
                          {/* Created Date */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <CalendarOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                            <Text style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>
                              {new Date(record.createdAt).toLocaleDateString()}
                            </Text>
                          </div>
                          
                          {/* Channel/Source */}
                          {record.channel?.channelName && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 6,
                              minWidth: 0,
                              flex: isMobile ? '1 1 100%' : '0 1 auto'
                            }}>
                              <Text style={{ 
                                fontSize: 12, 
                                color: '#8c8c8c',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0
                              }}>
                                #{record.channel.channelName}
                              </Text>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - Audio Player */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: 16,
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end'
                    }}>
                      {/* Audio Player Section */}
                      <div style={{ 
                        minWidth: isMobile ? '100%' : 300, 
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12,
                          justifyContent: 'flex-end',
                          width: '100%'
                        }}>
                          {record.processingStatus === 'COMPLETED' && record.audioFileUrl ? (
                            <Tooltip title={currentlyPlaying === record.id ? 'Pause Audio' : 'Play Audio'}>
                              <Button
                                type="primary"
                                shape="circle"
                                size="large"
                                disabled={(!userCanConsume || linkLimitExceeded) && !isExceptionTeam}
                                icon={
                                  currentlyPlaying === record.id ? <PauseCircleOutlined /> : 
                                  <PlayCircleOutlined />
                                }
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if ((!userCanConsume || linkLimitExceeded) && !isExceptionTeam) return
                                  
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
                          ) : record.processingStatus === 'PROCESSING' ? (
                            <Button
                              type="primary"
                              shape="circle"
                              size="large"
                              loading
                              disabled
                              style={{ background: '#d9d9d9', borderColor: '#d9d9d9' }}
                            />
                          ) : (
                            <Button
                              type="primary"
                              shape="circle"
                              size="large"
                              disabled
                              icon={record.processingStatus === 'FAILED' ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}
                              style={{ 
                                background: record.processingStatus === 'FAILED' ? '#ff4d4f' : '#d9d9d9', 
                                borderColor: record.processingStatus === 'FAILED' ? '#ff4d4f' : '#d9d9d9'
                              }}
                            />
                          )}
                          
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
                                backgroundColor: currentlyPlaying === record.id ? '#52c41a' : '#d9d9d9',
                                borderRadius: 2,
                                transition: 'width 0.3s ease'
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
                              }}
                              style={{
                                fontSize: 12,
                                height: 28,
                                marginTop: 8,
                                background: expandedSummary === record.id ? '#1890ff' : 'transparent',
                                color: expandedSummary === record.id ? 'white' : '#1890ff',
                                borderColor: '#1890ff'
                              }}
                            >
                              {expandedSummary === record.id ? 'Hide Summary' : 'Read Summary'}
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expandable Summary Panel - Full Width */}
                  {expandedSummary === record.id && record.ttsScript && (
                    <div style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: '1px solid #f0f0f0',
                      animation: 'slideDown 0.3s ease-out',
                      opacity: 1,
                      transform: 'translateY(0)',
                      width: '100%'
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
                        backgroundColor: '#fafafa',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}>
                        <Text style={{ 
                          fontSize: 14, 
                          lineHeight: 1.6, 
                          color: '#262626',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {record.ttsScript}
                        </Text>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Fixed Bottom Audio Player */}
        {showAudioPlayer && currentTrackInfo && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTop: '1px solid #f0f0f0',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            padding: isMobile ? '12px 16px' : '16px 24px'
          }}>
            {/* Main Player Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 12 : 16,
              maxWidth: 1200,
              margin: '0 auto'
            }}>
              {/* Track Info */}
              <div style={{ 
                flex: 1, 
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{
                  width: isMobile ? 40 : 48,
                  height: isMobile ? 40 : 48,
                  backgroundColor: '#1890ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <SoundOutlined style={{ 
                    color: 'white', 
                    fontSize: isMobile ? 16 : 20 
                  }} />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: isMobile ? 14 : 16,
                    fontWeight: 600,
                    color: '#262626',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {currentTrackInfo.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#8c8c8c',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2
                  }}>
                    {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
                  </div>
                </div>
              </div>

              {/* Main Controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 8 : 12,
                flexShrink: 0
              }}>
                {/* Restart Button */}
                <Tooltip title="Restart">
                  <Button
                    type="text"
                    shape="circle"
                    size={isMobile ? "middle" : "large"}
                    icon={<StepBackwardOutlined />}
                    onClick={handleRestartTrack}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </Tooltip>

                {/* Play/Pause Button */}
                <Button
                  type="primary"
                  shape="circle"
                  size={isMobile ? "middle" : "large"}
                  icon={currentlyPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                  onClick={currentlyPlaying ? handlePauseAudio : () => handlePlayAudio(currentTrackInfo.id, currentTrackInfo.url)}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                />

                {/* Play Next Button */}
                <Tooltip title="Play Next">
                  <Button
                    type="text"
                    shape="circle"
                    size={isMobile ? "middle" : "large"}
                    icon={<StepForwardOutlined />}
                    onClick={handlePlayNext}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                </Tooltip>

                {/* Volume Control (Desktop only) */}
                {!isMobile && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    minWidth: 120
                  }}>
                    <SoundOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={audioVolume}
                      onChange={handleVolumeChange}
                      style={{ flex: 1, margin: 0 }}
                      tooltip={{ formatter: (value = 0) => `${Math.round(value * 100)}%` }}
                    />
                  </div>
                )}

                {/* Playback Speed (Desktop only) */}
                {!isMobile && (
                  <Select
                    value={audioPlaybackRate}
                    onChange={handlePlaybackRateChange}
                    size="small"
                    style={{ width: 70 }}
                    options={[
                      { value: 0.5, label: '0.5x' },
                      { value: 0.75, label: '0.75x' },
                      { value: 1, label: '1x' },
                      { value: 1.25, label: '1.25x' },
                      { value: 1.5, label: '1.5x' },
                      { value: 2, label: '2x' }
                    ]}
                  />
                )}

                {/* Expand/Collapse Button (Mobile only) */}
                {isMobile && (
                  <Tooltip title={isPlayerExpanded ? "Collapse" : "Expand"}>
                    <Button
                      type="text"
                      shape="circle"
                      size="middle"
                      icon={isPlayerExpanded ? <DownOutlined /> : <UpOutlined />}
                      onClick={() => setIsPlayerExpanded(!isPlayerExpanded)}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    />
                  </Tooltip>
                )}

                {/* Close Button */}
                <Tooltip title="Close">
                  <Button
                    type="text"
                    shape="circle"
                    size={isMobile ? "middle" : "large"}
                    icon={<CloseOutlined />}
                    onClick={handleClosePlayer}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8c8c8c'
                    }}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              marginTop: 12,
              maxWidth: 1200,
              margin: '12px auto 0'
            }}>
              <div style={{
                width: '100%',
                height: 4,
                backgroundColor: '#f0f0f0',
                borderRadius: 2,
                cursor: 'pointer'
              }}
              onClick={(e) => {
                if (audioElement && duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const newTime = (clickX / rect.width) * duration
                  audioElement.currentTime = newTime
                }
              }}>
                <div style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  backgroundColor: '#1890ff',
                  borderRadius: 2,
                  transition: 'width 0.1s ease'
                }} />
              </div>
            </div>

            {/* Expanded Mobile Controls */}
            {isMobile && isPlayerExpanded && (
              <div style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0',
                maxWidth: 1200,
                margin: '16px auto 0'
              }}>
                <Row gutter={[16, 16]} align="middle">
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        Volume
                      </Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SoundOutlined style={{ color: '#8c8c8c', fontSize: 14 }} />
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={audioVolume}
                          onChange={handleVolumeChange}
                          style={{ flex: 1, margin: 0 }}
                        />
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                        Speed
                      </Text>
                      <Select
                        value={audioPlaybackRate}
                        onChange={handlePlaybackRateChange}
                        size="small"
                        style={{ width: '100%' }}
                        options={[
                          { value: 0.5, label: '0.5x' },
                          { value: 0.75, label: '0.75x' },
                          { value: 1, label: '1x' },
                          { value: 1.25, label: '1.25x' },
                          { value: 1.5, label: '1.5x' },
                          { value: 2, label: '2x' }
                        ]}
                      />
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        )}
      </Layout>
    )
  }

  // If user is authenticated, show dashboard
  if (showDashboard && !error) {
    return renderDashboard()
  }

  return (
    <Layout currentPage="home" showHeader={true}>
      <ExtensionHeaderSection />

      <HeroSection 
        webInstallUrl={webInstallUrl}
        error={error}
        installed={installed}
      />

      <ConversionStatsSection />

      {/* Problem Agitation Section */}
      <div style={{ 
        padding: '100px 0', 
        background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Title level={2} style={{ 
              color: 'white',
              fontSize: '42px', 
              fontWeight: 700, 
              margin: '0 0 24px 0'
            }}>
              The Reading Backlog Crisis
            </Title>
            <Paragraph style={{ 
              fontSize: '20px', 
              color: 'rgba(255,255,255,0.9)', 
              margin: 0,
              lineHeight: 1.6
            }}>
              Sound familiar? You're not alone...
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} justify="center">
            {[
              { icon: <ExclamationCircleOutlined />, text: 'Articles bookmarked but never read' },
              { icon: <ClockCircleOutlined />, text: 'Important insights missed while you\'re "too busy"' },
              { icon: <BulbOutlined />, text: 'Competitors stay ahead while your backlog grows' },
              { icon: <ReadOutlined />, text: 'Feeling overwhelmed by information overload' }
            ].map((problem, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <div style={{
                  textAlign: 'center',
                  padding: '32px 16px'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto',
                    fontSize: '32px',
                    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.1)'
                  }}>
                    {problem.icon}
                  </div>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: 1.4,
                    display: 'block'
                  }}>
                    {problem.text}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>

          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <Title level={3} style={{ 
              color: 'white',
              fontSize: '24px', 
              fontWeight: 600, 
              margin: '0 0 16px 0'
            }}>
              There's a better way...
            </Title>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div style={{ 
        padding: '100px 0', 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        position: 'relative'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.03) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <Title level={2} style={{ 
              fontSize: '36px', 
              fontWeight: 700, 
              margin: '0 0 16px 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Transform How You Consume Information
            </Title>
            <Paragraph style={{ fontSize: '18px', color: '#666', margin: 0 }}>
              Stop drowning in articles. Start listening to insights.
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {benefits.map((benefit, index) => (
              <Col xs={24} lg={8} key={index}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${benefit.color}20`,
                  borderRadius: '24px',
                  padding: '40px 32px',
                  textAlign: 'center',
                  height: '100%',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
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
                    background: `linear-gradient(135deg, ${benefit.color} 0%, ${benefit.color}80 100%)`
                  }} />
                  
                  <div style={{ 
                    background: `${benefit.color}15`, 
                    borderRadius: '50%',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto',
                    boxShadow: `0 8px 24px ${benefit.color}30`
                  }}>
                    {benefit.icon}
                  </div>
                  <Title level={3} style={{ 
                    color: benefit.color, 
                    margin: '0 0 16px 0',
                    fontSize: '24px',
                    fontWeight: 600
                  }}>
                    {benefit.title}
                  </Title>
                  <Paragraph style={{ 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    color: '#666',
                    margin: '0 0 24px 0'
                  }}>
                    {benefit.description}
                  </Paragraph>
                  <div style={{
                    background: `linear-gradient(135deg, ${benefit.color} 0%, ${benefit.color}80 100%)`,
                    borderRadius: '50px',
                    padding: '8px 16px',
                    display: 'inline-block'
                  }}>
                    <Text style={{ 
                      color: 'white', 
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {benefit.stats}
                    </Text>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Social Proof Section */}
      <div style={{ 
        padding: '100px 0', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        {/* <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <Title level={2} style={{ 
              color: 'white',
              fontSize: '36px', 
              fontWeight: 700, 
              margin: '0 0 16px 0'
            }}>
              Trusted by Teams Worldwide
            </Title>
            <Paragraph style={{ 
              fontSize: '18px', 
              color: 'rgba(255,255,255,0.9)', 
              margin: 0 
            }}>
              Join thousands of readers who've transformed their information consumption
            </Paragraph>
          </div>

          {/* Social Proof - Temporarily Hidden */}
          {/* <Row gutter={[32, 32]} justify="center">
            {socialProof.map((proof, index) => (
              <Col xs={24} sm={8} key={index}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  padding: '40px 32px',
                  textAlign: 'center',
                  height: '100%',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto',
                    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.2)'
                  }}>
                    {proof.icon}
                  </div>
                  <Title level={4} style={{ 
                    color: 'white', 
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 600
                  }}>
                    {proof.text}
                  </Title>
                </div>
              </Col>
            ))}
          </Row> 
        </div>
      </div> */}
      
      </div>

      {/* Pricing Section */}
      <div style={{ 
        padding: '100px 0', 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        position: 'relative'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.03) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <Title level={2} style={{ 
              fontSize: '36px', 
              fontWeight: 700, 
              margin: '0 0 16px 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Start Free, Scale as You Grow
            </Title>
            <Paragraph style={{ fontSize: '18px', color: '#666', margin: 0 }}>
              No credit card required. Cancel anytime.
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} justify="center">
            <Col xs={24} sm={12} lg={8}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(82, 196, 26, 0.2)',
                borderRadius: '24px',
                padding: '40px 32px',
                textAlign: 'center',
                height: '100%',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
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
                  background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                }} />
                
                <Title level={3} style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600 }}>Free</Title>
                <Title level={1} style={{ 
                  color: '#52c41a', 
                  margin: '16px 0', 
                  fontSize: '48px',
                  fontWeight: 700
                }}>$0</Title>
                <Text style={{ 
                  color: '#666', 
                  fontSize: '16px',
                  marginBottom: '32px',
                  display: 'block'
                }}>Perfect for individuals getting started</Text>
                <List
                  style={{ margin: '24px 0 32px 0' }}
                  dataSource={['20 audio summaries per month', '2-5 min processing time', 'Community support']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '8px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                        <Text style={{ fontSize: '14px' }}>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button 
                  type="default" 
                  size="large" 
                  href={authSigninUrl} 
                  style={{ 
                    width: '100%',
                    height: '48px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    border: '2px solid #52c41a',
                    color: '#52c41a',
                    background: 'transparent',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Start Free Trial
                </Button>
              </div>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(24, 144, 255, 0.3)',
                borderRadius: '24px',
                padding: '40px 32px',
                textAlign: 'center',
                height: '100%',
                boxShadow: '0 16px 48px rgba(24, 144, 255, 0.15)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Popular Badge */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                }}>
                  Most Popular
                </div>
                
                {/* Background Accent */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                }} />
                
                <Title level={3} style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600 }}>Premium</Title>
                <Title level={1} style={{ 
                  color: '#1890ff', 
                  margin: '16px 0', 
                  fontSize: '48px',
                  fontWeight: 700
                }}>$9</Title>
                <Text style={{ 
                  color: '#666', 
                  fontSize: '16px',
                  marginBottom: '32px',
                  display: 'block'
                }}>For power readers and knowledge workers</Text>
                <List
                  style={{ margin: '24px 0 32px 0' }}
                  dataSource={['Unlimited audio summaries', '30s processing time', 'Advanced analytics & reports', 'Priority support']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '8px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                        <Text style={{ fontSize: '14px' }}>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button 
                  type="primary" 
                  size="large" 
                  href={authSigninUrl} 
                  style={{ 
                    width: '100%',
                    height: '48px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(24, 144, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Start Free Trial
                </Button>
              </div>
            </Col>

          </Row>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Paragraph style={{ color: '#666' }}>
              💰 <strong>20% discount available</strong> for non-profits, startups, and open source groups.{' '}
              <a href="mailto:hello@biirbal.com?subject=Special Discount Inquiry">Contact us</a> to learn more.
            </Paragraph>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ 
        padding: '100px 0', 
        background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{ 
              color: 'white',
              fontSize: '36px',
              fontWeight: 700,
              margin: '0 0 24px 0'
            }}>
              Join 1,000+ Teams Already Saving Time
            </Title>
            
            <Paragraph style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: '18px',
              margin: '0 0 40px 0',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Transform your information overload into actionable insights. 
              Start your free trial today - no credit card required.
            </Paragraph>

            <Space size="large" style={{ marginBottom: '48px' }}>
              <Button 
                type="primary" 
                size="large" 
                icon={<RocketOutlined />}
                href={webInstallUrl}
                style={{ 
                  background: 'linear-gradient(135deg, #4A154B 0%, #6B4E71 100%)',
                  border: 'none',
                  height: '56px',
                  fontSize: '16px',
                  fontWeight: 600,
                  padding: '0 40px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(74, 21, 75, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                Try Free for 14 Days
              </Button>
              
              <Button 
                size="large" 
                ghost
                href="/pricing"
                icon={<ArrowRightOutlined />}
                style={{ 
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  height: '56px',
                  fontSize: '16px',
                  fontWeight: 500,
                  padding: '0 32px',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                View Pricing Options
              </Button>
            </Space>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '32px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#52c41a' 
                }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                  Secure & Reliable
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#52c41a' 
                }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                  Fast Processing
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#52c41a' 
                }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                  Team Support
                </Text>
              </div>
            </div>
          </Space>
        </div>
      </div>

      {/* Trust Indicators */}
      <div style={{ padding: '40px 0', background: '#fafafa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 16 }}>
              <strong>Free trial available</strong> • <strong>No credit card required</strong> • <strong>Cancel anytime</strong>
            </Text>
          </Space>
        </div>
      </div>
    </Layout>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
      
      {/* Schema.org structured data */}
      <Script
        id="structured-data-software"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Biirbal",
            "description": "AI-powered audio summaries for web platform readers. Transform shared links into 59-second audio summaries.",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          }),
        }}
      />
    </Suspense>
  )
}