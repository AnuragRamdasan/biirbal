'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Form, Alert, Spin, Typography } from 'antd'
import { UserOutlined, MailOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

interface InvitationData {
  email: string
  teamName: string
  expiresAt: string
  invitedBy: string
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const [form] = Form.useForm()

  useEffect(() => {
    validateInvitation()
  }, [params.token])

  const validateInvitation = async () => {
    try {
      const response = await fetch(`/api/invite/accept?token=${params.token}`)
      const data = await response.json()

      if (response.ok) {
        setInvitation(data.invitation)
      } else {
        setError(data.error || 'Invalid invitation')
      }
    } catch (err) {
      setError('Failed to validate invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async (values: { name: string }) => {
    setAccepting(true)
    setError('')

    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: params.token,
          name: values.name
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Store user info in localStorage for authentication
        if (data.user) {
          localStorage.setItem('biirbal_user_id', data.user.id)
          localStorage.setItem('biirbal_user_email', data.user.email)
          localStorage.setItem('biirbal_team_name', data.user.teamName)
          localStorage.setItem('biirbal_slack_user', 'false') // Mark as non-Slack user
        }
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(data.redirectUrl || '/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ minWidth: 400, textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Validating invitation...</Text>
          </div>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ minWidth: 400, textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <Title level={3}>Invalid Invitation</Title>
            <Paragraph>
              {error}
            </Paragraph>
          </div>
          <Button 
            type="primary" 
            onClick={() => router.push('/')}
          >
            Go to Home
          </Button>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ minWidth: 400, textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Title level={3}>Welcome to the team!</Title>
            <Paragraph>
              You've successfully joined <strong>{invitation?.teamName}</strong> on Biirbal.
            </Paragraph>
            <Text type="secondary">Redirecting to dashboard...</Text>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 20
    }}>
      <Card style={{ minWidth: 400, maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎧</div>
          <Title level={2}>Join Team</Title>
          <Paragraph>
            You've been invited to join <strong>{invitation?.teamName}</strong> on Biirbal
          </Paragraph>
        </div>

        <div style={{ marginBottom: 24, padding: 16, background: '#f6f8fa', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <MailOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <Text strong>Email:</Text>
            <Text style={{ marginLeft: 8 }}>{invitation?.email}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <TeamOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <Text strong>Team:</Text>
            <Text style={{ marginLeft: 8 }}>{invitation?.teamName}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            <Text strong>Invited by:</Text>
            <Text style={{ marginLeft: 8 }}>{invitation?.invitedBy}</Text>
          </div>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleAcceptInvitation}
          initialValues={{ name: invitation?.email?.split('@')[0] || '' }}
        >
          <Form.Item
            label="Your Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter your name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Enter your full name"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={accepting}
              block
            >
              {accepting ? 'Joining Team...' : 'Accept Invitation'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This invitation expires on{' '}
            {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : 'N/A'}
          </Text>
        </div>
      </Card>
    </div>
  )
}