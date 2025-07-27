'use client'

import { useEffect, useState, useRef } from 'react'
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

interface AudioListen {
  id: string
  listenedAt: string
  completed: boolean
  listenDuration: number | null
  resumePosition?: number | null
}

export default function Dashboard() {
  const [links, setLinks] = useState<ProcessedLink[]>([])
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
  const [currentListenRecord, setCurrentListenRecord] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const audioStartTimes = useRef<Record<string, number>>({})
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null)
  
  // Initialize analytics
  const analytics = useAnalytics({
    autoTrackPageViews: true,
    trackScrollDepth: true,
    trackTimeOnPage: true
  })

  useEffect(() => {
    fetchLinks()
    
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
      
      // Check usage stats and warnings
      await checkUsageWarnings(teamId)
      
      // Track dashboard visit with analytics
      const userId = localStorage.getItem('biirbal_user_id')
      analytics.trackDashboard(teamId, userId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const checkUsageWarnings = async (teamId: string) => {
    try {
      // Include userId in the request for user-specific access control
      const userId = localStorage.getItem('biirbal_user_id')
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

  const trackListen = async (linkId: string): Promise<{ listen: any } | null> => {
    try {
      // Get the current user ID from localStorage if available
      const slackUserId = localStorage.getItem('biirbal_user_id')
      
      const response = await fetch('/api/dashboard/track-listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkId: linkId,
          slackUserId: slackUserId
        }),
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

  const updateListenProgress = async (listenId: string, duration: number, currentTime: number, completed: boolean = false) => {
    try {
      await fetch('/api/dashboard/complete-listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkId: currentlyPlaying,
          listenId: listenId,
          duration: duration,
          currentTime: currentTime,
          completed: completed
        }),
      })
    } catch (error) {
      console.error('Failed to update listen progress:', error)
    }
  }

  const handlePlayAudio = async (linkId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause()
      if (currentListenRecord && progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current)
        await updateListenProgress(currentListenRecord, audioElement.duration, audioElement.currentTime, false)
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
      return
    }

    const listenRecord = trackResult.listen
    setCurrentListenRecord(listenRecord.id)

    // Create new audio element
    const audio = new Audio(audioUrl)
    audioStartTimes.current[linkId] = Date.now()
    
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
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration)
      }
    })
    
    audio.addEventListener('ended', async () => {
      const listenDuration = audioStartTimes.current[linkId] 
        ? (Date.now() - audioStartTimes.current[linkId]) / 1000 
        : audio.duration
      
      // Track audio completion
      analytics.trackAudioComplete(linkId, 100, listenDuration)
      
      // Mark listen as completed
      if (currentListenRecord) {
        await updateListenProgress(currentListenRecord, audio.duration, audio.duration, true)
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      }
      
      setCurrentlyPlaying(null)
      setAudioElement(null)
      setCurrentListenRecord(null)
      setCurrentTime(0)
      setProgress(0)
      setDuration(0)
    })
    
    audio.addEventListener('error', () => {
      console.error('Audio playback failed')
      analytics.trackFeature('audio_play_error', { link_id: linkId })
      setCurrentlyPlaying(null)
      setAudioElement(null)
      setCurrentListenRecord(null)
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
      progressUpdateInterval.current = setInterval(() => {
        if (audio.duration > 0 && currentListenRecord) {
          updateListenProgress(currentListenRecord, audio.duration, audio.currentTime, false)
        }
      }, 10000) // Update every 10 seconds
      
    }).catch((error) => {
      console.error('Failed to play audio:', error)
      analytics.trackFeature('audio_play_error', { link_id: linkId, error: error.message })
      setCurrentlyPlaying(null)
      setAudioElement(null)
      setCurrentListenRecord(null)
      setCurrentTime(0)
      setProgress(0)
      setDuration(0)
    })
  }

  const handlePauseAudio = async () => {
    if (audioElement && currentlyPlaying) {
      const listenDuration = audioStartTimes.current[currentlyPlaying] 
        ? (Date.now() - audioStartTimes.current[currentlyPlaying]) / 1000 
        : 0
      const completionPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0
      
      // Save current progress
      if (currentListenRecord) {
        await updateListenProgress(currentListenRecord, audioElement.duration, audioElement.currentTime, false)
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current)
        }
      }
      
      // Track partial completion if user listened to some of the audio
      if (completionPercentage > 10) {
        analytics.trackAudioComplete(currentlyPlaying, completionPercentage, listenDuration)
      }
      
      analytics.trackFeature('audio_paused', { 
        link_id: currentlyPlaying, 
        completion_percentage: completionPercentage,
        listen_duration: listenDuration
      })
      
      audioElement.pause()
      setCurrentlyPlaying(null)
      setAudioElement(null)
      setCurrentListenRecord(null)
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
    return link.listens && link.listens.length > 0
  }

  const getMinutesCurated = () => {
    return Math.round(
      links
        .filter(link => link.processingStatus === 'COMPLETED')
        .reduce((total, link) => {
          const trackDuration = audioDurations[link.id]
          return trackDuration ? total + trackDuration : total
        }, 0) / 60
    )
  }

  const getMinutesListened = () => {
    return Math.round(
      links.reduce((total, link) => {
        // Sum up the actual listen durations from completed listens
        const listenTime = link.listens.reduce((linkTotal, listen) => {
          if (listen.listenDuration && listen.listenDuration > 0) {
            return linkTotal + listen.listenDuration
          }
          // Fallback to track duration for completed listens without duration
          if (listen.completed && audioDurations[link.id]) {
            return linkTotal + audioDurations[link.id]
          }
          return linkTotal
        }, 0)
        return total + listenTime
      }, 0) / 60
    )
  }



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
              <Button type="primary" size="small" onClick={fetchLinks}>
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
        padding: isMobile ? '12px 16px' : '16px 24px', 
        maxWidth: 1400, 
        margin: '0 auto'
      }}>
        {/* Exception Team Banner */}
        {isExceptionTeam && (
          <Alert
            message="Complimentary Access"
            description="🎉 You're using Biirbal with complimentary access! No usage limits apply to your team."
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Usage Warning */}
        {usageWarning && !isExceptionTeam && (
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

        {/* User Access Restricted Alert */}
        {!userCanConsume && !isExceptionTeam && (
          <Alert
            message="Access Restricted"
            description="Your access to audio playback has been disabled because the team has exceeded its seat limit. Contact your admin to upgrade the plan or manage team members."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Space>
                <Button size="small" href="/team">
                  Manage Team
                </Button>
                <Button size="small" href="/pricing" type="primary">
                  View Plans
                </Button>
              </Space>
            }
          />
        )}

        {/* Link Limit Exceeded Alert */}
        {linkLimitExceeded && !isExceptionTeam && userCanConsume && (
          <Alert
            message="Playback Restricted"
            description="You've exceeded your monthly link limit. Audio playback is disabled. Links will continue to be processed and posted to Slack."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" href="/pricing" type="primary">
                Upgrade Now
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
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                      {links.length}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10 }}>Total</Text>
                  </div>
                </Col>
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#722ed1' }}>
                      {links.reduce((total, link) => total + getListenCount(link), 0)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10 }}>Listens</Text>
                  </div>
                </Col>
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                      {getMinutesCurated()}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10 }}>Min Curated</Text>
                  </div>
                </Col>
                <Col xs={6} sm={4}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#fa8c16' }}>
                      {getMinutesListened()}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10 }}>Min Listened</Text>
                  </div>
                </Col>
                <Col xs={24} sm={16}>
                  <Row gutter={[8, 8]} align="middle" justify="end">
                    <Col>
                      <Space size="small">
                        <Text style={{ fontSize: 12 }}>Source:</Text>
                        <Select
                          size="small"
                          value={sourceFilter}
                          onChange={(value) => {
                            setSourceFilter(value)
                            analytics.trackFeature('source_filter_change', { 
                              source_filter: value 
                            })
                          }}
                          style={{ width: 140 }}
                          options={[
                            { value: 'all', label: '🔗 All Sources' },
                            ...getChannelOptions().map(channel => ({
                              value: channel,
                              label: channel === 'chrome' ? '🌐 Chrome' : `💬 #${channel}`
                            }))
                          ]}
                        />
                      </Space>
                    </Col>
                    <Col>
                      <Space size="small">
                        <Text style={{ fontSize: 12 }}>Show All</Text>
                        <Switch
                          size="small"
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
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Card-based Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredLinks.length === 0 ? (
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
            filteredLinks.map((record) => (
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
                    // Check access restrictions
                    if ((!userCanConsume || linkLimitExceeded) && !isExceptionTeam) return
                    
                    if (currentlyPlaying === record.id) {
                      await handlePauseAudio()
                    } else {
                      await handlePlayAudio(record.id, record.audioFileUrl)
                    }
                  }
                }}
              >
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
                            icon={currentlyPlaying === record.id ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
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
              </Card>
            ))
          )}
        </div>
      </div>

    </Layout>
  )
}