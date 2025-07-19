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
  Avatar, 
  List,
  Tooltip,
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
  ExclamationCircleOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import AudioPlayer from '@/components/dashboard/AudioPlayer'

const { Title, Text, Paragraph } = Typography

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
  const [showListened, setShowListened] = useState(false)

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
          linkId: linkId,
          slackUserId: slackUserId
        }),
      })
    } catch (error) {
      console.error('Failed to track listen:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'processing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />
      case 'failed':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success'
      case 'processing':
        return 'processing'
      case 'failed':
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
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
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
        <div style={{ maxWidth: 600, margin: '100px auto', padding: '0 24px' }}>
          <Alert
            message="Error Loading Dashboard"
            description={error}
            type="error"
            showIcon
            action={
              <Button type="primary" onClick={fetchLinks}>
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
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <Space>
                  <SoundOutlined />
                  Audio Summaries
                </Space>
              </Title>
              <Text type="secondary">Listen to AI-generated summaries of your shared links</Text>
            </Col>
            <Col>
              <Space>
                <Text>Show listened only</Text>
                <Switch
                  checked={showListened}
                  onChange={setShowListened}
                  checkedChildren={<EyeOutlined />}
                  unCheckedChildren={<EyeInvisibleOutlined />}
                />
              </Space>
            </Col>
          </Row>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <LinkOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{links.length}</div>
                <Text type="secondary">Total Links</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <SoundOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                  {links.filter(link => link.processingStatus === 'completed').length}
                </div>
                <Text type="secondary">Ready to Listen</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: 24, color: '#722ed1', marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                  {links.reduce((total, link) => total + getListenCount(link), 0)}
                </div>
                <Text type="secondary">Total Listens</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Links List */}
        {filteredLinks.length === 0 ? (
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                showListened 
                  ? "You haven't listened to any summaries yet"
                  : "No links found. Share some links in your Slack channels to get started!"
              }
            />
          </Card>
        ) : (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 1,
              md: 2,
              lg: 2,
              xl: 3,
              xxl: 3,
            }}
            dataSource={filteredLinks}
            renderItem={(link) => (
              <List.Item>
                <Card
                  id={`link-${link.id}`}
                  hoverable
                  style={{ height: '100%' }}
                  cover={
                    link.ogImage && (
                      <div style={{ height: 200, overflow: 'hidden' }}>
                        <img
                          alt={link.title || 'Link preview'}
                          src={link.ogImage}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover' 
                          }}
                        />
                      </div>
                    )
                  }
                  actions={[
                    <Tooltip title="Processing Status" key="status">
                      <Badge 
                        count={getStatusIcon(link.processingStatus)} 
                        showZero={false}
                      />
                    </Tooltip>,
                    <Tooltip title="Listen Count" key="listens">
                      <Space>
                        <PlayCircleOutlined />
                        {getListenCount(link)}
                      </Space>
                    </Tooltip>,
                    <Tooltip title="Created" key="date">
                      <Space>
                        <ClockCircleOutlined />
                        {formatDate(link.createdAt)}
                      </Space>
                    </Tooltip>
                  ]}
                >
                  <Card.Meta
                    title={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Text strong style={{ fontSize: 16 }}>
                            {link.title || 'Untitled Link'}
                          </Text>
                          <Tag color={getStatusColor(link.processingStatus)}>
                            {link.processingStatus}
                          </Tag>
                        </div>
                        {hasUserListened(link) && (
                          <Badge 
                            count="Listened" 
                            style={{ backgroundColor: '#52c41a' }}
                          />
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Paragraph 
                          ellipsis={{ rows: 2, expandable: false }}
                          type="secondary"
                          style={{ marginBottom: 12 }}
                        >
                          {link.extractedText || 'No description available'}
                        </Paragraph>
                        
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <LinkOutlined /> {new URL(link.url).hostname}
                          </Text>
                        </div>

                        {link.processingStatus === 'completed' && link.audioFileUrl && (
                          <AudioPlayer
                            src={link.audioFileUrl}
                            linkId={link.id}
                            onPlay={() => {
                              setCurrentlyPlaying(link.id)
                              trackListen(link.id)
                            }}
                            onPause={() => setCurrentlyPlaying(null)}
                            isCurrentlyPlaying={currentlyPlaying === link.id}
                          />
                        )}

                        {link.processingStatus === 'processing' && (
                          <div style={{ textAlign: 'center', padding: 16 }}>
                            <Spin />
                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary">Processing audio summary...</Text>
                            </div>
                          </div>
                        )}

                        {link.processingStatus === 'failed' && (
                          <Alert
                            message="Processing Failed"
                            description="Unable to process this link. Please try again."
                            type="error"
                            showIcon
                            size="small"
                          />
                        )}
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>
    </Layout>
  )
}