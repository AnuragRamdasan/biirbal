'use client'

import { Typography, Row, Col, Statistic } from 'antd'
import { ClockCircleOutlined, ReadOutlined, RocketOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export const ConversionStatsSection: React.FC = () => {
  const conversionStats = [
    { label: 'Hours Saved Weekly', number: 3, unit: '+', icon: <ClockCircleOutlined /> },
    { label: 'Article Completion Rate', number: 95, unit: '%', icon: <ReadOutlined /> },
    { label: 'Productivity Boost', number: 200, unit: '%', icon: <RocketOutlined /> }
  ]

  return (
    <div style={{ 
      padding: '80px 0', 
      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
      position: 'relative'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <Title level={2} style={{ 
            fontSize: '36px', 
            fontWeight: 700, 
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Transform Your Reading Habits
          </Title>
          <Paragraph style={{ fontSize: '18px', color: '#666', margin: 0 }}>
            See the impact of audio-first content consumption
          </Paragraph>
        </div>
        
        <Row gutter={[32, 32]} justify="center">
          {conversionStats.map((stat, index) => (
            <Col xs={24} sm={8} key={index}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                borderRadius: '20px',
                padding: '32px',
                textAlign: 'center',
                height: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{ fontSize: '24px', color: 'white' }}>
                    {stat.icon}
                  </div>
                </div>
                <Statistic
                  title={stat.label}
                  value={stat.number}
                  suffix={stat.unit}
                  valueStyle={{ 
                    fontSize: '32px', 
                    fontWeight: '700', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                />
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}