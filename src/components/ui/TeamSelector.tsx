'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Select, Avatar, Space, Typography, Tooltip } from 'antd'
import { TeamOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons'

const { Text } = Typography

interface TeamSelectorProps {
  onTeamChange?: (teamId: string) => void
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  onTeamChange,
  disabled = false,
  style,
  className
}) => {
  const { data: session, update } = useSession()
  const [currentTeamId, setCurrentTeamId] = useState<string | undefined>(
    session?.user?.currentTeam?.id
  )

  if (!session?.user?.teams || session.user.teams.length <= 1) {
    // If user has no teams or only one team, don't show selector
    return null
  }

  const handleTeamChange = async (teamId: string) => {
    setCurrentTeamId(teamId)
    
    // Find the selected team
    const selectedTeam = session.user.teams?.find(team => team.id === teamId)
    
    if (selectedTeam && onTeamChange) {
      onTeamChange(teamId)
    }

    // Optionally update the session to reflect the team change
    // This would require implementing team switching in the session callback
    // For now, we'll just call the callback
  }

  const renderTeamOption = (team: any) => (
    <Space>
      <Avatar 
        size="small"
        icon={team.isSlackTeam ? <TeamOutlined /> : <UserOutlined />}
        style={{
          backgroundColor: team.isSlackTeam ? '#4A154B' : '#1890ff'
        }}
      />
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          {team.name}
          {team.role === 'admin' && (
            <Tooltip title="Admin">
              <CrownOutlined style={{ marginLeft: 6, color: '#faad14' }} />
            </Tooltip>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {team.isSlackTeam ? 'Slack Team' : 'Personal Team'}
          {team.subscription && ` • ${team.subscription.planId || 'Free'} Plan`}
        </div>
      </div>
    </Space>
  )

  return (
    <div style={style} className={className}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Text strong style={{ fontSize: '14px', color: '#666' }}>
          Active Team
        </Text>
        <Select
          value={currentTeamId}
          onChange={handleTeamChange}
          disabled={disabled}
          style={{ width: '100%', minWidth: 280 }}
          size="large"
          placeholder="Select team"
          optionLabelProp="label"
        >
          {session.user.teams.map(team => (
            <Select.Option 
              key={team.id} 
              value={team.id}
              label={
                <Space>
                  <Avatar 
                    size="small"
                    icon={team.isSlackTeam ? <TeamOutlined /> : <UserOutlined />}
                    style={{
                      backgroundColor: team.isSlackTeam ? '#4A154B' : '#1890ff'
                    }}
                  />
                  {team.name}
                </Space>
              }
            >
              {renderTeamOption(team)}
            </Select.Option>
          ))}
        </Select>
      </Space>
    </div>
  )
}

export default TeamSelector