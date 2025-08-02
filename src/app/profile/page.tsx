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
  Table,
  Switch,
  message
} from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  LogoutOutlined,
  ArrowUpOutlined,
  SettingOutlined,
  MessageOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { PRICING_PLANS } from '@/lib/stripe'

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
    sendSummaryAsDM: boolean
  }
  subscription: {
    status: string
    planId: string
    monthlyLinkLimit: number
    stripeCustomerId?: string
  } | null
  usage: {
    monthlyUsage: number
    totalListens: number
    monthlyLinkLimit: number
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
      const storedUserId = localStorage.getItem('biirbal_user_id')
      if (!storedUserId) {
        setError('No user found. Please log in first.')
        setLoading(false)
        return
      }
      
      let url = `/api/profile?userId=${storedUserId}`
      
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
      // Clear all local storage items immediately
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('biirbal_')) {
          localStorage.removeItem(key)
        }
      })
      // Force immediate redirect to landing page
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, force redirect
      window.location.href = '/'
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

  const handleDMPreferenceChange = async (checked: boolean) => {
    try {
      const userId = localStorage.getItem('biirbal_user_id')
      if (!userId) {
        throw new Error('User ID not found')
      }

      const response = await fetch(`/api/team/dm-preference?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sendSummaryAsDM: checked }),
      })

      if (response.ok) {
        // Update local state
        setTeamData(prev => prev ? {
          ...prev,
          team: {
            ...prev.team,
            sendSummaryAsDM: checked
          }
        } : null)
        
        message.success(
          checked 
            ? 'Summary links will now be sent as direct messages' 
            : 'Summary links will now be sent as channel replies'
        )
      } else {
        throw new Error('Failed to update preference')
      }
    } catch (error) {
      message.error('Failed to update DM preference')
      console.error('Error updating DM preference:', error)
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

  const usagePercentage = teamData.usage && teamData.usage.monthlyLinkLimit > 0 
    ? Math.round((teamData.usage.monthlyUsage / teamData.usage.monthlyLinkLimit) * 100)
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
        padding: isMobile ? '24px 16px' : '32px 24px', 
        maxWidth: 1400, 
        margin: '0 auto',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        minHeight: '100vh'
      }}>
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
              <Space>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                }}>
                  <UserOutlined style={{ fontSize: '24px', color: 'white' }} />
                </div>
                <div>
                  <Title level={3} style={{ 
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Team Profile
                  </Title>
                  <Text style={{ 
                    color: '#666', 
                    fontSize: '16px',
                    marginTop: '4px',
                    display: 'block'
                  }}>
                    Manage your team settings and view statistics
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Button 
                type="default" 
                size="large"
                icon={<LogoutOutlined />} 
                onClick={handleLogout}
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: '2px solid rgba(255, 77, 79, 0.2)',
                  color: '#ff4d4f',
                  background: 'rgba(255, 77, 79, 0.05)',
                  transition: 'all 0.3s ease',
                  padding: '0 20px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(255, 77, 79, 0.3)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 77, 79, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 77, 79, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(255, 77, 79, 0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                Logout
              </Button>
            </Col>
          </Row>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 0 }}>
          {/* Modern Current User & Team Info */}
          <Col xs={24} md={12}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              borderRadius: '20px',
              padding: '24px',
              height: '100%',
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
              
              <div style={{ marginBottom: '20px' }}>
                <Text strong style={{ 
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Current User & Team
                </Text>
              </div>
              
              {teamData.currentUser && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16', marginBottom: '12px' }}>
                    <Avatar 
                      size={48} 
                      src={teamData.currentUser.profile?.image_48}
                      icon={<UserOutlined />}
                      style={{
                        border: '2px solid rgba(102, 126, 234, 0.2)',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
                      }}
                    />
                    <div>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: '#333',
                        marginBottom: '4px'
                      }}>
                        {teamData.currentUser.profile?.display_name || teamData.currentUser.name}
                      </div>
                      {teamData.currentUser.profile?.title && (
                        <Text style={{ 
                          color: '#666',
                          fontSize: '13px'
                        }}>
                          {teamData.currentUser.profile.title}
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ 
                    fontSize: '13px',
                    color: '#666',
                    fontWeight: 500
                  }}>
                    Team
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong style={{ fontSize: '14px', color: '#333' }}>
                      {teamData.team?.teamName}
                    </Text>
                    <div style={{
                      background: teamData.team?.isActive 
                        ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                        : 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
                      borderRadius: '50px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      color: 'white',
                      fontWeight: '600'
                    }}>
                      {teamData.team?.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ 
                    fontSize: '13px',
                    color: '#666',
                    fontWeight: 500
                  }}>
                    Team ID
                  </Text>
                  <Text code style={{ 
                    fontSize: '12px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    color: '#667eea'
                  }}>
                    {teamData.team?.slackTeamId}
                  </Text>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ 
                    fontSize: '13px',
                    color: '#666',
                    fontWeight: 500
                  }}>
                    Member Since
                  </Text>
                  <Text style={{ 
                    fontSize: '13px',
                    color: '#333'
                  }}>
                    {formatDate(teamData.team?.createdAt || '')}
                  </Text>
                </div>
              </div>
            </div>
          </Col>

          {/* Modern Subscription & Usage */}
          <Col xs={24} md={12}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              borderRadius: '20px',
              padding: '24px',
              height: '100%',
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
              
              <div style={{ marginBottom: '20px' }}>
                <Text strong style={{ 
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Subscription & Usage
                </Text>
              </div>
              
              {teamData.subscription && (
                <div style={{ marginBottom: '20px' }}>
                  {/* Current Plan */}
                  <div style={{ marginBottom: '16px' }}>
                    {(() => {
                      const currentPlan = Object.values(PRICING_PLANS).find(p => p.id === teamData.subscription?.planId) || PRICING_PLANS.FREE
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <Text strong style={{ 
                            fontSize: '16px', 
                            fontWeight: 700,
                            color: currentPlan.id === 'free' ? '#ff4d4f' : '#1890ff'
                          }}>
                            {currentPlan.name}
                          </Text>
                          <div style={{
                            background: currentPlan.id === 'free' 
                              ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)'
                              : 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                            borderRadius: '50px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            color: 'white',
                            fontWeight: '600'
                          }}>
                            {currentPlan.id === 'free' ? 'Free' : 'Paid'}
                          </div>
                        </div>
                      )
                    })()}
                    <Text style={{ 
                      color: '#666',
                      fontSize: '13px',
                      lineHeight: '1.4'
                    }}>
                      {teamData.subscription.planId === 'free' 
                        ? '20 links/month • 1 user' 
                        : 'Unlimited links • Multiple users'
                      }
                    </Text>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      background: `linear-gradient(135deg, ${getStatusColor(teamData.subscription.status)} 0%, ${getStatusColor(teamData.subscription.status)}80 100%)`,
                      borderRadius: '50px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      color: 'white',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CrownOutlined style={{ fontSize: '10px' }} />
                      {teamData.subscription.status}
                    </div>
                    <Text style={{ 
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      {teamData.subscription.monthlyLinkLimit === -1 ? 'Unlimited' : `${teamData.subscription.monthlyLinkLimit}`} links/month
                    </Text>
                  </div>
                  <Progress 
                    percent={usagePercentage} 
                    size="small"
                    status={usagePercentage > 90 ? 'exception' : usagePercentage > 70 ? 'active' : 'success'}
                    format={() => `${teamData.usage?.monthlyUsage}/${teamData.subscription?.monthlyLinkLimit === -1 ? '∞' : teamData.subscription?.monthlyLinkLimit}`}
                    strokeColor={usagePercentage > 90 ? '#ff4d4f' : usagePercentage > 70 ? '#faad14' : '#52c41a'}
                  />
                </div>
              )}

              <Row gutter={12}>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: '#1890ff',
                    marginBottom: '4px'
                  }}>
                    {teamData.team?.totalLinks || 0}
                  </div>
                  <Text style={{ 
                    color: '#666',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Total Links
                  </Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: '#722ed1',
                    marginBottom: '4px'
                  }}>
                    {teamData.usage?.totalListens || 0}
                  </div>
                  <Text style={{ 
                    color: '#666',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Total Listens
                  </Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: '#52c41a',
                    marginBottom: '4px'
                  }}>
                    {teamData.usage?.monthlyUsage || 0}
                  </div>
                  <Text style={{ 
                    color: '#666',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    This Month
                  </Text>
                </Col>
              </Row>
            </div>
          </Col>

          {/* Modern User Stats */}
          {teamData.userListenStats && (
            <Col xs={24}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                borderRadius: '20px',
                padding: '24px',
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
                
                <div style={{ marginBottom: '20px' }}>
                  <Text strong style={{ 
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#333'
                  }}>
                    Your Listen Statistics
                  </Text>
                </div>
                <Row gutter={16}>
                  <Col xs={6}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '16px',
                      background: 'rgba(82, 196, 26, 0.05)',
                      borderRadius: '16px',
                      border: '1px solid rgba(82, 196, 26, 0.1)'
                    }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: '#52c41a',
                        marginBottom: '8px'
                      }}>
                        {teamData.userListenStats.totalListens}
                      </div>
                      <Text style={{ 
                        color: '#666',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Total Listens
                      </Text>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '16px',
                      background: 'rgba(24, 144, 255, 0.05)',
                      borderRadius: '16px',
                      border: '1px solid rgba(24, 144, 255, 0.1)'
                    }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: '#1890ff',
                        marginBottom: '8px'
                      }}>
                        {teamData.userListenStats.monthlyListens}
                      </div>
                      <Text style={{ 
                        color: '#666',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Monthly Listens
                      </Text>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '16px',
                      background: 'rgba(114, 46, 209, 0.05)',
                      borderRadius: '16px',
                      border: '1px solid rgba(114, 46, 209, 0.1)'
                    }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: '#722ed1',
                        marginBottom: '8px'
                      }}>
                        {teamData.userListenStats.completedListens}
                      </div>
                      <Text style={{ 
                        color: '#666',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Completed
                      </Text>
                    </div>
                  </Col>
                  <Col xs={6}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '16px',
                      background: 'rgba(250, 140, 22, 0.05)',
                      borderRadius: '16px',
                      border: '1px solid rgba(250, 140, 22, 0.1)'
                    }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: '#fa8c16',
                        marginBottom: '8px'
                      }}>
                        {teamData.userListenStats.minutesListened}
                      </div>
                      <Text style={{ 
                        color: '#666',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Minutes
                      </Text>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          )}

          {/* Modern Team Settings */}
          <Col xs={24}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              borderRadius: '20px',
              padding: '24px',
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
              
              <div style={{ marginBottom: '20px' }}>
                <Text strong style={{ 
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  <SettingOutlined style={{ marginRight: '8px' }} />
                  Team Settings
                </Text>
              </div>
              
              <div style={{ 
                padding: '16px',
                background: 'rgba(24, 144, 255, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(24, 144, 255, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <MessageOutlined style={{ 
                        color: '#1890ff',
                        fontSize: '16px'
                      }} />
                      <Text strong style={{ 
                        fontSize: '14px',
                        color: '#333'
                      }}>
                        Send Summaries as Direct Messages
                      </Text>
                    </div>
                    <Text style={{ 
                      color: '#666',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      marginLeft: '28px'
                    }}>
                      When enabled, audio summary links will be sent as DMs to team members instead of channel replies
                    </Text>
                  </div>
                  <Switch
                    checked={teamData.team.sendSummaryAsDM}
                    onChange={handleDMPreferenceChange}
                    size="default"
                  />
                </div>
              </div>
            </div>
          </Col>

          {/* Modern Team Members Table */}
          {teamData.teamMembers && teamData.teamMembers.length > 0 && (
            <Col xs={24}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                borderRadius: '20px',
                padding: '24px',
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
                
                <div style={{ marginBottom: '20px' }}>
                  <Text strong style={{ 
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#333'
                  }}>
                    <TeamOutlined style={{ marginRight: '8px' }} />
                    Team Members ({teamData.teamMembers.length})
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
                  style={{
                    background: 'transparent'
                  }}
                />
              </div>
            </Col>
          )}

          {/* Modern Actions */}
          <Col xs={24}>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/pricing">
                <Button 
                  type="primary" 
                  icon={<ArrowUpOutlined />}
                  size="large"
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                    padding: '0 32px'
                  }}
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