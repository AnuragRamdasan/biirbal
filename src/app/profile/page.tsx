'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Card, 
  Col, 
  Row, 
  Statistic, 
  Avatar, 
  Button, 
  Badge, 
  Typography, 
  Space, 
  Divider, 
  Progress,
  Spin,
  Alert,
  Tag,
  List,
  Descriptions
} from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  SoundOutlined,
  CalendarOutlined,
  CrownOutlined,
  LogoutOutlined,
  ArrowUpOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  MailOutlined,
  IdcardOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'

const { Title, Text, Paragraph } = Typography

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
  }
  teamMembers?: TeamMember[]
}

export default function ProfilePage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchProfileData()
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
      month: 'long',
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
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading your profile...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout currentPage="profile">
        <div style={{ maxWidth: 600, margin: '100px auto', padding: '0 24px' }}>
          <Alert
            message="Authentication Error"
            description={error}
            type="error"
            showIcon
            action={
              <Link href="/">
                <Button type="primary" danger>
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

  return (
    <Layout currentPage="profile">
      <div style={{ padding: '24px' }}>
        {/* Header with Logout */}
        <div style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                <Space>
                  <UserOutlined />
                  Team Profile
                </Space>
              </Title>
              <Text type="secondary">Manage your biirbal.ai settings and subscription</Text>
            </Col>
            <Col>
              <Button 
                type="primary" 
                danger 
                icon={<LogoutOutlined />} 
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Col>
          </Row>
        </div>

        <Row gutter={[24, 24]}>
          {/* Current User Card */}
          {teamData.currentUser && (
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <UserOutlined />
                    Current User
                  </Space>
                }
                bordered={false}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Avatar 
                    size={64} 
                    src={teamData.currentUser.profile?.image_48}
                    icon={<UserOutlined />}
                  />
                  <div style={{ flex: 1 }}>
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="Display Name">
                        {teamData.currentUser.profile?.display_name || teamData.currentUser.name}
                      </Descriptions.Item>
                      {teamData.currentUser.profile?.real_name && (
                        <Descriptions.Item label="Real Name">
                          {teamData.currentUser.profile.real_name}
                        </Descriptions.Item>
                      )}
                      {teamData.currentUser.email && (
                        <Descriptions.Item label="Email">
                          <Space>
                            <MailOutlined />
                            {teamData.currentUser.email}
                          </Space>
                        </Descriptions.Item>
                      )}
                      {teamData.currentUser.profile?.title && (
                        <Descriptions.Item label="Title">
                          {teamData.currentUser.profile.title}
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="User ID">
                        <Text code>{teamData.currentUser.id}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </div>
              </Card>
            </Col>
          )}

          {/* User Listen Statistics */}
          {teamData.userListenStats && (
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <SoundOutlined />
                    Your Listen Statistics
                  </Space>
                }
                bordered={false}
              >
                <Row gutter={24}>
                  <Col xs={24} sm={8}>
                    <Statistic
                      title="Total Listens"
                      value={teamData.userListenStats.totalListens}
                      prefix={<PlayCircleOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Statistic
                      title="This Month's Listens"
                      value={teamData.userListenStats.monthlyListens}
                      prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <Statistic
                      title="Completed Listens"
                      value={teamData.userListenStats.completedListens}
                      prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          )}

          {/* Team Information */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <TeamOutlined />
                  Team Information
                </Space>
              }
              bordered={false}
            >
              <Descriptions column={1} size="middle">
                <Descriptions.Item label="Team Name">
                  <Text strong>{teamData.team?.teamName || 'Unknown Team'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Badge 
                    status={teamData.team?.isActive ? 'success' : 'error'} 
                    text={teamData.team?.isActive ? 'Active' : 'Inactive'} 
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Slack Team ID">
                  <Text code>{teamData.team?.slackTeamId || 'N/A'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Joined">
                  {teamData.team?.createdAt ? formatDate(teamData.team.createdAt) : 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Subscription Info */}
          <Col xs={24} lg={12}>
            {teamData.subscription && (
              <Card 
                title={
                  <Space>
                    <CrownOutlined />
                    Subscription
                  </Space>
                }
                bordered={false}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Plan: </Text>
                    <Tag color={getStatusColor(teamData.subscription?.status || 'inactive')}>
                      {teamData.subscription?.status || 'No Plan'}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Monthly Limit: </Text>
                    <Text>{teamData.subscription?.monthlyLimit || 0} links</Text>
                  </div>
                  <div>
                    <Text strong>Used This Month: </Text>
                    <Text>{teamData.subscription?.linksProcessed || 0} links</Text>
                  </div>
                  <div>
                    <Text strong>Monthly Usage: </Text>
                    <Progress 
                      percent={usagePercentage} 
                      status={usagePercentage > 90 ? 'exception' : usagePercentage > 70 ? 'active' : 'success'}
                      strokeColor={usagePercentage > 90 ? '#ff4d4f' : usagePercentage > 70 ? '#faad14' : '#52c41a'}
                    />
                  </div>
                </Space>
              </Card>
            )}
          </Col>

          {/* Usage Statistics */}
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <LinkOutlined />
                  Usage Statistics
                </Space>
              }
              bordered={false}
            >
              <Row gutter={24}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Total Links Processed"
                    value={teamData.team?.totalLinks || 0}
                    prefix={<LinkOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Total Audio Listens"
                    value={teamData.usage?.totalListens || 0}
                    prefix={<SoundOutlined style={{ color: '#722ed1' }} />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="This Month's Usage"
                    value={teamData.usage?.monthlyUsage || 0}
                    prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Team Members */}
          {teamData.teamMembers && teamData.teamMembers.length > 0 && (
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <TeamOutlined />
                    Team Members ({teamData.teamMembers.length})
                  </Space>
                }
                bordered={false}
              >
                <List
                  grid={{
                    gutter: 16,
                    xs: 1,
                    sm: 2,
                    md: 2,
                    lg: 3,
                    xl: 3,
                    xxl: 4,
                  }}
                  dataSource={teamData.teamMembers}
                  renderItem={(member) => (
                    <List.Item>
                      <Card 
                        size="small"
                        style={{ height: '100%' }}
                        bodyStyle={{ padding: 16 }}
                      >
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                          <Avatar 
                            size={48} 
                            src={member.profile?.image_48}
                            icon={<UserOutlined />}
                            style={{ marginBottom: 8 }}
                          />
                          <div>
                            <div>
                              <Text strong>
                                {member.profile?.display_name || member.name}
                              </Text>
                            </div>
                            {member.profile?.real_name && member.profile.real_name !== member.name && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {member.profile.real_name}
                              </Text>
                            )}
                            {member.profile?.title && (
                              <div>
                                <Tag size="small" color="blue" style={{ marginTop: 4 }}>
                                  {member.profile.title}
                                </Tag>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Row gutter={8} style={{ marginBottom: 12 }}>
                          <Col span={8} style={{ textAlign: 'center' }}>
                            <Statistic
                              title="Total"
                              value={member.listenStats.totalListens}
                              valueStyle={{ fontSize: 16, color: '#52c41a' }}
                            />
                          </Col>
                          <Col span={8} style={{ textAlign: 'center' }}>
                            <Statistic
                              title="Monthly"
                              value={member.listenStats.monthlyListens}
                              valueStyle={{ fontSize: 16, color: '#1890ff' }}
                            />
                          </Col>
                          <Col span={8} style={{ textAlign: 'center' }}>
                            <Statistic
                              title="Completed"
                              value={member.listenStats.completedListens}
                              valueStyle={{ fontSize: 16, color: '#722ed1' }}
                            />
                          </Col>
                        </Row>
                        
                        <div style={{ textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Joined {formatDate(member.joinedAt)}
                          </Text>
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          )}

          {/* Actions */}
          <Col span={24}>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Link href="/pricing">
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ArrowUpOutlined />}
                  style={{ minWidth: 160 }}
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