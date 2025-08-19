'use client'

import { Typography, Row, Col } from 'antd'
import { ExclamationCircleOutlined, ClockCircleOutlined, BulbOutlined, ReadOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

export const ProblemAgitationSection: React.FC = () => {
  const problems = [
    { icon: <ExclamationCircleOutlined />, text: 'Articles bookmarked but never read' },
    { icon: <ClockCircleOutlined />, text: 'Important insights missed while you\'re "too busy"' },
    { icon: <BulbOutlined />, text: 'Competitors stay ahead while your backlog grows' },
    { icon: <ReadOutlined />, text: 'Feeling overwhelmed by information overload' }
  ]

  return (
    <div style={{ 
      padding: '100px 0', 
      background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <Title level={2} style={{ 
            color: 'white',
            fontSize: '42px', 
            fontWeight: 700, 
            margin: '0 0 24px 0'
          }}>
            The Reading Backlog Crisis
          </Title>
          <Paragraph style={{ 
            fontSize: '20px', 
            color: 'rgba(255,255,255,0.9)', 
            margin: 0,
            lineHeight: 1.6
          }}>
            Sound familiar? You're not alone...
          </Paragraph>
        </div>

        <Row gutter={[32, 32]} justify="center">
          {problems.map((problem, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <div style={{
                textAlign: 'center',
                padding: '32px 16px'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                  fontSize: '32px',
                  boxShadow: '0 8px 24px rgba(255, 255, 255, 0.1)'
                }}>
                  {problem.icon}
                </div>
                <Text style={{ 
                  color: 'white', 
                  fontSize: '16px',
                  fontWeight: 500,
                  lineHeight: 1.4,
                  display: 'block'
                }}>
                  {problem.text}
                </Text>
              </div>
            </Col>
          ))}
        </Row>

        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <Title level={3} style={{ 
            color: 'white',
            fontSize: '24px', 
            fontWeight: 600, 
            margin: '0 0 16px 0'
          }}>
            There's a better way...
          </Title>
        </div>
      </div>
    </div>
  )
}