'use client'

import { Alert, Button, Space, Typography, Row, Col } from 'antd'
import { SafetyCertificateOutlined, CheckCircleOutlined, ClockCircleOutlined, RocketOutlined, SoundOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

interface HeroSectionProps {
  webInstallUrl: string
  error?: string
  installed?: boolean
}

export const HeroSection: React.FC<HeroSectionProps> = ({ webInstallUrl, error, installed }) => {
  return (
    <>
      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '80px 0 100px 0',
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
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <Row justify="center" align="middle" gutter={[64, 48]}>
            <Col xs={24} lg={14}>
              <div style={{ textAlign: 'left' }}>
                {/* Launch Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                  color: 'white',
                  borderRadius: '50px',
                  padding: '8px 16px',
                  marginBottom: '24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                }}>
                  <span style={{ marginRight: '8px' }}>🚀</span>
                  Now available - Transform your reading backlog
                </div>

                {/* Main Headline - PAIN-FOCUSED */}
                <Title level={1} style={{ 
                  color: 'white', 
                  fontWeight: 700, 
                  margin: '0 0 24px 0', 
                  fontSize: '52px',
                  lineHeight: '1.1',
                  letterSpacing: '-0.02em'
                }}>
                  Stop Losing Important Articles
                  <br />
                  <span style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    in Browser Tabs Forever
                  </span>
                </Title>
                
                {/* Problem-Focused Subheadline */}
                <Title level={3} style={{ 
                  color: 'rgba(255,255,255,0.95)', 
                  fontWeight: 500, 
                  margin: '0 0 32px 0',
                  fontSize: '22px',
                  lineHeight: '1.4'
                }}>
                  You bookmark 50+ articles weekly.{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700
                  }}>
                    How many actually get read?
                  </span>
                </Title>
                
                {/* Solution-Oriented Description */}
                <Paragraph style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '19px', 
                  lineHeight: '1.6', 
                  margin: '0 0 32px 0',
                  maxWidth: '600px',
                  fontWeight: 400
                }}>
                  Our browser extension turns every saved article into a{' '}
                  <span style={{
                    color: '#52c41a',
                    fontWeight: '700',
                    background: 'rgba(82, 196, 26, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    59-second audio summary
                  </span>
                  {' '}so you actually consume what you save.
                </Paragraph>

                {/* Benefits List */}
                <div style={{ margin: '0 0 40px 0' }}>
                  {[
                    'Zero reading backlog',
                    'Stay informed automatically',
                    'Save 3+ hours weekly',
                    'Never miss important insights'
                  ].map((benefit, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(82, 196, 26, 0.3)'
                      }}>
                        <CheckCircleOutlined style={{ fontSize: '12px', color: 'white' }} />
                      </div>
                      <Text style={{ 
                        color: 'rgba(255,255,255,0.9)', 
                        fontSize: '16px',
                        fontWeight: 500
                      }}>
                        {benefit}
                      </Text>
                    </div>
                  ))}
                </div>

                {/* Error/Success Alerts */}
                {error && (
                  <Alert
                    message="Installation Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {installed && (
                  <Alert
                    message="Installation Successful!"
                    description="Welcome to Biirbal! Your dashboard is loading..."
                    type="success"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {/* CTA Buttons */}
                <Space size="large" style={{ marginBottom: '32px' }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<SafetyCertificateOutlined />}
                    href={webInstallUrl}
                    style={{ 
                      background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
                      border: 'none',
                      height: '64px',
                      fontSize: '18px',
                      fontWeight: 700,
                      padding: '0 48px',
                      borderRadius: '12px',
                      boxShadow: '0 12px 48px rgba(255, 77, 79, 0.4)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 16px 56px rgba(255, 77, 79, 0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)'
                      e.currentTarget.style.boxShadow = '0 12px 48px rgba(255, 77, 79, 0.4)'
                    }}
                  >
                    Stop Missing Content → Install Free
                  </Button>
                  
                  <Button 
                    size="large" 
                    ghost
                    href="#demo"
                    style={{ 
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      color: 'white',
                      height: '64px',
                      fontSize: '16px',
                      fontWeight: 600,
                      padding: '0 32px',
                      borderRadius: '12px',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                    }}
                  >
                    See 59-Second Demo
                  </Button>
                </Space>

                {/* Feature Highlights */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  marginBottom: '32px',
                  maxWidth: '500px'
                }}>
                  <Text style={{ 
                    color: 'rgba(255,255,255,0.9)', 
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'block',
                    textAlign: 'center'
                  }}>
                    ⚡ <strong>Free tier available</strong> • <strong>60-second</strong> setup • Works with <strong>major websites</strong>
                  </Text>
                </div>

                {/* Simple Trust Indicators */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '32px', 
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
                    }}>
                      <SafetyCertificateOutlined style={{ fontSize: '16px', color: 'white' }} />
                    </div>
                    <div>
                      <Text style={{ color: 'white', fontSize: '16px', fontWeight: 600, display: 'block' }}>
                        Privacy First
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                        Your data stays private
                      </Text>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                    }}>
                      <ClockCircleOutlined style={{ fontSize: '16px', color: 'white' }} />
                    </div>
                    <div>
                      <Text style={{ color: 'white', fontSize: '16px', fontWeight: 600, display: 'block' }}>
                        Quick Setup
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                        Install in minutes
                      </Text>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(114, 46, 209, 0.3)'
                    }}>
                      <RocketOutlined style={{ fontSize: '16px', color: 'white' }} />
                    </div>
                    <div>
                      <Text style={{ color: 'white', fontSize: '16px', fontWeight: 600, display: 'block' }}>
                        Browser Extension
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                        Chrome & Firefox
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            
            <Col xs={24} lg={10}>
              <div style={{ 
                textAlign: 'center',
                position: 'relative'
              }}>
                {/* Floating Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '24px',
                  padding: '32px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                  transform: 'rotate(-2deg)',
                  animation: 'float 6s ease-in-out infinite'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    borderRadius: '50%',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto',
                    boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
                  }}>
                    <SoundOutlined style={{ fontSize: '36px', color: 'white' }} />
                  </div>
                  <Title level={4} style={{ color: 'white', margin: '0 0 8px 0', fontWeight: 600 }}>
                    59-Second Summaries
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                    Perfect length for quick consumption
                  </Text>
                </div>
                
                {/* Floating Elements */}
                <div style={{
                  position: 'absolute',
                  top: '20%',
                  right: '10%',
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  animation: 'float 4s ease-in-out infinite reverse'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '20%',
                  left: '10%',
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  animation: 'float 5s ease-in-out infinite'
                }} />
              </div>
            </Col>
          </Row>
        </div>
        
        {/* CSS Animation */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(-2deg); }
            50% { transform: translateY(-20px) rotate(-1deg); }
          }
        `}</style>
      </div>
    </>
  )
}