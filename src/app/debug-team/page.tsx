'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Typography, Space, Alert, Descriptions } from 'antd'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const { Title, Text, Paragraph } = Typography

export default function DebugTeamPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem('biirbal_user_id')
    setUserId(storedUserId)
    
    if (storedUserId) {
      checkUserTeam(storedUserId)
    }
  }, [])

  const checkUserTeam = async (userIdToCheck: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/debug/teams?userId=${userIdToCheck}`)
      const data = await response.json()
      setTeamData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data')
    } finally {
      setLoading(false)
    }
  }

  const listAllTeams = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/debug/teams')
      const data = await response.json()
      setTeamData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <Layout currentPage="debug">
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={2}>Team Debug Information</Title>
        <Paragraph>
          This page helps debug team-related issues with Stripe checkout.
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* User ID from localStorage */}
          <Card>
            <Title level={4}>User ID from localStorage</Title>
            {userId ? (
              <Alert
                type="info"
                message={`User ID: ${userId}`}
                description="This is the user ID stored in your browser's localStorage"
              />
            ) : (
              <Alert
                type="warning"
                message="No user ID found in localStorage"
                description="You may need to log in first"
              />
            )}
          </Card>

          {/* Team lookup results */}
          {teamData && (
            <Card>
              <Title level={4}>Team Lookup Results</Title>
              {teamData.found === false ? (
                <Alert
                  type="error"
                  message="Team Not Found"
                  description={`No team found for user ID: ${teamData.userId}`}
                />
              ) : teamData.team ? (
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Team ID">{teamData.team.id}</Descriptions.Item>
                  <Descriptions.Item label="Slack Team ID">{teamData.team.slackTeamId}</Descriptions.Item>
                  <Descriptions.Item label="Team Name">{teamData.team.teamName || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Active">{teamData.team.isActive ? 'Yes' : 'No'}</Descriptions.Item>
                  <Descriptions.Item label="Users">{teamData.team.userCount}</Descriptions.Item>
                  <Descriptions.Item label="Links Processed">{teamData.team.linkCount}</Descriptions.Item>
                  {teamData.team.subscription && (
                    <>
                      <Descriptions.Item label="Plan">{teamData.team.subscription.planId}</Descriptions.Item>
                      <Descriptions.Item label="Status">{teamData.team.subscription.status}</Descriptions.Item>
                      <Descriptions.Item label="Monthly Limit">{teamData.team.subscription.monthlyLinkLimit}</Descriptions.Item>
                    </>
                  )}
                </Descriptions>
              ) : teamData.totalTeams !== undefined ? (
                <div>
                  <Title level={5}>All Teams ({teamData.totalTeams} total)</Title>
                  {teamData.teams.map((team: any) => (
                    <Card key={team.id} size="small" style={{ marginBottom: 8 }}>
                      <Text strong>{team.teamName || 'Unnamed Team'}</Text>
                      <br />
                      <Text type="secondary">ID: {team.id}</Text>
                      <br />
                      <Text type="secondary">Slack ID: {team.slackTeamId}</Text>
                      {team.subscription && (
                        <>
                          <br />
                          <Text type="secondary">Plan: {team.subscription.planId}</Text>
                        </>
                      )}
                    </Card>
                  ))}
                </div>
              ) : null}
            </Card>
          )}

          {error && (
            <Alert
              type="error"
              message="Error"
              description={error}
            />
          )}

          {/* Action buttons */}
          <Card>
            <Title level={4}>Actions</Title>
            <Space>
              {userId && (
                <Button 
                  type="primary" 
                  onClick={() => checkUserTeam(userId)}
                  loading={loading}
                >
                  Check My Team
                </Button>
              )}
              <Button 
                onClick={listAllTeams}
                loading={loading}
              >
                List All Teams
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
              >
                Back to Home
              </Button>
            </Space>
          </Card>
        </Space>
      </div>
      </Layout>
    </ProtectedRoute>
  )
}