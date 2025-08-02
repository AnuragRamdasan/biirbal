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
  MailOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { useAnalytics } from '@/hooks/useAnalytics'
import { PRICING_PLANS } from '@/lib/stripe'

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
    fetchTeamData()
  }, [])

  const fetchTeamData = async () => {
    try {
      const userId = localStorage.getItem('biirbal_user_id')
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
      const currentUserId = localStorage.getItem('biirbal_user_id')
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
      const currentUserId = localStorage.getItem('biirbal_user_id')
      
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
    <Layout currentPage="team">
      <div style={{ padding: '16px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <Card style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <div>
                  <Title level={3} style={{ margin: 0 }}>
                    {teamData.teamInfo?.teamName || 'Team Management'}
                  </Title>
                  <Text type="secondary">Manage team members and access</Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  type="default" 
                  icon={<UserAddOutlined />}
                  onClick={() => setInviteModalVisible(true)}
                >
                  Invite Member
                </Button>
                <Button 
                  type="primary" 
                  icon={<SettingOutlined />}
                  href="/pricing"
                >
                  Upgrade Plan
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Current Plan */}
        <Card title="Current Plan" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12}>
              {(() => {
                const currentPlan = Object.values(PRICING_PLANS).find(p => p.id === teamData.subscription.planId) || PRICING_PLANS.FREE
                return (
                  <Space direction="vertical" size="small">
                    <div>
                      <Text strong style={{ fontSize: 18, color: currentPlan.id === 'free' ? '#ff4d4f' : '#1890ff' }}>
                        {currentPlan.name}
                      </Text>
                      {currentPlan.id !== 'free' && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>Active</Tag>
                      )}
                    </div>
                    <Text type="secondary">
                      {currentPlan.id === 'free' 
                        ? '20 links/month • 1 user' 
                        : `Unlimited links • ${currentPlan.userLimit === -1 ? 'Unlimited' : currentPlan.userLimit} users`
                      }
                    </Text>
                    {currentPlan.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
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
                  <Button type="primary" href="/pricing">
                    Upgrade Plan
                  </Button>
                ) : (
                  <Button href="/pricing">
                    Change Plan
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Seat Usage */}
        <Card title="Seat Usage" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {activeMembers}
                </div>
                <Text type="secondary">Active Members</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {teamData.subscription.userLimit === -1 ? '∞' : teamData.subscription.userLimit}
                </div>
                <Text type="secondary">Seat Limit</Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center' }}>
                <Progress 
                  type="circle" 
                  percent={seatUsagePercentage}
                  size={60}
                  status={teamData.subscription.userLimitExceeded ? 'exception' : 'normal'}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Usage</Text>
                </div>
              </div>
            </Col>
          </Row>
          
          {teamData.subscription.userLimitExceeded && (
            <Alert
              style={{ marginTop: 16 }}
              message="Seat limit exceeded"
              description="Some members may have restricted access. Consider upgrading your plan or disabling inactive members."
              type="warning"
              showIcon
              action={
                <Button size="small" href="/pricing">
                  Upgrade
                </Button>
              }
            />
          )}
        </Card>

        {/* Member List */}
        <Card 
          title={
            <Space>
              <UserOutlined />
              Team Members ({teamData.members.length + teamData.pendingInvitations.length})
            </Space>
          }
        >
          <List
            dataSource={getCombinedMembersList()}
            renderItem={(item, index) => {
              if (item.type === 'invitation') {
                return (
                  <List.Item
                    style={{ 
                      opacity: 0.7,
                      backgroundColor: '#fafafa',
                      padding: '16px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      border: '1px solid #e6f7ff'
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
                    opacity: member.isActive ? 1 : 0.6,
                    backgroundColor: isAdmin ? '#f6ffed' : 'transparent',
                    padding: '16px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    border: isAdmin ? '1px solid #b7eb8f' : '1px solid #f0f0f0'
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
          
          <Divider />
          
          <Alert
            message="Member Management Info"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 16 }}>
                <li>First member (admin) cannot be disabled or removed</li>
                <li>Members over the seat limit have restricted access to audio playback</li>
                <li>Disabled members cannot play audio summaries but can see links</li>
                <li>Removed members are permanently disabled and lose access</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </Card>

        {/* Invite Member Modal */}
        <Modal
          title="Invite Team Member"
          open={inviteModalVisible}
          onCancel={() => {
            setInviteModalVisible(false)
            inviteForm.resetFields()
          }}
          footer={null}
          width={480}
        >
          <Form
            form={inviteForm}
            layout="vertical"
            onFinish={handleInviteUser}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              label="Email Address"
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
              />
            </Form.Item>

            <div style={{ marginBottom: 16, padding: 12, background: '#f6f8fa', borderRadius: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                An invitation email will be sent with a secure link that expires in 7 days. 
                The invitee will be able to join your team and access audio summaries.
              </Text>
            </div>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button 
                  onClick={() => {
                    setInviteModalVisible(false)
                    inviteForm.resetFields()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={inviteLoading}
                  icon={<UserAddOutlined />}
                >
                  {inviteLoading ? 'Sending Invitation...' : 'Send Invitation'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Layout>
  )
}