'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Card, 
  Col, 
  Row, 
  Avatar, 
  Button, 
  Badge, 
  Typography, 
  Space, 
  Progress,
  Spin,
  Alert,
  Tag,
  Descriptions,
  Table
} from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  LogoutOutlined,
  ArrowUpOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'

const { Title, Text } = Typography

interface TeamMember {
  id: string
  name: string
  email?: string
  joinedAt: string
  profile?: {
    display_name?: string
    real_name?: string
    image_24?: string
    image_32?: string
    image_48?: string
    title?: string
  }
  listenStats: {
    totalListens: number
    monthlyListens: number
    completedListens: number
    minutesListened: number
  }
}

interface TeamData {
  team: {
    id: string
    slackTeamId: string
    teamName: string
    isActive: boolean
    createdAt: string
    totalLinks: number
  }
  subscription: {
    status: string
    monthlyLimit: number
    linksProcessed: number
    stripeCustomerId?: string
  } | null
  usage: {
    monthlyUsage: number
    totalListens: number
    monthlyLimit: number
  }
  currentUser?: {
    id: string
    name: string
    email?: string
    profile?: {
      display_name?: string
      real_name?: string
      image_24?: string
      image_32?: string
      image_48?: string
      title?: string
    }
  }
  userListenStats?: {
    totalListens: number
    monthlyListens: number
    completedListens: number
    minutesListened: number
  }
  teamMembers?: TeamMember[]
}

