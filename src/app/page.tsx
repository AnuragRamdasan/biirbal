'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import Script from 'next/script'
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
  Spin,
  Switch,
  Empty,
  Tooltip,
  Select,
  Slider,
} from 'antd'
import {
  SoundOutlined,
  SlackOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  LinkOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  BulbOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  ReadOutlined,
  CloseOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  FastBackwardOutlined,
  PauseOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { getOAuthRedirectUri } from '@/lib/config'
import { useAnalytics } from '@/hooks/useAnalytics'

const { Title, Text, Paragraph } = Typography

// Add CSS animation for slide down effect (for dashboard)
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

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Home page state
  const [installed, setInstalled] = useState(false)
  const [error, setError] = useState('')
  const [showDashboard, setShowDashboard] = useState(false)
  
  // Dashboard state
  const [links, setLinks] = useState<ProcessedLink[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
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

  // Simple authentication check
  useEffect(() => {
    // Handle OAuth installation success
    if (searchParams.get('installed') === 'true') {
      setInstalled(true)
      setShowDashboard(true)
      const userId = searchParams.get('userId')
      if (userId) {
        localStorage.setItem('biirbal_user_id', userId)
        localStorage.setItem('biirbal_slack_user', 'true')
        localStorage.setItem('biirbal_visited_dashboard', 'true')
      }
      return
    }

    // Handle OAuth errors
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || 'Installation failed')
      return
    }

    // Check if user is authenticated - simple check
    const hasUserId = localStorage.getItem('biirbal_user_id')
    if (hasUserId) {
      setShowDashboard(true)
      localStorage.setItem('biirbal_visited_dashboard', 'true')
    }
  }, [searchParams])

  // Dashboard data fetching with loading state control
  const fetchData = async (isInitialLoad = false) => {
    if (!showDashboard) return
    
    try {
      // Only show loading spinner on initial load
      if (isInitialLoad) {
        setLoading(true)
        setInitialLoading(true)
      }
      
      const userId = localStorage.getItem('biirbal_user_id') // Database user ID
      
      if (!userId) {
        setShowDashboard(false)
        return
      }

      const [linksResponse, statsResponse, usageResponse] = await Promise.all([
        fetch(`/api/dashboard/links?userId=${userId}`),
        fetch(`/api/dashboard/stats?userId=${userId}`),
        fetch(`/api/dashboard/usage?userId=${userId}`)
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
      console.error('Failed to fetch dashboard data:', error)
      setDashboardError('Failed to load data')
    } finally {
      if (isInitialLoad) {
        setLoading(false)
        setInitialLoading(false)
      }
    }
  }

  // Load dashboard data when showDashboard becomes true
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
  }, [showDashboard])

  // Dashboard helper functions
  const trackListen = async (linkId: string) => {
    try {
      const userId = localStorage.getItem('biirbal_user_id') // Database user ID
      
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

      
      // No global archiving - completion is tracked per-user in audioListens
      // Refresh data to show updated listen status
      setTimeout(() => fetchData(false), 1000) // Background refresh after completion

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
          console.error('Failed to update listen completion:', error)
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
      setLoadingAudio(null) // Clear loading state when track ends
      
      // Refresh stats to update listen counts and minutes listened (after cleanup)
      
      await fetchData(false)
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
              
              // Refresh stats every minute of listening
              const currentListenDuration = audioStartTimes.current[linkId] 
                ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
                : 0
              
              if (currentListenDuration > 0 && Math.floor(currentListenDuration) % 60 === 0) {
                await fetchData(false)
              }
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
        await fetchData(false)
      }
      
      setCurrentlyPlaying(null)
      setLoadingAudio(null) // Clear loading state when paused
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
    setLoadingAudio(null)
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
    // Only show loading spinner on initial load, not on background refreshes
    if (initialLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Spin size="large" />
        </div>
      )
    }

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
      return link.source === sourceFilter || (sourceFilter === 'slack' && !link.source)
    })

    // Get current user ID for filtering completed links
    const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('biirbal_user_id') : null // Database user ID
    
    // Helper function to check if current user has completed this link
    const hasUserCompleted = (link: any) => {
      if (!currentUserId) return false
      return link.listens?.some((listen: any) => 
        listen.slackUserId === currentUserId && listen.completed
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

          {/* Compact Header */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Title level={3} style={{ margin: 0, fontSize: 18 }}>
                  <Space size="small">
                    <SoundOutlined />
                    Audio Summaries
                  </Space>
                </Title>
              </Col>
              <Col xs={24} sm={24} md={16} lg={18}>
                <Row gutter={[8, 8]} align="middle">
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 'bold', color: '#1890ff' }}>
                        {stats?.totalLinks ?? links.length}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10 }}>Total</Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 'bold', color: '#722ed1' }}>
                        {stats?.totalListens ?? links.reduce((total, link) => total + getListenCount(link), 0)}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10 }}>Listens</Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 'bold', color: '#52c41a' }}>
                        {stats?.totalMinutesCurated ?? 0}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10 }}>Min Curated</Text>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 'bold', color: '#fa8c16' }}>
                        {stats?.totalMinutesListened ?? 0}
                      </div>
                      <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10 }}>Min Listened</Text>
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
              <Col>
                <Select
                  size="small"
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  style={{ width: 120 }}
                  options={[
                    { value: 'all', label: 'All Sources' },
                    { value: 'slack', label: 'Slack' },
                    { value: 'dashboard', label: 'Dashboard' },
                  ]}
                />
              </Col>
            </Row>
          </Card>

          {/* Links List - Row-based Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleLinks.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ fontSize: 12 }}>
                    {showListened 
                      ? "No audio summaries available yet."
                      : "No unlistened links. Toggle 'Show All' to see all links including listened ones."
                    }
                  </span>
                }
                style={{ padding: '20px 0' }}
              />
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
                                loading={loadingAudio === record.id}
                                icon={
                                  loadingAudio === record.id ? <LoadingOutlined /> :
                                  currentlyPlaying === record.id ? <PauseCircleOutlined /> : 
                                  <PlayCircleOutlined />
                                }
                                onClick={async (e) => {
                                  e.stopPropagation()
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

  // Force custom domain for OAuth redirect
  const getRedirectUri = () => {
    return getOAuthRedirectUri()
  }

  const slackInstallUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=app_mentions:read,channels:history,channels:read,chat:write,files:write,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read&user_scope=users:read&redirect_uri=${encodeURIComponent(getRedirectUri())}`

  // If user is authenticated, show dashboard
  if (showDashboard && !error) {
    return renderDashboard()
  }

  // Conversion-focused landing page content
  const benefits = [
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: 'Faster Access to Knowledge',
      description: 'Get the key insights from any article in just 59 seconds. No more reading through lengthy content to find what matters.',
      stats: '3x faster than reading',
      color: '#1890ff'
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: 'Massive Time Savings',
      description: 'Save hours every week by listening to summaries instead of reading full articles. Your team will thank you.',
      stats: '90% time saved per article',
      color: '#52c41a'
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: 'Reduced Backlog & Stress',
      description: 'Never feel overwhelmed by your reading list again. Stay informed without the mental burden of unread content.',
      stats: 'Zero reading backlog',
      color: '#722ed1'
    }
  ]

  const socialProof = [
    { text: '500+ teams trust biirbal.ai', icon: <TeamOutlined /> },
    { text: '10,000+ hours saved monthly', icon: <ClockCircleOutlined /> },
    { text: '4.9/5 average rating', icon: <CheckCircleOutlined /> }
  ]

  const conversionStats = [
    { number: '59', unit: 'seconds', label: 'Average summary length' },
    { number: '90%', unit: '', label: 'Time saved per article' },
    { number: '24/7', unit: '', label: 'Always available' }
  ]

  return (
    <Layout currentPage="home" showHeader={true}>
      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '80px 0 100px 0',
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
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <Row justify="center" align="middle" gutter={[64, 48]}>
            <Col xs={24} lg={14}>
              <div style={{ textAlign: 'left' }}>
                {/* Badge */}
                {/* <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '50px',
                  padding: '8px 16px',
                  marginBottom: '24px',
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  <span style={{ marginRight: '8px' }}>🚀</span>
                  Trusted by 500+ teams worldwide
                </div> */}

                {/* Main Headline */}
                <Title level={1} style={{ 
                  color: 'white', 
                  fontWeight: 700, 
                  margin: '0 0 24px 0', 
                  fontSize: '48px',
                  lineHeight: '1.1',
                  letterSpacing: '-0.02em'
                }}>
                  Stop drowning in
                  <br />
                  <span style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    articles
                  </span>
                </Title>
                
                {/* Subheadline */}
                <Title level={3} style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontWeight: 400, 
                  margin: '0 0 32px 0',
                  fontSize: '20px',
                  lineHeight: '1.4'
                }}>
                  Get the key insights from any article in just{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 600
                  }}>
                    59 seconds
                  </span>
                </Title>
                
                {/* Description */}
                <Paragraph style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: '18px', 
                  lineHeight: '1.6', 
                  margin: '0 0 40px 0',
                  maxWidth: '600px'
                }}>Get to &nbsp;
                  <span style={{
                    color: '#52c41a',
                    fontWeight: '600'
                  }}>
                    zero reading backlog
                  </span>
                  {' '}and transform your team's information consumption with AI-powered audio summaries. 
                  Save hours every week and never feel overwhelmed by your reading list again.
                </Paragraph>

                {/* Error/Success Alerts */}
                {error && (
                  <Alert
                    message="Installation Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {installed && (
                  <Alert
                    message="Installation Successful!"
                    description="Welcome to biirbal.ai! Your dashboard is loading..."
                    type="success"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {/* CTA Buttons */}
                <Space size="large" style={{ marginBottom: '32px' }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<SlackOutlined />}
                    href={slackInstallUrl}
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
                    Start Free Trial
                  </Button>
                  
                  <Button 
                    size="large" 
                    ghost
                    href="/pricing"
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
                    View Pricing
                  </Button>
                </Space>

                {/* Trust Indicators */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: '#52c41a' 
                    }} />
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                      Free Trial Available
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
                      No setup required
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
                      Works instantly
                    </Text>
                  </div>
                </div>
              </div>
            </Col>
            
            <Col xs={24} lg={10}>
              <div style={{ 
                textAlign: 'center',
                position: 'relative'
              }}>
                {/* Floating Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  padding: '32px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                  transform: 'rotate(-2deg)',
                  animation: 'float 6s ease-in-out infinite'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    borderRadius: '50%',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto',
                    boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
                  }}>
                    <SoundOutlined style={{ fontSize: '36px', color: 'white' }} />
                  </div>
                  <Title level={4} style={{ color: 'white', margin: '0 0 8px 0', fontWeight: 600 }}>
                    59-Second Summaries
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                    Perfect length for quick consumption
                  </Text>
                </div>
                
                {/* Floating Elements */}
                <div style={{
                  position: 'absolute',
                  top: '20%',
                  right: '10%',
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  animation: 'float 4s ease-in-out infinite reverse'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '20%',
                  left: '10%',
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  animation: 'float 5s ease-in-out infinite'
                }} />
              </div>
            </Col>
          </Row>
        </div>
        
        {/* CSS Animation */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(-2deg); }
            50% { transform: translateY(-20px) rotate(-1deg); }
          }
        `}</style>
      </div>

      {/* Conversion Stats Section */}
      <div style={{ 
        padding: '80px 0', 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        position: 'relative'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Title level={2} style={{ 
              fontSize: '36px', 
              fontWeight: 700, 
              margin: '0 0 16px 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Proven Results
            </Title>
            <Paragraph style={{ fontSize: '18px', color: '#666', margin: 0 }}>
              Join thousands of teams who've transformed their information consumption
            </Paragraph>
          </div>
          
          <Row gutter={[32, 32]} justify="center">
            {conversionStats.map((stat, index) => (
              <Col xs={24} sm={8} key={index}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                  borderRadius: '20px',
                  padding: '32px',
                  textAlign: 'center',
                  height: '100%',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px auto',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                  }}>
                    <ClockCircleOutlined style={{ fontSize: '24px', color: 'white' }} />
                  </div>
                  <Statistic
                    title={stat.label}
                    value={stat.number}
                    suffix={stat.unit}
                    valueStyle={{ 
                      fontSize: '32px', 
                      fontWeight: '700', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  />
                </div>
              </Col>
            ))}
          </Row>
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
              Transform How Your Team Consumes Information
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
              Join thousands of teams who've transformed their information consumption
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} justify="center">
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
        </div>*/}
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
            <Col xs={24} sm={6}>
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
                  dataSource={['20 audio summaries per month', '1 user', '2-5 min processing time', 'Basic Slack integration', 'Community support']}
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
                  href={slackInstallUrl} 
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

            <Col xs={24} sm={6}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(24, 144, 255, 0.2)',
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
                  background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                }} />
                
                <Title level={3} style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600 }}>Starter</Title>
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
                }}>For individual power users</Text>
                <List
                  style={{ margin: '24px 0 32px 0' }}
                  dataSource={['Unlimited audio summaries', '1 user', '1-2 min processing time', 'Basic analytics', 'Email support']}
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
                  href={slackInstallUrl} 
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

            <Col xs={24} sm={6}>
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
                
                <Title level={3} style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600 }}>Pro</Title>
                <Title level={1} style={{ 
                  color: '#1890ff', 
                  margin: '16px 0', 
                  fontSize: '48px',
                  fontWeight: 700
                }}>$39</Title>
                <Text style={{ 
                  color: '#666', 
                  fontSize: '16px',
                  marginBottom: '32px',
                  display: 'block'
                }}>For growing teams</Text>
                <List
                  style={{ margin: '24px 0 32px 0' }}
                  dataSource={['Unlimited audio summaries', 'Up to 10 team members', '30s processing time', 'Advanced analytics & reports', 'Priority support']}
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
                  href={slackInstallUrl} 
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

            <Col xs={24} sm={6}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(114, 46, 209, 0.2)',
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
                  background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)'
                }} />
                
                <Title level={3} style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600 }}>Business</Title>
                <Title level={1} style={{ 
                  color: '#722ed1', 
                  margin: '16px 0', 
                  fontSize: '48px',
                  fontWeight: 700
                }}>$99</Title>
                <Text style={{ 
                  color: '#666', 
                  fontSize: '16px',
                  marginBottom: '32px',
                  display: 'block'
                }}>For large organizations</Text>
                <List
                  style={{ margin: '24px 0 32px 0' }}
                  dataSource={['Unlimited audio summaries', 'Unlimited team members', '15s processing time', 'Advanced analytics & reporting', 'Priority support']}
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
                  href={slackInstallUrl} 
                  style={{ 
                    width: '100%',
                    height: '48px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(114, 46, 209, 0.3)',
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
              <a href="mailto:hello@biirbal.ai?subject=Special Discount Inquiry">Contact us</a> to learn more.
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
              Ready to Stop Drowning in Articles?
            </Title>
            
            <Paragraph style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: '18px',
              margin: '0 0 40px 0',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Get to zero reading backlog and transform your team's information consumption with AI-powered audio summaries. 
              Save hours every week and never feel overwhelmed by your reading list again.
            </Paragraph>

            <Space size="large" style={{ marginBottom: '48px' }}>
              <Button 
                type="primary" 
                size="large" 
                icon={<SlackOutlined />}
                href={slackInstallUrl}
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
                Start Free Trial - No Credit Card
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
                Compare Plans
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
            "name": "biirbal.ai",
            "description": "AI-powered audio summaries for Slack teams. Transform shared links into 59-second audio summaries.",
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