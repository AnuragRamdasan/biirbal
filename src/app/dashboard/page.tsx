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
  Tooltip,
  Empty,
  Badge,
  Progress,
  Divider
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
import AudioPlayer from '@/components/dashboard/AudioPlayer'

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

  const columns = [
    {
      title: 'Link',
      dataIndex: 'title',
      key: 'title',
      width: '35%',
      render: (title: string, record: ProcessedLink) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 14 }}>
              {title || 'Untitled Link'}
            </Text>
            <Tag 
              color={getStatusColor(record.processingStatus)} 
              size="small"
              icon={getStatusIcon(record.processingStatus)}
            >
              {record.processingStatus}
            </Tag>
            {hasUserListened(record) && (
              <Badge 
                count="✓" 
                style={{ backgroundColor: '#52c41a', fontSize: 10 }}
              />
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <LinkOutlined /> {new URL(record.url).hostname}
          </Text>
          {record.extractedText && (
            <div style={{ marginTop: 4 }}>
              <Text 
                type="secondary" 
                style={{ fontSize: 11, display: 'block' }}
                ellipsis={{ rows: 2 }}
              >
                {record.extractedText}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Audio',
      key: 'audio',
      width: '30%',
      render: (_, record: ProcessedLink) => {
        if (record.processingStatus === 'completed' && record.audioFileUrl) {
          return (
            <AudioPlayer
              src={record.audioFileUrl}
              linkId={record.id}
              onPlay={() => {
                setCurrentlyPlaying(record.id)
                trackListen(record.id)
              }}
              onPause={() => setCurrentlyPlaying(null)}
              isCurrentlyPlaying={currentlyPlaying === record.id}
            />
          )
        }
        
        if (record.processingStatus === 'processing') {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: 12 }}>Processing...</Text>
            </div>
          )
        }
        
        if (record.processingStatus === 'failed') {
          return (
            <Text type="danger" style={{ fontSize: 12 }}>
              <ExclamationCircleOutlined /> Failed
            </Text>
          )
        }
        
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> Pending
          </Text>
        )
      },
    },
    {
      title: 'Stats',
      key: 'stats',
      width: '15%',
      render: (_, record: ProcessedLink) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
            {getListenCount(record)}
          </div>
          <Text type="secondary" style={{ fontSize: 10 }}>
            listens
          </Text>
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '20%',
      render: (date: string) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12 }}>
            <CalendarOutlined /> {formatDate(date)}
          </div>
        </div>
      ),
    },
  ]

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
      <div style={{ padding: '16px' }}>
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
            <Col>
              <Space size="middle">
                {/* Compact Stats */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                    {links.length}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>Total</Text>
                </div>
                <Divider type="vertical" style={{ height: 30 }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                    {links.filter(link => link.processingStatus === 'completed').length}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>Ready</Text>
                </div>
                <Divider type="vertical" style={{ height: 30 }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#722ed1' }}>
                    {links.reduce((total, link) => total + getListenCount(link), 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>Listens</Text>
                </div>
                <Divider type="vertical" style={{ height: 30 }} />
                <Space size="small">
                  <Text style={{ fontSize: 12 }}>Listened only</Text>
                  <Switch
                    size="small"
                    checked={showListened}
                    onChange={setShowListened}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                  />
                </Space>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Compact Table */}
        <Card size="small">
          {filteredLinks.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ fontSize: 12 }}>
                  {showListened 
                    ? "You haven't listened to any summaries yet"
                    : "No links found. Share some links in your Slack channels to get started!"
                  }
                </span>
              }
              style={{ padding: '20px 0' }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={filteredLinks}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 10,
                size: 'small',
                showSizeChanger: false,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} summaries`
              }}
              rowClassName={(record) => 
                currentlyPlaying === record.id ? 'ant-table-row-selected' : ''
              }
              style={{
                '.ant-table-thead > tr > th': {
                  padding: '8px 12px',
                  fontSize: '12px'
                },
                '.ant-table-tbody > tr > td': {
                  padding: '8px 12px'
                }
              }}
            />
          )}
        </Card>
      </div>
    </Layout>
  )
}