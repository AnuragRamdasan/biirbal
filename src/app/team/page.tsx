'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Typography, 
  Space, 
  Spin, 
  Alert, 
  List,
  Avatar,
  Tag,
  Popconfirm,
  message,
  Tooltip,
  Progress,
  Divider,
  Modal,
  Form,
  Input
} from 'antd'
import {
  UserOutlined,
  CrownOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  TeamOutlined,
  SettingOutlined,
  UserAddOutlined,
  MailOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { useAnalytics } from '@/hooks/useAnalytics'
import { PRICING_PLANS } from '@/lib/stripe'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const { Title, Text } = Typography

interface TeamMember {
  id: string
  slackUserId: string | null
  name: string
  displayName?: string
  realName?: string
  email?: string
  profileImage32?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PendingInvitation {
  id: string
  email: string
  invitedBy: string | null
  status: string
  expiresAt: string
  createdAt: string
}

type TeamMemberOrInvitation = (TeamMember & { type: 'member' }) | (PendingInvitation & { type: 'invitation' })

interface TeamData {
  members: TeamMember[]
  pendingInvitations: PendingInvitation[]
  teamInfo: {
    id: string
    slackTeamId: string
    teamName: string
  }
  subscription: {
    planId: string
    userLimit: number
    currentUsers: number
    userLimitExceeded: boolean
  }
}

export default function TeamManagement() {
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [inviteModalVisible, setInviteModalVisible] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteForm] = Form.useForm()
  const { data: session } = useSession()
  
  // Initialize analytics
  const analytics = useAnalytics({
    autoTrackPageViews: true,
    trackScrollDepth: true,
    trackTimeOnPage: true
  })

  // Helper function to get unique identifier for member
  const getMemberUniqueId = (member: TeamMember): string => {
    return member.slackUserId || member.id
  }

  // Combine members and pending invitations for display
  const getCombinedMembersList = (): TeamMemberOrInvitation[] => {
    if (!teamData) return []
    
    const members: TeamMemberOrInvitation[] = teamData.members.map(member => ({
      ...member,
      type: 'member' as const
    }))
    
    const invitations: TeamMemberOrInvitation[] = teamData.pendingInvitations.map(invitation => ({
      ...invitation,
      type: 'invitation' as const
    }))
    
    return [...members, ...invitations]
  }

  useEffect(() => {
    // Only fetch data when we have either a NextAuth session or Slack user ID
    const slackUserId = localStorage.getItem('biirbal_user_id')
    const nextAuthUserId = session?.user?.id
    
    if (nextAuthUserId || slackUserId) {
      fetchTeamData()
    }
  }, [session])

  const fetchTeamData = async () => {
    try {
      // Get user ID from either NextAuth session or localStorage (Slack OAuth)
      const slackUserId = localStorage.getItem('biirbal_user_id')
      const nextAuthUserId = session?.user?.id
      
      const userId = nextAuthUserId || slackUserId
      
      if (!userId) {
        throw new Error('No user found. Please log in again.')
      }

      const response = await fetch(`/api/team/members?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch team data')
      }
      
      const data = await response.json()
      setTeamData(data)
      
      // Track team management visit
      analytics.trackFeature('team_management_visit', {
        team_id: data.team.slackTeamId, // Use team ID from response
        member_count: data.members.length,
        plan_type: data.subscription.planId
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberAction = async (member: TeamMember, action: 'disable' | 'enable' | 'remove') => {
    try {
      // Use slackUserId for Slack OAuth users, email for invited users
      const userId = member.slackUserId || member.email
      const uniqueId = member.slackUserId || member.id // For loading state
      
      setActionLoading(uniqueId)
      // Get user ID from either NextAuth session or localStorage (Slack OAuth)
      const slackUserId = localStorage.getItem('biirbal_user_id')
      const nextAuthUserId = session?.user?.id
      
      const currentUserId = nextAuthUserId || slackUserId
      // Note: currentUserId is either slackUserId (for Slack OAuth users) or database id (for invited users)
      
      const response = await fetch('/api/team/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          removedBy: currentUserId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update member')
      }

      const result = await response.json()
      message.success(result.message)
      
      // Track the action
      analytics.trackFeature('member_action', {
        team_id: teamData?.team.slackTeamId,
        action,
        target_user_id: userId
      })
      
      // Refresh the data
      await fetchTeamData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to update member')
      console.error('Member action error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleInviteUser = async (values: { email: string }) => {
    try {
      setInviteLoading(true)
      // Get user ID from either NextAuth session or localStorage (Slack OAuth)
      const slackUserId = localStorage.getItem('biirbal_user_id')
      const nextAuthUserId = session?.user?.id
      
      const currentUserId = nextAuthUserId || slackUserId
      
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          invitedBy: currentUserId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      const result = await response.json()
      message.success('Invitation sent successfully!')
      
      // Track the invitation
      analytics.trackFeature('user_invitation_sent', {
        team_id: teamData?.team.slackTeamId,
        invited_email: values.email
      })
      
      // Reset form and close modal
      inviteForm.resetFields()
      setInviteModalVisible(false)
      
      // Refresh the data to show any updates
      await fetchTeamData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to send invitation')
      console.error('Invite error:', error)
    } finally {
      setInviteLoading(false)
    }
  }

  const getStatusTag = (member: TeamMember, index: number) => {
    if (!member.isActive) {
      return <Tag color="red">Disabled</Tag>
    }
    
    if (teamData?.subscription.userLimit !== -1 && index >= teamData.subscription.userLimit) {
      return <Tag color="orange">Over Limit</Tag>
    }
    
    return <Tag color="green">Active</Tag>
  }

  const getActionButtons = (member: TeamMember, index: number) => {
    const isOverLimit = teamData?.subscription.userLimit !== -1 && index >= teamData.subscription.userLimit
    const isFirstUser = index === 0
    
    return (
      <Space>
        {member.isActive ? (
          <Popconfirm
            title="Disable user access?"
            description="This will prevent the user from playing audio summaries."
            onConfirm={() => handleMemberAction(member, 'disable')}
            okText="Disable"
            cancelText="Cancel"
          >
            <Button 
              size="small" 
              icon={<StopOutlined />}
              loading={actionLoading === getMemberUniqueId(member)}
              disabled={isFirstUser}
            >
              Disable
            </Button>
          </Popconfirm>
        ) : (
          <Button 
            size="small" 
            icon={<CheckCircleOutlined />}
            onClick={() => handleMemberAction(member, 'enable')}
            loading={actionLoading === getMemberUniqueId(member)}
            disabled={isOverLimit}
          >
            Enable
          </Button>
        )}
        
        <Popconfirm
          title="Remove user from team?"
          description="This will permanently remove the user and disable their access."
          onConfirm={() => handleMemberAction(member, 'remove')}
          okText="Remove"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />}
            loading={actionLoading === getMemberUniqueId(member)}
            disabled={isFirstUser}
          >
            Remove
          </Button>
        </Popconfirm>
      </Space>
    )
  }

  if (loading) {
    return (
      <Layout currentPage="team">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Loading team management...</Text>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout currentPage="team">
        <div style={{ maxWidth: 600, margin: '50px auto', padding: '0 16px' }}>
          <Alert
            message="Error Loading Team Data"
            description={error}
            type="error"
            showIcon
            action={
              <Button type="primary" size="small" onClick={fetchTeamData}>
                Retry
              </Button>
            }
          />
        </div>
      </Layout>
    )
  }

  if (!teamData) {
    return null
  }

  const activeMembers = teamData.members.filter(m => m.isActive).length
  const seatUsagePercentage = teamData.subscription.userLimit === -1 
    ? 0 
    : Math.round((activeMembers / teamData.subscription.userLimit) * 100)

  return (
    <ProtectedRoute>
      <Layout currentPage="team">
      <div style={{ 
        padding: '32px 24px', 
        maxWidth: 1200, 
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
                  <TeamOutlined style={{ fontSize: '24px', color: 'white' }} />
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
                    {teamData.teamInfo?.teamName || 'Team Management'}
                  </Title>
                  <Text style={{ 
                    color: '#666', 
                    fontSize: '16px',
                    marginTop: '4px',
                    display: 'block'
                  }}>
                    Manage team members and access
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space size="middle">
                <Button 
                  type="default" 
                  icon={<UserAddOutlined />}
                  onClick={() => setInviteModalVisible(true)}
                  style={{
                    height: '40px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: '2px solid rgba(102, 126, 234, 0.2)',
                    color: '#667eea'
                  }}
                >
                  Invite Member
                </Button>
                <Button 
                  type="primary" 
                  icon={<SettingOutlined />}
                  href="/pricing"
                  style={{
                    height: '40px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  Upgrade Plan
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Modern Current Plan */}
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
          
          <div style={{ marginBottom: '20px' }}>
            <Title level={4} style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#333'
            }}>
              Current Plan
            </Title>
          </div>
          
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12}>
              {(() => {
                const currentPlan = Object.values(PRICING_PLANS).find(p => p.id === teamData.subscription.planId) || PRICING_PLANS.FREE
                return (
                  <Space direction="vertical" size="small">
                    <div>
                      <Text strong style={{ 
                        fontSize: '20px', 
                        fontWeight: 700,
                        color: currentPlan.id === 'free' ? '#ff4d4f' : '#1890ff'
                      }}>
                        {currentPlan.name}
                      </Text>
                      {currentPlan.id !== 'free' && (
                        <div style={{
                          background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                          borderRadius: '50px',
                          padding: '4px 12px',
                          display: 'inline-block',
                          marginLeft: '12px'
                        }}>
                          <Text style={{ 
                            color: 'white', 
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Active
                          </Text>
                        </div>
                      )}
                    </div>
                    <Text style={{ 
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {currentPlan.id === 'free' 
                        ? '20 links/month • 1 user' 
                        : `Unlimited links • ${currentPlan.userLimit === -1 ? 'Unlimited' : currentPlan.userLimit} users`
                      }
                    </Text>
                    {currentPlan.description && (
                      <Text style={{ 
                        color: '#999',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {currentPlan.description}
                      </Text>
                    )}
                  </Space>
                )
              })()}
            </Col>
            <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
              <Space>
                {teamData.subscription.planId === 'free' ? (
                  <Button 
                    type="primary" 
                    href="/pricing"
                    style={{
                      height: '40px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    Upgrade Plan
                  </Button>
                ) : (
                  <Button 
                    href="/pricing"
                    style={{
                      height: '40px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 500,
                      border: '2px solid rgba(102, 126, 234, 0.2)',
                      color: '#667eea'
                    }}
                  >
                    Change Plan
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Modern Seat Usage */}
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
          
          <div style={{ marginBottom: '20px' }}>
            <Title level={4} style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#333'
            }}>
              Seat Usage
            </Title>
          </div>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ 
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(24, 144, 255, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(24, 144, 255, 0.1)'
              }}>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  color: '#1890ff',
                  marginBottom: '8px'
                }}>
                  {activeMembers}
                </div>
                <Text style={{ 
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Active Members
                </Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ 
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(82, 196, 26, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(82, 196, 26, 0.1)'
              }}>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: '700', 
                  color: '#52c41a',
                  marginBottom: '8px'
                }}>
                  {teamData.subscription.userLimit === -1 ? '∞' : teamData.subscription.userLimit}
                </div>
                <Text style={{ 
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Seat Limit
                </Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ 
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(250, 173, 20, 0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(250, 173, 20, 0.1)'
              }}>
                <Progress 
                  type="circle" 
                  percent={seatUsagePercentage}
                  size={60}
                  status={teamData.subscription.userLimitExceeded ? 'exception' : 'normal'}
                  strokeColor={teamData.subscription.userLimitExceeded ? '#ff4d4f' : '#faad14'}
                />
                <div style={{ marginTop: '12px' }}>
                  <Text style={{ 
                    color: '#666',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Usage
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
          
          {teamData.subscription.userLimitExceeded && (
            <div style={{
              background: 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginTop: '20px',
              boxShadow: '0 8px 24px rgba(250, 173, 20, 0.15)',
              border: '1px solid rgba(250, 173, 20, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ExclamationCircleOutlined style={{ color: 'white', fontSize: '16px' }} />
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                      Seat limit exceeded
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                      Some members may have restricted access. Consider upgrading your plan or disabling inactive members.
                    </div>
                  </div>
                </div>
                <Button 
                  size="small" 
                  href="/pricing"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: 500
                  }}
                >
                  Upgrade
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modern Member List */}
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
          
          <div style={{ marginBottom: '20px' }}>
            <Title level={4} style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#333'
            }}>
              <Space>
                <UserOutlined style={{ fontSize: '18px' }} />
                Team Members ({teamData.members.length + teamData.pendingInvitations.length})
              </Space>
            </Title>
          </div>
          <List
            dataSource={getCombinedMembersList()}
            renderItem={(item, index) => {
              if (item.type === 'invitation') {
                return (
                  <List.Item
                    style={{ 
                      opacity: 0.8,
                      background: 'rgba(24, 144, 255, 0.05)',
                      padding: '20px',
                      marginBottom: '12px',
                      borderRadius: '16px',
                      border: '1px solid rgba(24, 144, 255, 0.1)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<MailOutlined />}
                          size={48}
                          style={{ backgroundColor: '#1890ff' }}
                        />
                      }
                      title={
                        <Space>
                          {item.email}
                          <Tag color="blue">Invitation Sent</Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            Invited: {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            Expires: {new Date(item.expiresAt).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: 12, color: '#fa8c16' }}>
                            ⏳ Waiting for user to accept invitation
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )
              }
              
              // Render regular member
              const member = item as TeamMember & { type: 'member' }
              const memberIndex = teamData.members.findIndex(m => m.id === member.id)
              const isAdmin = memberIndex === 0
              return (
                <List.Item
                  actions={[getActionButtons(member, memberIndex)]}
                  style={{ 
                    opacity: member.isActive ? 1 : 0.7,
                    background: isAdmin 
                      ? 'rgba(82, 196, 26, 0.05)' 
                      : 'rgba(255, 255, 255, 0.5)',
                    padding: '20px',
                    marginBottom: '12px',
                    borderRadius: '16px',
                    border: isAdmin 
                      ? '1px solid rgba(82, 196, 26, 0.2)' 
                      : '1px solid rgba(102, 126, 234, 0.1)',
                    transition: 'all 0.3s ease',
                    boxShadow: isAdmin 
                      ? '0 4px 12px rgba(82, 196, 26, 0.1)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={member.profileImage32} 
                        icon={<UserOutlined />}
                        size={48}
                      />
                    }
                    title={
                      <Space>
                        {member.displayName || member.realName || member.name || 'Unknown User'}
                        {isAdmin && (
                          <Tooltip title="Team Admin (first member)">
                            <CrownOutlined style={{ color: '#faad14' }} />
                          </Tooltip>
                        )}
                        {getStatusTag(member, memberIndex)}
                      </Space>
                    }
                    description={
                      <div>
                        <div>@{member.name}</div>
                        {member.email && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{member.email}</div>}
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          Joined: {new Date(member.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )
            }}
          />
          
          <Divider style={{ margin: '24px 0' }} />
          
          <div style={{
            background: 'rgba(24, 144, 255, 0.05)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(24, 144, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                background: 'rgba(24, 144, 255, 0.1)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircleOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
              </div>
              <div>
                <div style={{ 
                  color: '#1890ff', 
                  fontWeight: 600, 
                  fontSize: '16px',
                  marginBottom: '8px'
                }}>
                  Member Management Info
                </div>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '20px',
                  color: '#666',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <li>First member (admin) cannot be disabled or removed</li>
                  <li>Members over the seat limit have restricted access to audio playback</li>
                  <li>Disabled members cannot play audio summaries but can see links</li>
                  <li>Removed members are permanently disabled and lose access</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Invite Member Modal */}
        <Modal
          title={
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 600,
              color: '#333'
            }}>
              Invite Team Member
            </div>
          }
          open={inviteModalVisible}
          onCancel={() => {
            setInviteModalVisible(false)
            inviteForm.resetFields()
          }}
          footer={null}
          width={480}
          styles={{
            content: {
              borderRadius: '20px',
              padding: '24px'
            },
            header: {
              borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
              paddingBottom: '16px'
            }
          }}
        >
          <Form
            form={inviteForm}
            layout="vertical"
            onFinish={handleInviteUser}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              label={
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: '#333'
                }}>
                  Email Address
                </span>
              }
              name="email"
              rules={[
                { required: true, message: 'Please enter an email address' },
                { type: 'email', message: 'Please enter a valid email address' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="colleague@company.com"
                size="large"
                style={{
                  borderRadius: '10px',
                  border: '1px solid rgba(102, 126, 234, 0.2)'
                }}
              />
            </Form.Item>

            <div style={{ 
              marginBottom: 16, 
              padding: 16, 
              background: 'rgba(24, 144, 255, 0.05)', 
              borderRadius: 12,
              border: '1px solid rgba(24, 144, 255, 0.1)'
            }}>
              <Text style={{ 
                color: '#666',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                An invitation email will be sent with a secure link that expires in 7 days. 
                The invitee will be able to join your team and access audio summaries.
              </Text>
            </div>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space size="middle">
                <Button 
                  onClick={() => {
                    setInviteModalVisible(false)
                    inviteForm.resetFields()
                  }}
                  style={{
                    height: '40px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: '2px solid rgba(102, 126, 234, 0.2)',
                    color: '#667eea'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={inviteLoading}
                  icon={<UserAddOutlined />}
                  style={{
                    height: '40px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {inviteLoading ? 'Sending Invitation...' : 'Send Invitation'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
      </Layout>
    </ProtectedRoute>
  )
}