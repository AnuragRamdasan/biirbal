'use client'

import { useEffect, useState } from 'react'
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
  Tag, 
  Table,
  Empty,
  Badge
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
  CalendarOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { AudioPlayer } from '@/components/dashboard/AudioPlayer'

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
  const [showListened, setShowListened] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
    
    return () => window.removeEventListener('resize', checkIfMobile)
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
          linkId: linkId,
          slackUserId: slackUserId
        }),
      })
    } catch (error) {
      console.error('Failed to track listen:', error)
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'PROCESSING':
        return 'processing'
      case 'FAILED':
        return 'error'
      default:
        return 'warning'
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

  const getListenCount = (link: ProcessedLink) => {
    return link.listens?.length || 0
  }

  const hasUserListened = (link: ProcessedLink) => {
    return link.listens && link.listens.length > 0
  }

  // Filter links based on the toggle
  const filteredLinks = showListened 
    ? links.filter(link => hasUserListened(link))
    : links



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
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                      {links.length}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10 }}>Total</Text>
                  </div>
                </Col>
                <Col xs={12} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#722ed1' }}>
                      {links.reduce((total, link) => total + getListenCount(link), 0)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10 }}>Listens</Text>
                  </div>
                </Col>
                <Col xs={12} sm={4}>
                  <Space size="small">
                    <Text style={{ fontSize: 12 }}>Listened</Text>
                    <Switch
                      size="small"
                      checked={showListened}
                      onChange={setShowListened}
                      checkedChildren={<EyeOutlined />}
                      unCheckedChildren={<EyeInvisibleOutlined />}
                    />
                  </Space>
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
                    ? "Showing all links including listened ones"
                    : "No new links. Toggle 'Show All' to see listened links too."
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
                onClick={() => {
                  if (record.processingStatus === 'COMPLETED' && record.audioFileUrl) {
                    setCurrentlyPlaying(record.id)
                    trackListen(record.id)
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ 
                          fontSize: 16, 
                          fontWeight: 600, 
                          color: '#262626',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {record.title || 'Untitled'}
                        </div>
                        {hasUserListened(record) && (
                          <Badge 
                            count="✓" 
                            style={{ backgroundColor: '#52c41a', fontSize: 10 }}
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
                        <Button
                          type="primary"
                          shape="circle"
                          size="large"
                          icon={currentlyPlaying === record.id ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentlyPlaying(record.id)
                            trackListen(record.id)
                          }}
                          style={{
                            background: currentlyPlaying === record.id ? '#ff4d4f' : '#52c41a',
                            borderColor: currentlyPlaying === record.id ? '#ff4d4f' : '#52c41a'
                          }}
                        />
                        
                        {/* Progress Info */}
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            0:00 / 0:59
                          </div>
                          <div style={{ 
                            width: '100%', 
                            height: 4, 
                            backgroundColor: '#f0f0f0', 
                            borderRadius: 2,
                            marginTop: 4
                          }}>
                            <div style={{ 
                              width: '0%', 
                              height: '100%', 
                              backgroundColor: '#1890ff', 
                              borderRadius: 2 
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