export default function ProfilePage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchProfileData()
    
    // Check if mobile
    const checkIfMobile = () => setIsMobile(window.innerWidth <= 768)
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  const fetchProfileData = async () => {
    try {
      const storedTeamId = localStorage.getItem('biirbal_team_id')
      if (!storedTeamId) {
        setError('No team found. Please install the bot first.')
        setLoading(false)
        return
      }

      const storedUserId = localStorage.getItem('biirbal_user_id')
      
      let url = `/api/profile?teamId=${storedTeamId}`
      if (storedUserId) {
        url += `&userId=${storedUserId}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch profile data`)
      }

      const data = await response.json()
      setTeamData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('biirbal_')) {
          localStorage.removeItem(key)
        }
      })
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success'
      case 'trial':
        return 'processing'
      case 'inactive':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Layout currentPage="profile">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading your profile...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout currentPage="profile">
        <div style={{ maxWidth: 600, margin: '50px auto', padding: '0 16px' }}>
          <Alert
            message="Authentication Error"
            description={error}
            type="error"
            showIcon
            action={
              <Link href="/">
                <Button type="primary" danger size="small">
                  Reinstall Bot
                </Button>
              </Link>
            }
          />
        </div>
      </Layout>
    )
  }

  if (!teamData) {
    return null
  }

  const usagePercentage = teamData.usage && teamData.usage.monthlyLimit > 0 
    ? Math.round((teamData.usage.monthlyUsage / teamData.usage.monthlyLimit) * 100)
    : 0

  // Team members table columns
  const memberColumns = [
    {
      title: 'Member',
      key: 'member',
      width: '30%',
      render: (_: any, member: TeamMember) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar 
            size={32} 
            src={member.profile?.image_48}
            icon={<UserOutlined />}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {member.profile?.display_name || member.name}
            </div>
            {member.profile?.title && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {member.profile.title}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: '12%',
      render: (_: any, member: TeamMember) => (
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#52c41a' }}>
          {member.listenStats.totalListens}
        </div>
      ),
    },
    {
      title: 'Monthly',
      key: 'monthly',
      width: '12%',
      render: (_: any, member: TeamMember) => (
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#1890ff' }}>
          {member.listenStats.monthlyListens}
        </div>
      ),
    },
    {
      title: 'Completed',
      key: 'completed',
      width: '12%',
      render: (_: any, member: TeamMember) => (
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#722ed1' }}>
          {member.listenStats.completedListens}
        </div>
      ),
    },
    {
      title: 'Minutes',
      key: 'minutes',
      width: '12%',
      render: (_: any, member: TeamMember) => (
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: '#fa8c16' }}>
          {member.listenStats.minutesListened}
        </div>
      ),
    },
    {
      title: 'Joined',
      key: 'joined',
      width: '22%',
      render: (_: any, member: TeamMember) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {formatDate(member.joinedAt)}
        </Text>
      ),
    },
  ]

  return (
    <Layout currentPage="profile">
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
                  <UserOutlined />
                  Team Profile
                </Space>
              </Title>
            </Col>
            <Col>
              <Button 
                type="primary" 
                danger 
                size="small"
                icon={<LogoutOutlined />} 
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]} style={{ marginBottom: 0 }}>
          {/* Current User & Team Info */}
          <Col xs={24} md={12}>
            <Card size="small" style={{ height: '100%' }}>
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 14 }}>Current User & Team</Text>
              </div>
              
              {teamData.currentUser && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Avatar 
                      size={40} 
                      src={teamData.currentUser.profile?.image_48}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {teamData.currentUser.profile?.display_name || teamData.currentUser.name}
                      </div>
                      {teamData.currentUser.profile?.title && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {teamData.currentUser.profile.title}
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Descriptions size="small" column={1} colon={false}>
                <Descriptions.Item 
                  label={<Text style={{ fontSize: 11 }}>Team</Text>}
                >
                  <Text strong style={{ fontSize: 12 }}>{teamData.team?.teamName}</Text>
                  <Badge 
                    status={teamData.team?.isActive ? 'success' : 'error'} 
                    text={teamData.team?.isActive ? 'Active' : 'Inactive'}
                    style={{ marginLeft: 8, fontSize: 10 }}
                  />
                </Descriptions.Item>
                <Descriptions.Item 
                  label={<Text style={{ fontSize: 11 }}>Team ID</Text>}
                >
                  <Text code style={{ fontSize: 10 }}>{teamData.team?.slackTeamId}</Text>
                </Descriptions.Item>
                <Descriptions.Item 
                  label={<Text style={{ fontSize: 11 }}>Member Since</Text>}
                >
                  <Text style={{ fontSize: 12 }}>{formatDate(teamData.team?.createdAt || '')}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Subscription & Usage */}
          <Col xs={24} md={12}>
            <Card size="small" style={{ height: '100%' }}>
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 14 }}>Subscription & Usage</Text>
              </div>
              
              {teamData.subscription && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Tag color={getStatusColor(teamData.subscription.status)}>
                      <CrownOutlined /> {teamData.subscription.status}
                    </Tag>
                    <Text style={{ fontSize: 12 }}>
                      {teamData.subscription.monthlyLimit} links/month
                    </Text>
                  </div>
                  <Progress 
                    percent={usagePercentage} 
                    size="small"
                    status={usagePercentage > 90 ? 'exception' : usagePercentage > 70 ? 'active' : 'success'}
                    format={() => `${teamData.usage?.monthlyUsage}/${teamData.subscription?.monthlyLimit}`}
                  />
                </div>
              )}

              <Row gutter={8}>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                    {teamData.team?.totalLinks || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>Total Links</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#722ed1' }}>
                    {teamData.usage?.totalListens || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>Total Listens</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                    {teamData.usage?.monthlyUsage || 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>This Month</Text>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* User Stats */}
          {teamData.userListenStats && (
            <Col xs={24}>
              <Card size="small">
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 14 }}>Your Listen Statistics</Text>
                </div>
                <Row gutter={16}>
                  <Col xs={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                        {teamData.userListenStats.totalListens}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>Total Listens</Text>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                        {teamData.userListenStats.monthlyListens}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>Monthly Listens</Text>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#722ed1' }}>
                        {teamData.userListenStats.completedListens}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>Completed</Text>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fa8c16' }}>
                        {teamData.userListenStats.minutesListened}
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>Minutes</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}

          {/* Team Members Table */}
          {teamData.teamMembers && teamData.teamMembers.length > 0 && (
            <Col xs={24}>
              <Card size="small">
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    <TeamOutlined /> Team Members ({teamData.teamMembers.length})
                  </Text>
                </div>
                <Table
                  columns={memberColumns}
                  dataSource={teamData.teamMembers}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  showHeader={true}
                  scroll={{ x: 600 }}
                />
              </Card>
            </Col>
          )}

          {/* Compact Actions */}
          <Col xs={24}>
            <div style={{ textAlign: 'center' }}>
              <Link href="/pricing">
                <Button 
                  type="primary" 
                  icon={<ArrowUpOutlined />}
                  size="small"
                >
                  Upgrade Plan
                </Button>
              </Link>
            </div>
          </Col>
        </Row>
      </div>
    </Layout>
  )
}