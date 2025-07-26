'use client'

import { Typography, Card, Anchor, Row, Col, Timeline, Table } from 'antd'
import {
  ShieldCheckOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  MailOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'

const { Title, Text, Paragraph } = Typography

export default function PrivacyPage() {
  const dataTypes = [
    {
      key: '1',
      category: 'Slack Workspace Data',
      data: 'Team ID, team name, access tokens, user IDs, display names, email addresses, profile images, channel IDs, channel names, message timestamps',
      retention: 'While app is installed; deleted within 30 days of uninstallation',
      purpose: 'OAuth authentication, user identification, channel management'
    },
    {
      key: '2',
      category: 'Link Processing Data',
      data: 'URLs, extracted content titles and text summaries, generated audio files, processing status, OpenGraph images',
      retention: 'Metadata: 2 years; Audio files: 1 year; Failed records: 90 days',
      purpose: 'Core functionality - generating audio summaries'
    },
    {
      key: '3',
      category: 'Usage Analytics',
      data: 'Link processing timestamps, audio playback events, dashboard visits, feature usage statistics',
      retention: '2 years from collection date',
      purpose: 'Product improvement, usage monitoring'
    },
    {
      key: '4',
      category: 'Subscription Data',
      data: 'Stripe customer IDs, subscription IDs, payment status, usage limits, plan information',
      retention: '7 years (financial records)',
      purpose: 'Subscription management, billing, usage enforcement'
    }
  ]

  const columns = [
    {
      title: 'Data Category',
      dataIndex: 'category',
      key: 'category',
      width: '20%',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Data Collected',
      dataIndex: 'data',
      key: 'data',
      width: '35%'
    },
    {
      title: 'Retention Period',
      dataIndex: 'retention',
      key: 'retention',
      width: '25%'
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      width: '20%'
    }
  ]

  return (
    <Layout currentPage="privacy" showHeader={true}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Title level={1}>
            <ShieldCheckOutlined /> Privacy Policy
          </Title>
          <Paragraph style={{ fontSize: 18, color: '#666', maxWidth: 800, margin: '0 auto' }}>
            This Privacy Policy describes how biirbal.ai collects, uses, and protects your information 
            when you use our Slack application for AI-powered audio summaries.
          </Paragraph>
          <Text type="secondary">
            Last Updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </div>

        <Row gutter={[32, 32]}>
          {/* Table of Contents */}
          <Col xs={24} lg={6}>
            <Card size="small" style={{ position: 'sticky', top: 20 }}>
              <Title level={5}>Table of Contents</Title>
              <Anchor
                offsetTop={80}
                items={[
                  { key: 'overview', href: '#overview', title: 'Overview' },
                  { key: 'data-collection', href: '#data-collection', title: 'Data We Collect' },
                  { key: 'data-usage', href: '#data-usage', title: 'How We Use Data' },
                  { key: 'data-storage', href: '#data-storage', title: 'Data Storage' },
                  { key: 'data-retention', href: '#data-retention', title: 'Data Retention' },
                  { key: 'third-parties', href: '#third-parties', title: 'Third-Party Services' },
                  { key: 'user-rights', href: '#user-rights', title: 'Your Rights' },
                  { key: 'security', href: '#security', title: 'Security Measures' },
                  { key: 'contact', href: '#contact', title: 'Contact Us' }
                ]}
              />
            </Card>
          </Col>

          {/* Main Content */}
          <Col xs={24} lg={18}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              {/* Overview */}
              <Card id="overview">
                <Title level={2}>
                  <GlobalOutlined /> Overview
                </Title>
                <Paragraph>
                  biirbal.ai is a Slack application that automatically generates 59-second audio summaries 
                  of links shared in your Slack channels. We are committed to protecting your privacy and 
                  being transparent about our data practices.
                </Paragraph>
                <Paragraph>
                  By installing and using biirbal.ai, you consent to the collection and use of information 
                  as described in this privacy policy.
                </Paragraph>
              </Card>

              {/* Data Collection */}
              <Card id="data-collection">
                <Title level={2}>
                  <DatabaseOutlined /> Data We Collect
                </Title>
                <Paragraph>
                  We collect the following types of data to provide our core functionality:
                </Paragraph>
                
                <Table 
                  dataSource={dataTypes}
                  columns={columns}
                  pagination={false}
                  size="middle"
                  style={{ marginTop: 16 }}
                />
              </Card>

              {/* Data Usage */}
              <Card id="data-usage">
                <Title level={2}>How We Use Your Data</Title>
                
                <Title level={4}>Core Functionality</Title>
                <ul>
                  <li><strong>Link Processing:</strong> Extract content from shared URLs for summarization</li>
                  <li><strong>AI Summarization:</strong> Generate concise text summaries using OpenAI</li>
                  <li><strong>Audio Generation:</strong> Convert summaries to speech using text-to-speech technology</li>
                  <li><strong>Slack Integration:</strong> Post audio summaries back to your Slack channels</li>
                </ul>

                <Title level={4}>Service Operation</Title>
                <ul>
                  <li><strong>Authentication:</strong> Verify your identity and workspace permissions</li>
                  <li><strong>Usage Monitoring:</strong> Track usage against subscription limits</li>
                  <li><strong>Error Handling:</strong> Diagnose and fix processing issues</li>
                  <li><strong>Customer Support:</strong> Provide technical assistance when needed</li>
                </ul>

                <Title level={4}>Product Improvement</Title>
                <ul>
                  <li><strong>Analytics:</strong> Understand feature usage and performance</li>
                  <li><strong>Quality Assurance:</strong> Monitor processing accuracy and speed</li>
                  <li><strong>Feature Development:</strong> Identify opportunities for new capabilities</li>
                </ul>
              </Card>

              {/* Data Storage */}
              <Card id="data-storage">
                <Title level={2}>Data Storage and Security</Title>
                
                <Title level={4}>Storage Locations</Title>
                <ul>
                  <li><strong>Database:</strong> PostgreSQL on Heroku (encrypted at rest and in transit)</li>
                  <li><strong>Audio Files:</strong> Amazon S3 (server-side encryption, private buckets)</li>
                  <li><strong>Analytics:</strong> Google Analytics 4 (anonymized data)</li>
                  <li><strong>Payment Data:</strong> Stripe (PCI DSS compliant, we don't store card details)</li>
                </ul>

                <Title level={4}>Geographic Location</Title>
                <Paragraph>
                  Your data is primarily stored in US data centers (AWS US East, Heroku US). 
                  Some third-party services may store data globally according to their policies.
                </Paragraph>
              </Card>

              {/* Data Retention */}
              <Card id="data-retention">
                <Title level={2}>
                  <ClockCircleOutlined /> Data Retention
                </Title>
                
                <Timeline
                  items={[
                    {
                      color: 'red',
                      children: (
                        <div>
                          <Text strong>Immediate Deletion</Text>
                          <br />
                          <Text>Access tokens, session data (upon app uninstallation)</Text>
                        </div>
                      )
                    },
                    {
                      color: 'orange',
                      children: (
                        <div>
                          <Text strong>30 Days</Text>
                          <br />
                          <Text>Team/user profile data (after uninstallation), error logs</Text>
                        </div>
                      )
                    },
                    {
                      color: 'yellow',
                      children: (
                        <div>
                          <Text strong>90 Days</Text>
                          <br />
                          <Text>Failed processing records, temporary job data</Text>
                        </div>
                      )
                    },
                    {
                      color: 'blue',
                      children: (
                        <div>
                          <Text strong>1 Year</Text>
                          <br />
                          <Text>Audio files in AWS S3, detailed usage logs</Text>
                        </div>
                      )
                    },
                    {
                      color: 'green',
                      children: (
                        <div>
                          <Text strong>2 Years</Text>
                          <br />
                          <Text>Link metadata and summaries, aggregated analytics</Text>
                        </div>
                      )
                    },
                    {
                      color: 'purple',
                      children: (
                        <div>
                          <Text strong>7 Years</Text>
                          <br />
                          <Text>Financial records, tax documentation (legal requirement)</Text>
                        </div>
                      )
                    }
                  ]}
                />
              </Card>

              {/* Third Parties */}
              <Card id="third-parties">
                <Title level={2}>Third-Party Services</Title>
                
                <Paragraph>
                  We work with trusted third-party services to provide our functionality:
                </Paragraph>

                <Title level={4}>OpenAI</Title>
                <ul>
                  <li><strong>Data Shared:</strong> Content summaries for AI processing</li>
                  <li><strong>Purpose:</strong> Text summarization and text-to-speech conversion</li>
                  <li><strong>Retention:</strong> 30 days per OpenAI's policy, then automatically deleted</li>
                </ul>

                <Title level={4}>Amazon Web Services (AWS)</Title>
                <ul>
                  <li><strong>Data Shared:</strong> Generated audio files</li>
                  <li><strong>Purpose:</strong> Secure file storage and delivery</li>
                  <li><strong>Retention:</strong> 1 year, then automatic deletion</li>
                </ul>

                <Title level={4}>Stripe</Title>
                <ul>
                  <li><strong>Data Shared:</strong> Payment and subscription information</li>
                  <li><strong>Purpose:</strong> Payment processing and subscription management</li>
                  <li><strong>Retention:</strong> Per Stripe's retention policy</li>
                </ul>

                <Title level={4}>Google Analytics</Title>
                <ul>
                  <li><strong>Data Shared:</strong> Anonymized usage statistics</li>
                  <li><strong>Purpose:</strong> Product analytics and improvement</li>
                  <li><strong>Retention:</strong> 26 months (GA4 default)</li>
                </ul>
              </Card>

              {/* User Rights */}
              <Card id="user-rights">
                <Title level={2}>Your Rights and Choices</Title>
                
                <Title level={4}>Access and Portability</Title>
                <Paragraph>
                  You can request access to your personal data and receive it in a machine-readable format.
                </Paragraph>

                <Title level={4}>Data Correction</Title>
                <Paragraph>
                  You can request correction of inaccurate personal information we hold about you.
                </Paragraph>

                <Title level={4}>Data Deletion</Title>
                <Paragraph>
                  You can request deletion of your personal data. Note that some data may be retained 
                  for legal or legitimate business purposes.
                </Paragraph>

                <Title level={4}>App Uninstallation</Title>
                <Paragraph>
                  Uninstalling the app from your Slack workspace will trigger automatic deletion of 
                  most data within 30 days, except for financial records required for tax purposes.
                </Paragraph>

                <Title level={4}>How to Exercise Your Rights</Title>
                <Paragraph>
                  Contact us at <Text copyable>privacy@biirbal.ai</Text> with your request. 
                  We'll respond within 30 days.
                </Paragraph>
              </Card>

              {/* Security */}
              <Card id="security">
                <Title level={2}>
                  <ShieldCheckOutlined /> Security Measures
                </Title>
                
                <Title level={4}>Technical Safeguards</Title>
                <ul>
                  <li><strong>Encryption:</strong> All data encrypted in transit (HTTPS/TLS) and at rest</li>
                  <li><strong>Access Controls:</strong> Role-based access with principle of least privilege</li>
                  <li><strong>Authentication:</strong> Multi-factor authentication for administrative access</li>
                  <li><strong>Monitoring:</strong> Continuous security monitoring and alerting</li>
                </ul>

                <Title level={4}>Operational Safeguards</Title>
                <ul>
                  <li><strong>Regular Backups:</strong> Automated daily backups with encryption</li>
                  <li><strong>Incident Response:</strong> Documented procedures for security incidents</li>
                  <li><strong>Staff Training:</strong> Regular privacy and security training</li>
                  <li><strong>Vendor Management:</strong> Due diligence on all third-party processors</li>
                </ul>
              </Card>

              {/* Contact */}
              <Card id="contact">
                <Title level={2}>
                  <MailOutlined /> Contact Us
                </Title>
                
                <Paragraph>
                  If you have questions about this Privacy Policy or our data practices, please contact us:
                </Paragraph>

                <ul>
                  <li><strong>Privacy Questions:</strong> privacy@biirbal.ai</li>
                  <li><strong>Data Requests:</strong> privacy@biirbal.ai</li>
                  <li><strong>General Support:</strong> support@biirbal.ai</li>
                  <li><strong>Security Issues:</strong> security@biirbal.ai</li>
                </ul>

                <Title level={4}>Changes to This Policy</Title>
                <Paragraph>
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  material changes by posting the new policy on this page and updating the 
                  "Last Updated" date.
                </Paragraph>
              </Card>

            </div>
          </Col>

        </Row>
      </div>
    </Layout>
  )
}