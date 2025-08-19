'use client'

import { Typography, Space, Row, Col } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { ExtensionButton } from '@/components/ExtensionButton'

const { Title, Text } = Typography

export const ExtensionHeaderSection: React.FC = () => {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px 0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Row align="middle" gutter={[24, 16]}>
            <Col xs={24} lg={16}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <GlobalOutlined style={{ fontSize: 14, color: 'white' }} />
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>
                      NEW
                    </Text>
                  </div>
                  <Title level={3} style={{ 
                    margin: 0, 
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 600
                  }}>
                    Never Lose an Article Again
                  </Title>
                </div>
                
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  fontSize: 14,
                  display: 'block',
                  lineHeight: 1.5
                }}>
                  One-click save from any webpage → AI summary in your dashboard → Zero reading backlog
                </Text>
              </Space>
            </Col>
            
            <Col xs={24} lg={8} style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="small">
                <ExtensionButton 
                  style={{ 
                    background: 'white',
                    borderColor: 'white',
                    color: '#667eea',
                    fontWeight: 600,
                    height: 44,
                    padding: '0 24px',
                    borderRadius: 8,
                    width: '100%'
                  }}
                >
                  Install Free Extension
                </ExtensionButton>
              </Space>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  )
}