'use client'

import { Typography, Card, Space, Divider } from 'antd'
import { 
  FileTextOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'

const { Title, Text, Paragraph } = Typography

export default function TermsPage() {
  const lastUpdated = "January 26, 2025"

  return (
    <Layout currentPage="terms" showHeader={true}>
      <div style={{ 
        minHeight: '100vh', 
        background: '#fafafa',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Card 
            style={{ 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              borderRadius: 12
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <FileTextOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <Title level={1} style={{ margin: 0 }}>Terms of Service</Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                Last updated: {lastUpdated}
              </Text>
            </div>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <section>
                <Title level={2}>1. Acceptance of Terms</Title>
                <Paragraph>
                  By accessing and using biirbal.ai ("Service"), you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>2. Description of Service</Title>
                <Paragraph>
                  biirbal.ai is a Slack application that automatically generates AI-powered audio summaries of 
                  links shared in your Slack channels. The service processes shared URLs and creates 59-second 
                  audio summaries to help teams stay informed efficiently.
                </Paragraph>
                <Paragraph>
                  Our service includes:
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>Automatic link processing and content extraction</li>
                  <li>AI-powered text summarization</li>
                  <li>Text-to-speech audio generation</li>
                  <li>Slack integration and notifications</li>
                  <li>Usage analytics and team management</li>
                </ul>
              </section>

              <Divider />

              <section>
                <Title level={2}>3. User Accounts and Registration</Title>
                <Paragraph>
                  To use our Service, you must:
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>Be at least 18 years old or have parental consent</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
                <Paragraph>
                  You may register through Slack OAuth integration or email authentication. 
                  You are responsible for maintaining the confidentiality of your account information.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>4. Acceptable Use Policy</Title>
                <Paragraph>
                  <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  You agree not to use the Service to:
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>Process illegal, harmful, or inappropriate content</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Attempt to reverse engineer or compromise our systems</li>
                  <li>Share copyrighted material without proper authorization</li>
                  <li>Use the service for spam or malicious activities</li>
                  <li>Exceed reasonable usage limits or attempt to overload our servers</li>
                </ul>
              </section>

              <Divider />

              <section>
                <Title level={2}>5. Subscription and Billing</Title>
                <Paragraph>
                  <strong>Free Tier:</strong> Limited usage with basic features
                </Paragraph>
                <Paragraph>
                  <strong>Paid Plans:</strong> Monthly subscriptions with enhanced features and higher usage limits
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>Billing occurs monthly in advance</li>
                  <li>Payments are non-refundable except as required by law</li>
                  <li>We may change pricing with 30 days notice</li>
                  <li>Accounts may be suspended for non-payment</li>
                  <li>Cancellation takes effect at the end of the current billing period</li>
                </ul>
              </section>

              <Divider />

              <section>
                <Title level={2}>6. Data Processing and Privacy</Title>
                <Paragraph>
                  We process shared links and generate summaries to provide our service. Our data handling 
                  practices are detailed in our <a href="/privacy">Privacy Policy</a>.
                </Paragraph>
                <Paragraph>
                  Key points:
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>We only process publicly accessible content from shared links</li>
                  <li>Audio summaries are stored securely and accessible only to your team</li>
                  <li>We do not sell or share your data with third parties</li>
                  <li>You can request data deletion at any time</li>
                </ul>
              </section>

              <Divider />

              <section>
                <Title level={2}>7. Intellectual Property</Title>
                <Paragraph>
                  <strong>Your Content:</strong> You retain ownership of any content you provide. You grant us 
                  a license to process and summarize this content to provide our services.
                </Paragraph>
                <Paragraph>
                  <strong>Our Service:</strong> The biirbal.ai service, including our technology, software, 
                  and generated summaries, are our intellectual property.
                </Paragraph>
                <Paragraph>
                  <strong>Third-Party Content:</strong> When processing external links, we respect copyright 
                  and fair use principles. Users are responsible for ensuring they have rights to process shared content.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>8. Service Availability and Support</Title>
                <Paragraph>
                  We strive to maintain high service availability but cannot guarantee 100% uptime. 
                  We may perform maintenance that temporarily interrupts service.
                </Paragraph>
                <Paragraph>
                  <strong>Support:</strong> We provide email support for all users and priority support for paid plans.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>9. Disclaimers and Limitations</Title>
                <Paragraph>
                  <FileTextOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  <strong>AI-Generated Content:</strong> Our summaries are AI-generated and may contain errors or 
                  omissions. Users should verify important information independently.
                </Paragraph>
                <Paragraph>
                  <strong>Service Limitations:</strong>
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>We cannot guarantee accuracy of all processed content</li>
                  <li>Some websites may not be accessible or processable</li>
                  <li>Audio quality may vary based on source content</li>
                  <li>Processing times may vary during high usage periods</li>
                </ul>
                <Paragraph>
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>10. Limitation of Liability</Title>
                <Paragraph>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, biirbal.ai SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
                </Paragraph>
                <Paragraph>
                  Our total liability shall not exceed the amount paid by you for the service in the 
                  12 months preceding the claim.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>11. Termination</Title>
                <Paragraph>
                  Either party may terminate this agreement at any time:
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li><strong>By You:</strong> Cancel your subscription through your account settings</li>
                  <li><strong>By Us:</strong> We may suspend or terminate accounts for violations of these terms</li>
                </ul>
                <Paragraph>
                  Upon termination, your access to the service will cease, and we may delete your data 
                  according to our retention policies.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>12. Changes to Terms</Title>
                <Paragraph>
                  We may update these terms from time to time. We will notify users of material changes 
                  via email or through the service. Continued use after changes constitutes acceptance of new terms.
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>13. Governing Law</Title>
                <Paragraph>
                  These terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved 
                  through binding arbitration in [Your Jurisdiction].
                </Paragraph>
              </section>

              <Divider />

              <section>
                <Title level={2}>14. Contact Information</Title>
                <Paragraph>
                  For questions about these Terms of Service, please contact us:
                </Paragraph>
                <ul style={{ paddingLeft: 20, listStyle: 'none' }}>
                  <li><strong>Email:</strong> legal@biirbal.ai</li>
                  <li><strong>Support:</strong> hello@biirbal.ai</li>
                  <li><strong>Website:</strong> <a href="https://biirbal.ai">biirbal.ai</a></li>
                </ul>
              </section>

              <div style={{ 
                background: '#f6f8fa', 
                padding: 20, 
                borderRadius: 8, 
                marginTop: 40,
                textAlign: 'center'
              }}>
                <Text type="secondary">
                  By using biirbal.ai, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </Text>
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </Layout>
  )
}