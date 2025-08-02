// Example: Migrated Profile Page using new BaseLayout system
'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/BaseLayout'
import { Card, Button, Badge } from '@/components/ui/DesignSystem'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

// Keep Ant Design for complex components
import { Row, Col, Avatar, Progress, Table, Switch, Space, Spin, Alert } from 'antd'
import { 
  UserOutlined, 
  TeamOutlined, 
  LogoutOutlined, 
  SettingOutlined,
  MessageOutlined,
  CrownOutlined 
} from '@ant-design/icons'

interface TeamData {
  team: {
    id: string
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
  } | null
  usage: {
    monthlyUsage: number
    totalListens: number
  }
  currentUser?: {
    id: string
    name: string
    profile?: {
      display_name?: string
      image_48?: string
      title?: string
    }
  }
}

const ProfilePageExample = () => {
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTeamData({
        team: {
          id: '1',
          teamName: 'Development Team',
          isActive: true,
          createdAt: '2024-01-01',
          totalLinks: 42,
          sendSummaryAsDM: false
        },
        subscription: {
          status: 'active',
          planId: 'pro',
          monthlyLinkLimit: 100
        },
        usage: {
          monthlyUsage: 23,
          totalListens: 156
        },
        currentUser: {
          id: '1',
          name: 'John Doe',
          profile: {
            display_name: 'John Doe',
            title: 'Product Manager'
          }
        }
      })
      setLoading(false)
    }, 1000)
  }, [])

  const handleLogout = () => {
    // Logout logic
    window.location.href = '/'
  }

  const handleDMPreferenceChange = (checked: boolean) => {
    setTeamData(prev => prev ? {
      ...prev,
      team: { ...prev.team, sendSummaryAsDM: checked }
    } : null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success'
      case 'trial': return 'info'
      default: return 'neutral'
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="profile">
        <div className="flex justify-center items-center min-h-96">
          <Spin size="large" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout currentPage="profile">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="max-w-2xl mx-auto"
        />
      </DashboardLayout>
    )
  }

  if (!teamData) return null

  const usagePercentage = teamData.subscription 
    ? Math.round((teamData.usage.monthlyUsage / teamData.subscription.monthlyLinkLimit) * 100)
    : 0

  return (
    <DashboardLayout currentPage="profile">
      {/* Header Card */}
      <Card variant="gradient" padding="lg" className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ background: designTokens.colors.brand.gradient.primary }}
            >
              <UserOutlined className="text-xl" />
            </div>
            <div>
              <h1 
                className="text-2xl font-bold mb-0"
                style={{ color: designTokens.colors.neutral[900] }}
              >
                Team Profile
              </h1>
              <p 
                className="text-base mb-0"
                style={{ color: designTokens.colors.neutral[600] }}
              >
                Manage your team settings and view statistics
              </p>
            </div>
          </div>
          <Button 
            variant="danger" 
            size="base"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </Card>

      <Row gutter={[24, 24]}>
        {/* User & Team Info */}
        <Col xs={24} md={12}>
          <Card variant="elevated" padding="lg" className="h-full">
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: designTokens.colors.neutral[900] }}
            >
              Current User & Team
            </h3>

            {teamData.currentUser && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar 
                    size={48} 
                    src={teamData.currentUser.profile?.image_48}
                    icon={<UserOutlined />}
                  />
                  <div>
                    <div 
                      className="font-semibold"
                      style={{ color: designTokens.colors.neutral[900] }}
                    >
                      {teamData.currentUser.profile?.display_name || teamData.currentUser.name}
                    </div>
                    {teamData.currentUser.profile?.title && (
                      <div 
                        className="text-sm"
                        style={{ color: designTokens.colors.neutral[600] }}
                      >
                        {teamData.currentUser.profile.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: designTokens.colors.neutral[600] }}
                >
                  Team
                </span>
                <div className="flex items-center space-x-2">
                  <span 
                    className="font-medium"
                    style={{ color: designTokens.colors.neutral[900] }}
                  >
                    {teamData.team.teamName}
                  </span>
                  <Badge 
                    variant={teamData.team.isActive ? 'success' : 'error'}
                    size="sm"
                  >
                    {teamData.team.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span 
                  className="text-sm font-medium"
                  style={{ color: designTokens.colors.neutral[600] }}
                >
                  Member Since
                </span>
                <span 
                  className="text-sm"
                  style={{ color: designTokens.colors.neutral[900] }}
                >
                  {formatDate(teamData.team.createdAt)}
                </span>
              </div>
            </div>
          </Card>
        </Col>

        {/* Subscription & Usage */}
        <Col xs={24} md={12}>
          <Card variant="elevated" padding="lg" className="h-full">
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: designTokens.colors.neutral[900] }}
            >
              Subscription & Usage
            </h3>

            {teamData.subscription && (
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <span 
                    className="text-xl font-bold"
                    style={{ 
                      color: teamData.subscription.planId === 'free' 
                        ? designTokens.colors.semantic.error[500] 
                        : designTokens.colors.brand.primary[600] 
                    }}
                  >
                    {teamData.subscription.planId.charAt(0).toUpperCase() + teamData.subscription.planId.slice(1)}
                  </span>
                  <Badge 
                    variant={getStatusBadgeVariant(teamData.subscription.status)}
                    size="sm"
                    dot
                  >
                    {teamData.subscription.status}
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: designTokens.colors.neutral[600] }}>
                      Monthly Usage
                    </span>
                    <span style={{ color: designTokens.colors.neutral[900] }}>
                      {teamData.usage.monthlyUsage}/{teamData.subscription.monthlyLinkLimit}
                    </span>
                  </div>
                  <Progress 
                    percent={usagePercentage} 
                    size="small"
                    status={usagePercentage > 90 ? 'exception' : usagePercentage > 70 ? 'active' : 'success'}
                    strokeColor={
                      usagePercentage > 90 
                        ? designTokens.colors.semantic.error[500]
                        : usagePercentage > 70 
                        ? designTokens.colors.semantic.warning[500]
                        : designTokens.colors.semantic.success[500]
                    }
                  />
                </div>
              </div>
            )}

            <Row gutter={16}>
              <Col span={12} className="text-center">
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{ color: designTokens.colors.brand.primary[600] }}
                >
                  {teamData.team.totalLinks}
                </div>
                <div 
                  className="text-xs font-medium"
                  style={{ color: designTokens.colors.neutral[600] }}
                >
                  Total Links
                </div>
              </Col>
              <Col span={12} className="text-center">
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{ color: designTokens.colors.semantic.success[500] }}
                >
                  {teamData.usage.totalListens}
                </div>
                <div 
                  className="text-xs font-medium"
                  style={{ color: designTokens.colors.neutral[600] }}
                >
                  Total Listens
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Team Settings */}
        <Col xs={24}>
          <Card variant="bordered" padding="lg">
            <h3 
              className="text-lg font-semibold mb-4 flex items-center"
              style={{ color: designTokens.colors.neutral[900] }}
            >
              <SettingOutlined className="mr-2" />
              Team Settings
            </h3>
            
            <div 
              className="p-4 rounded-xl border"
              style={{
                background: `${designTokens.colors.brand.primary[50]}`,
                borderColor: `${designTokens.colors.brand.primary[200]}`
              }}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <MessageOutlined 
                      style={{ color: designTokens.colors.brand.primary[600] }}
                    />
                    <span 
                      className="font-medium"
                      style={{ color: designTokens.colors.neutral[900] }}
                    >
                      Send Summaries as Direct Messages
                    </span>
                  </div>
                  <p 
                    className="text-sm ml-6 mb-0"
                    style={{ color: designTokens.colors.neutral[600] }}
                  >
                    When enabled, audio summary links will be sent as DMs instead of channel replies
                  </p>
                </div>
                <Switch
                  checked={teamData.team.sendSummaryAsDM}
                  onChange={handleDMPreferenceChange}
                  size="default"
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Upgrade Action */}
        <Col xs={24} className="text-center">
          <a href="/pricing" style={{ textDecoration: 'none' }}>
            <Button 
              variant="primary"
              size="lg"
              icon={<CrownOutlined />}
            >
              Upgrade Plan
            </Button>
          </a>
        </Col>
      </Row>
    </DashboardLayout>
  )
}

export default ProfilePageExample