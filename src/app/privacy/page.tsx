'use client'

import { Typography, Card, Row, Col, Space, Divider } from 'antd'
import {
  SecurityScanOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  MailOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { Layout } from '@/components/layout/Layout'

const { Title, Text, Paragraph } = Typography

export default function PrivacyPage() {
  return (
    <Layout currentPage="privacy" showHeader={true}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Title level={1}>
            <SecurityScanOutlined /> Privacy Policy
          </Title>
          <Paragraph style={{ fontSize: 18, color: '#666', maxWidth: 800, margin: '0 auto' }}>
            This Privacy Policy describes how biirbal.com collects, uses, and protects your information 
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
          <Col xs={24}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              
              {/* Overview */}
              <Card>
                <Title level={2}>
                  <GlobalOutlined /> Overview
                </Title>
                <Paragraph>
                  biirbal.com is a Slack application that automatically generates 59-second audio summaries 
                  of links shared in your Slack channels. We are committed to protecting your privacy and 
                  being transparent about our data practices.
                </Paragraph>
                <Paragraph>
                  By installing and using biirbal.com, you consent to the collection and use of information 
                  as described in this privacy policy.
                </Paragraph>
              </Card>

              {/* Data Collection */}
              <Card>
                <Title level={2}>
                  <DatabaseOutlined /> Data We Collect
                </Title>
                
                <Title level={4}>Slack Workspace Data</Title>
                <ul>
                  <li>Team ID, team name, access tokens</li>
                  <li>User IDs, display names, email addresses, profile images</li>
                  <li>Channel IDs, channel names</li>
                  <li>Message timestamps of shared links</li>
                </ul>
                <Text type="secondary">Retention: While app is installed; deleted within 30 days of uninstallation</Text>

                <Divider />

                <Title level={4}>Link Processing Data</Title>
                <ul>
                  <li>URLs shared in Slack channels</li>
                  <li>Extracted content titles and text summaries</li>
                  <li>Generated audio file metadata and URLs</li>
                  <li>Processing status and error logs</li>
                </ul>
                <Text type="secondary">Retention: Metadata 2 years; Audio files 1 year; Failed records 90 days</Text>

                <Divider />

                <Title level={4}>Usage Analytics</Title>
                <ul>
                  <li>Link processing timestamps and durations</li>
                  <li>Audio playback events and completion rates</li>
                  <li>Dashboard visit patterns</li>
                  <li>Feature usage statistics</li>
                </ul>
                <Text type="secondary">Retention: 2 years from collection date</Text>

                <Divider />

                <Title level={4}>Subscription Data</Title>
                <ul>
                  <li>Stripe customer IDs and subscription IDs</li>
                  <li>Payment status and billing cycles</li>
                  <li>Usage limits and current consumption</li>
                </ul>
                <Text type="secondary">Retention: 7 years (financial records)</Text>
              </Card>

              {/* Data Usage */}
              <Card>
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
                  <li><strong>Customer Support:</strong> Provide technical assistance when needed</li>
                </ul>
              </Card>

              {/* Data Storage */}
              <Card>
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
              <Card>
                <Title level={2}>
                  <ClockCircleOutlined /> Data Retention Schedule
                </Title>
                
                <ul>
                  <li><strong>Immediate Deletion:</strong> Access tokens, session data (upon app uninstallation)</li>
                  <li><strong>30 Days:</strong> Team/user profile data (after uninstallation), error logs</li>
                  <li><strong>90 Days:</strong> Failed processing records, temporary job data</li>
                  <li><strong>1 Year:</strong> Audio files in AWS S3, detailed usage logs</li>
                  <li><strong>2 Years:</strong> Link metadata and summaries, aggregated analytics</li>
                  <li><strong>7 Years:</strong> Financial records, tax documentation (legal requirement)</li>
                </ul>
              </Card>

              {/* Third Parties */}
              <Card>
                <Title level={2}>Third-Party Services</Title>
                
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
                </ul>

                <Title level={4}>Google Analytics</Title>
                <ul>
                  <li><strong>Data Shared:</strong> Anonymized usage statistics</li>
                  <li><strong>Purpose:</strong> Product analytics and improvement</li>
                  <li><strong>Retention:</strong> 26 months (GA4 default)</li>
                </ul>
              </Card>

              {/* User Rights */}
              <Card>
                <Title level={2}>Your Rights and Choices</Title>
                
                <Title level={4}>Access and Portability</Title>
                <Paragraph>
                  You can request access to your personal data and receive it in a machine-readable format.
                </Paragraph>

                <Title level={4}>Data Deletion</Title>
                <Paragraph>
                  You can request deletion of your personal data. Uninstalling the app from your Slack workspace 
                  will trigger automatic deletion of most data within 30 days.
                </Paragraph>

                <Title level={4}>How to Exercise Your Rights</Title>
                <Paragraph>
                  Contact us at <Text copyable>founders@biirbal.com</Text> with your request. 
                  We'll respond within 30 days.
                </Paragraph>
              </Card>

              {/* Security */}
              <Card>
                <Title level={2}>
                  <SecurityScanOutlined /> Security Measures
                </Title>
                
                <ul>
                  <li><strong>Encryption:</strong> All data encrypted in transit (HTTPS/TLS) and at rest</li>
                  <li><strong>Access Controls:</strong> Role-based access with principle of least privilege</li>
                  <li><strong>Authentication:</strong> Multi-factor authentication for administrative access</li>
                  <li><strong>Monitoring:</strong> Continuous security monitoring and alerting</li>
                  <li><strong>Backups:</strong> Automated daily backups with encryption</li>
                </ul>
              </Card>

              {/* Contact */}
              <Card>
                <Title level={2}>
                  <MailOutlined /> Contact Us
                </Title>
                
                <Paragraph>
                  If you have questions about this Privacy Policy or our data practices, please contact us at:
                </Paragraph>

                <Paragraph>
                  <Text strong>Email:</Text> <Text copyable>founders@biirbal.com</Text>
                </Paragraph>

                <Title level={4}>Changes to This Policy</Title>
                <Paragraph>
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  material changes by posting the new policy on this page and updating the 
                  "Last Updated" date.
                </Paragraph>

                <div style={{ 
                  background: '#f6f8fa', 
                  padding: 16, 
                  borderRadius: 8, 
                  marginTop: 24,
                  textAlign: 'center'
                }}>
                  <Text type="secondary">
                    For our Terms of Service, please visit <a href="/terms">biirbal.com/terms</a>
                  </Text>
                </div>
              </Card>

            </Space>
          </Col>
        </Row>
      </div>
    </Layout>
  )
}