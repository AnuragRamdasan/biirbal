'use client'

import { Typography, Row, Col } from 'antd'
import { RocketOutlined, ClockCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

export const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: 'Stop Reading, Start Learning',
      description: 'Transform any article into a 59-second audio summary automatically. Absorb key insights while multitasking or commuting.',
      stats: 'Save 3+ hours weekly',
      color: '#1890ff'
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: 'Kill Your Reading Backlog',
      description: 'Turn your overwhelming reading list into manageable audio summaries. Finally catch up on industry news and research.',
      stats: 'Process 10x more content',
      color: '#52c41a'
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: 'Stay Ahead Without Burnout',
      description: 'Keep yourself informed and competitive without the stress of endless articles. Knowledge becomes accessible instantly.',
      stats: 'Zero information anxiety',
      color: '#722ed1'
    }
  ]

  return (
    <div style={{ 
      padding: '100px 0', 
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      position: 'relative'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.03) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <Title level={2} style={{ 
            fontSize: '36px', 
            fontWeight: 700, 
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Transform How You Consume Information
          </Title>
          <Paragraph style={{ fontSize: '18px', color: '#666', margin: 0 }}>
            Stop drowning in articles. Start listening to insights.
          </Paragraph>
        </div>

        <Row gutter={[32, 32]}>
          {benefits.map((benefit, index) => (
            <Col xs={24} lg={8} key={index}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${benefit.color}20`,
                borderRadius: '24px',
                padding: '40px 32px',
                textAlign: 'center',
                height: '100%',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
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
                  background: `linear-gradient(135deg, ${benefit.color} 0%, ${benefit.color}80 100%)`
                }} />
                
                <div style={{ 
                  background: `${benefit.color}15`, 
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                  boxShadow: `0 8px 24px ${benefit.color}30`
                }}>
                  {benefit.icon}
                </div>
                <Title level={3} style={{ 
                  color: benefit.color, 
                  margin: '0 0 16px 0',
                  fontSize: '24px',
                  fontWeight: 600
                }}>
                  {benefit.title}
                </Title>
                <Paragraph style={{ 
                  fontSize: '16px', 
                  lineHeight: '1.6',
                  color: '#666',
                  margin: '0 0 24px 0'
                }}>
                  {benefit.description}
                </Paragraph>
                <div style={{
                  background: `linear-gradient(135deg, ${benefit.color} 0%, ${benefit.color}80 100%)`,
                  borderRadius: '50px',
                  padding: '8px 16px',
                  display: 'inline-block'
                }}>
                  <Text style={{ 
                    color: 'white', 
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {benefit.stats}
                  </Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}