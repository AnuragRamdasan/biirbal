'use client'

import { useState } from 'react'
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Typography, 
  Space, 
  Row, 
  Col,
  Alert,
  Divider
} from 'antd'
import {
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  MessageOutlined,
  BugOutlined,
  QuestionCircleOutlined,
  CreditCardOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export default function ContactPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    
    // Simulate form submission
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubmitted(true)
      form.resetFields()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout currentPage="contact" showHeader={true}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Title level={1}>Contact Us</Title>
          <Paragraph style={{ fontSize: 18, color: '#666', maxWidth: 600, margin: '0 auto' }}>
            Have questions about biirbal.ai? Need help with your Slack integration? 
            We're here to help you get the most out of your AI audio summaries.
          </Paragraph>
        </div>

        <Row gutter={[48, 48]}>
          {/* Contact Form */}
          <Col xs={24} lg={14}>
            <Card>
              <Title level={3} style={{ marginBottom: 24 }}>
                <MessageOutlined /> Send us a message
              </Title>

              {submitted && (
                <Alert
                  message="Message sent successfully!"
                  description="We'll get back to you within 24 hours."
                  type="success"
                  showIcon
                  style={{ marginBottom: 24 }}
                />
              )}

              <Form
                form={form}
                onFinish={handleSubmit}
                layout="vertical"
                size="large"
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="name"
                      label="Full Name"
                      rules={[{ required: true, message: 'Please enter your name' }]}
                    >
                      <Input placeholder="Your full name" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label="Email Address"
                      rules={[
                        { required: true, message: 'Please enter your email' },
                        { type: 'email', message: 'Please enter a valid email' }
                      ]}
                    >
                      <Input placeholder="your@email.com" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="teamId"
                      label="Slack Team ID (Optional)"
                    >
                      <Input placeholder="T1234567890" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="subject"
                      label="Subject"
                      rules={[{ required: true, message: 'Please select a subject' }]}
                    >
                      <Select placeholder="Select a topic">
                        <Select.Option value="general">General Question</Select.Option>
                        <Select.Option value="technical">Technical Support</Select.Option>
                        <Select.Option value="billing">Billing & Subscriptions</Select.Option>
                        <Select.Option value="bug">Bug Report</Select.Option>
                        <Select.Option value="feature">Feature Request</Select.Option>
                        <Select.Option value="privacy">Privacy & Data</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="message"
                  label="Message"
                  rules={[{ required: true, message: 'Please enter your message' }]}
                >
                  <TextArea 
                    rows={6} 
                    placeholder="Tell us how we can help you..."
                  />
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    Send Message
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Contact Information */}
          <Col xs={24} lg={10}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Quick Contact */}
              <Card>
                <Title level={4}>Quick Contact</Title>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong><MailOutlined /> Email Support</Text>
                    <br />
                    <Text copyable>founders@biirbal.com</Text>
                    <br />
                    <Text type="secondary">Response within 24 hours</Text>
                  </div>
                  
                  <Divider style={{ margin: '12px 0' }} />
                  
                  <div>
                    <Text strong><ClockCircleOutlined /> Support Hours</Text>
                    <br />
                    <Text>Monday - Friday: 9 AM - 6 PM PST</Text>
                    <br />
                    <Text type="secondary">Weekend: Emergency issues only</Text>
                  </div>
                </Space>
              </Card>

              {/* Specialized Support */}
              <Card>
                <Title level={4}>Specialized Support</Title>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <BugOutlined style={{ color: '#ff4d4f' }} />
                    <Text strong style={{ marginLeft: 8 }}>Technical Issues</Text>
                    <br />
                    <Text type="secondary" style={{ paddingLeft: 24 }}>
                      founders@biirbal.com
                    </Text>
                  </div>
                  
                  <div>
                    <CreditCardOutlined style={{ color: '#52c41a' }} />
                    <Text strong style={{ marginLeft: 8 }}>Billing Support</Text>
                    <br />
                    <Text type="secondary" style={{ paddingLeft: 24 }}>
                      founders@biirbal.com
                    </Text>
                  </div>
                  
                  <div>
                    <GlobalOutlined style={{ color: '#1890ff'}} />
                    <Text strong style={{ marginLeft: 8 }}>Privacy & Data</Text>
                    <br />
                    <Text type="secondary" style={{ paddingLeft: 24 }}>
                      founders@biirbal.com
                    </Text>
                  </div>
                </Space>
              </Card>

              {/* FAQ */}
              <Card>
                <Title level={4}>
                  <QuestionCircleOutlined /> Common Questions
                </Title>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <Text strong>How do I install biirbal.ai?</Text>
                    <br />
                    <Text type="secondary">
                      Click "Add to Slack" on our homepage and follow the OAuth flow.
                    </Text>
                  </div>
                  
                  <Divider style={{ margin: '8px 0' }} />
                  
                  <div>
                    <Text strong>Why isn't my link being processed?</Text>
                    <br />
                    <Text type="secondary">
                      Check if you've reached your monthly limit or if the URL is supported.
                    </Text>
                  </div>
                  
                  <Divider style={{ margin: '8px 0' }} />
                  
                  <div>
                    <Text strong>How do I upgrade my plan?</Text>
                    <br />
                    <Text type="secondary">
                      Visit our pricing page or contact founders@biirbal.com for assistance.
                    </Text>
                  </div>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
    </Layout>
  )
}