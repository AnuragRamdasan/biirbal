'use client'

import { useSearchParams } from 'next/navigation'
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

  // Check authentication and set initial state
  useEffect(() => {
    if (searchParams.get('installed') === 'true') {
      setInstalled(true)
      setShowDashboard(true)
      
      // Store team ID and user ID from OAuth response
      const teamId = searchParams.get('teamId')
      const userId = searchParams.get('userId')
      if (teamId) {
        localStorage.setItem('biirbal_team_id', teamId)
      }
      if (userId) {
        localStorage.setItem('biirbal_user_id', userId)
        localStorage.setItem('biirbal_slack_user', 'true') // Mark as Slack OAuth user
      }
    }
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || 'Installation failed')
    }
    
    // Check if user has been here before (simple check)
    const hasVisitedDashboard = localStorage.getItem('biirbal_visited_dashboard')
    const hasTeamId = localStorage.getItem('biirbal_team_id')
    if (hasVisitedDashboard && hasTeamId && !searchParams.get('error')) {
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
      
      const teamId = localStorage.getItem('biirbal_team_id')
      const userId = localStorage.getItem('biirbal_user_id')
      
      if (!teamId || !userId) {
        setShowDashboard(false)
        return
      }

      const [linksResponse, statsResponse, usageResponse] = await Promise.all([
        fetch(`/api/dashboard/links?teamId=${teamId}&userId=${userId}`),
        fetch(`/api/dashboard/stats?teamId=${teamId}&slackUserId=${userId}`),
        fetch(`/api/dashboard/usage?teamId=${teamId}&userId=${userId}`)
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
      const teamId = localStorage.getItem('biirbal_team_id')
      const userId = localStorage.getItem('biirbal_user_id')
      
      const requestBody = {
        linkId,
        teamId,
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

      console.log('📤 Sending progress update:', payload)

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
      console.log('✅ Progress update successful:', result)
      
      // If link was archived, refresh the data to reflect changes
      if (result.archived) {
        console.log('🗃️ Link archived after completion')
        setTimeout(() => fetchData(false), 1000) // Background refresh after completion
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
          await updateListenProgress(currentListenRecord.current, audio.currentTime, true, 100)
        } catch (error) {
          console.error('Failed to update listen completion:', error)
        }
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      }
      
      // Refresh stats to update listen counts and minutes listened
      await fetchData(false)
      
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
            console.log('🔄 Progress update interval running', { 
              duration: audio.duration, 
              listenRecord: currentListenRecord.current, 
              currentTime: audio.currentTime,
              isPlaying: !audio.paused 
            })
            
            if (audio.duration > 0 && currentListenRecord.current && !audio.paused) {
              const completionPercentage = (audio.currentTime / audio.duration) * 100
              console.log('📤 Sending progress update', { completionPercentage, currentTime: audio.currentTime })
              
              const result = await updateListenProgress(currentListenRecord.current, audio.currentTime, false, completionPercentage)
              
              if (!result) {
                console.warn('⚠️ Progress update returned null - network or server error')
              }
              
              // Refresh stats every minute of listening
              const currentListenDuration = audioStartTimes.current[linkId] 
                ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
                : 0
              
              if (currentListenDuration > 0 && Math.floor(currentListenDuration) % 60 === 0) {
                await fetchData(false)
              }
            } else {
              console.log('⏭️ Skipping progress update:', { 
                hasDuration: audio.duration > 0, 
                hasListenRecord: !!currentListenRecord.current,
                isPaused: audio.paused 
              })
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
      setAudioElement(null)
      currentListenRecord.current = null
      currentPlayingLinkId.current = null
      setCurrentTime(0)
      setProgress(0)
      setDuration(0)
      setLoadingAudio(null) // Clear loading state when paused
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

    const visibleLinks = showListened 
      ? filteredLinks 
      : filteredLinks.filter(link => !link.listens?.some(listen => listen.completed))

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
                            marginBottom: 4
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
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {record.url}
                        </div>
                        
                        {/* Metadata Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
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
                              {new Date(record.createdAt).toLocaleDateString()}
                            </Text>
                          </div>
                          
                          {/* Channel/Source */}
                          {record.channel?.channelName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
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

  // Otherwise show marketing homepage
  const features = [
    {
      icon: <SoundOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      title: 'AI Audio Summaries',
      description: 'Get 59-second AI-generated audio summaries of any link shared in Slack'
    },
    {
      icon: <SlackOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      title: 'Seamless Slack Integration',
      description: 'Works automatically with any link shared in your Slack channels'
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      title: 'Save Time',
      description: 'Quickly understand content without reading entire articles'
    },
    {
      icon: <TeamOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      title: 'Team Collaboration',
      description: 'Share insights across your team with audio summaries'
    }
  ]

  const howItWorks = [
    {
      icon: <SlackOutlined />,
      title: 'Share Link in Slack',
      description: 'Someone shares a link in any Slack channel'
    },
    {
      icon: <RocketOutlined />,
      title: 'AI Processing',
      description: 'biirbal.ai automatically processes the content'
    },
    {
      icon: <SoundOutlined />,
      title: 'Audio Summary',
      description: 'Get a 59-second audio summary delivered back to Slack'
    },
    {
      icon: <PlayCircleOutlined />,
      title: 'Listen & Learn',
      description: 'Team members can listen to summaries instantly'
    }
  ]

  const marketingStats = [
    { title: '59 Seconds', value: 'Average Summary Length', icon: <ClockCircleOutlined /> },
    { title: '90%', value: 'Time Saved', icon: <CheckCircleOutlined /> },
    { title: '24/7', value: 'Always Available', icon: <GlobalOutlined /> }
  ]

  return (
    <Layout currentPage="home" showHeader={true}>
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Row justify="center" align="middle" gutter={[48, 48]}>
            <Col xs={24} lg={12}>
              <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                <img src="/logo.png" alt="Biirbal" height="20" style={{ filter: 'brightness(0) invert(1)' }} />
                
                <Title level={2} style={{ color: 'white', fontWeight: 300, marginTop: 0 }}>
                  <span style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    color: 'white', 
                    padding: '8px 16px', 
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}>
                    AI Audio Summaries
                  </span>
                  for Slack Teams
                </Title>
                
                <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, lineHeight: 1.6 }}>
                  Transform shared links into 59-second audio summaries. 
                  Save time, boost productivity, and keep your team informed.
                </Paragraph>

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

                <Space size="middle">
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<SlackOutlined />}
                    href={slackInstallUrl}
                    style={{ 
                      background: '#4A154B', 
                      borderColor: '#4A154B',
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  >
                    Add to Slack
                  </Button>
                  
                  <Button 
                    size="large" 
                    ghost
                    href="/pricing"
                    style={{ 
                      borderColor: 'white',
                      color: 'white',
                      height: 48,
                      fontSize: 16
                    }}
                  >
                    View Pricing
                  </Button>
                </Space>
              </Space>
            </Col>
            
            <Col xs={24} lg={12}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: 16,
                  padding: 32,
                  backdropFilter: 'blur(10px)'
                }}>
                  <SoundOutlined style={{ fontSize: 80, color: 'white', marginBottom: 16 }} />
                  <Title level={3} style={{ color: 'white' }}>
                    59-Second Summaries
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Perfect length for quick consumption
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ padding: '60px 0', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Row gutter={[32, 32]} justify="center">
            {marketingStats.map((stat, index) => (
              <Col xs={24} sm={8} key={index}>
                <Card 
                  style={{ textAlign: 'center', height: '100%' }}
                  bordered={false}
                  hoverable
                >
                  <Space direction="vertical" size="middle">
                    <div style={{ fontSize: 32, color: '#1890ff' }}>
                      {stat.icon}
                    </div>
                    <Statistic
                      title={stat.value}
                      value={stat.title}
                      valueStyle={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}
                    />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Title level={2}>
              <Space>
                <BulbOutlined />
                Why Choose biirbal.ai?
              </Space>
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#666' }}>
              Supercharge your team's productivity with AI-powered audio summaries
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card 
                  style={{ height: '100%', textAlign: 'center' }}
                  bordered={false}
                  hoverable
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {feature.icon}
                    <Title level={4}>{feature.title}</Title>
                    <Text type="secondary">{feature.description}</Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* How It Works Section */}
      <div style={{ padding: '80px 0', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Title level={2}>
              <Space>
                <RocketOutlined />
                How It Works
              </Space>
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#666' }}>
              Get started in minutes with our simple 4-step process
            </Paragraph>
          </div>

          <Row justify="center">
            <Col xs={24} lg={16}>
              <Timeline
                mode="alternate"
                items={howItWorks.map((step) => ({
                  dot: (
                    <div style={{ 
                      background: '#1890ff', 
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 18
                    }}>
                      {step.icon}
                    </div>
                  ),
                  children: (
                    <Card 
                      style={{ marginTop: -20 }}
                      bordered={false}
                    >
                      <Title level={4}>{step.title}</Title>
                      <Text type="secondary">{step.description}</Text>
                    </Card>
                  )
                }))}
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* Pricing Section */}
      <div style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Title level={2}>
              <Space>
                <CheckCircleOutlined />
                Simple, Transparent Pricing
              </Space>
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#666' }}>
              Start free and scale as your team grows
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} justify="center">
            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', height: '100%' }} hoverable>
                <Title level={3}>Free</Title>
                <Title level={1} style={{ color: '#52c41a', margin: '16px 0' }}>$0</Title>
                <Text type="secondary">Perfect for small teams</Text>
                <List
                  style={{ margin: '24px 0' }}
                  dataSource={['10 audio summaries/month', 'Up to 2 team members', '2-5 min processing time']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button type="default" size="large" href="/" style={{ width: '100%' }}>
                  Start Free
                </Button>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card 
                style={{ 
                  textAlign: 'center', 
                  height: '100%', 
                  border: '2px solid #1890ff',
                  position: 'relative'
                }} 
                hoverable
              >
                <Badge 
                  count="Most Popular" 
                  style={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10, 
                    backgroundColor: '#1890ff' 
                  }} 
                />
                <Title level={3}>Pro</Title>
                <Title level={1} style={{ color: '#1890ff', margin: '16px 0' }}>$19.99</Title>
                <Text type="secondary">For growing teams</Text>
                <List
                  style={{ margin: '24px 0' }}
                  dataSource={['100 audio summaries/month', 'Up to 5 team members', '30s processing time', 'Usage insights & reports']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button type="primary" size="large" href="/pricing" style={{ width: '100%' }}>
                  Get Started
                </Button>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', height: '100%' }} hoverable>
                <Title level={3}>Enterprise</Title>
                <Title level={1} style={{ color: '#722ed1', margin: '16px 0' }}>$69.99</Title>
                <Text type="secondary">For large organizations</Text>
                <List
                  style={{ margin: '24px 0' }}
                  dataSource={['Unlimited summaries', 'Unlimited team members', '15s processing time', 'Advanced analytics + SLA']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button type="default" size="large" href="/pricing" style={{ width: '100%' }}>
                  Get Started
                </Button>
              </Card>
            </Col>
          </Row>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Paragraph style={{ color: '#666' }}>
              💰 <strong>20% discount available</strong> for non-profits, startups, and open source projects.{' '}
              <a href="mailto:hello@biirbal.ai?subject=Special Discount Inquiry">Contact us</a> to learn more.
            </Paragraph>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ padding: '80px 0', background: '#001529', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{ color: 'white' }}>
              Ready to Transform Your Team's Productivity?
            </Title>
            
            <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }}>
              Join thousands of teams already using biirbal.ai to stay informed and save time.
            </Paragraph>

            <Space size="large">
              <Button 
                type="primary" 
                size="large" 
                icon={<SlackOutlined />}
                href={slackInstallUrl}
                style={{ 
                  background: '#4A154B', 
                  borderColor: '#4A154B',
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600
                }}
              >
                Add to Slack - Free Trial
              </Button>
              
              <Button 
                size="large" 
                ghost
                href="/pricing"
                icon={<ArrowRightOutlined />}
                style={{ 
                  borderColor: 'white',
                  color: 'white',
                  height: 48,
                  fontSize: 16
                }}
              >
                View Pricing Plans
              </Button>
            </Space>

            <div style={{ marginTop: 40 }}>
              <Space split={<Divider type="vertical" />}>
                <Space>
                  <SafetyCertificateOutlined />
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Secure & Reliable</Text>
                </Space>
                <Space>
                  <GlobalOutlined />
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Fast Processing</Text>
                </Space>
                <Space>
                  <TeamOutlined />
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Team Support</Text>
                </Space>
              </Space>
            </div>
          </Space>
        </div>
      </div>

      {/* Trust Indicators */}
      <div style={{ padding: '40px 0', background: '#fafafa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Trusted by <strong>500+ teams</strong> who've saved <strong>1000+ hours</strong> staying informed
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