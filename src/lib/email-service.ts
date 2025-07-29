import * as brevo from '@getbrevo/brevo'

// Brevo configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@biirbal.com'
const FROM_NAME = process.env.FROM_NAME || 'Biirbal Team'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private initialized: boolean = false
  private apiInstance: brevo.TransactionalEmailsApi

  constructor() {
    if (BREVO_API_KEY) {
      const defaultClient = brevo.ApiClient.instance
      const apiKey = defaultClient.authentications['api-key']
      apiKey.apiKey = BREVO_API_KEY
      
      this.apiInstance = new brevo.TransactionalEmailsApi()
      this.initialized = true
      console.log('✅ Brevo email service initialized')
    } else {
      console.warn('⚠️ BREVO_API_KEY not configured - email service disabled')
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.initialized) {
      console.log('📧 Email (Brevo not configured):', options.subject, 'to', options.to)
      return false
    }

    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail()
      
      sendSmtpEmail.to = [{ email: options.to }]
      sendSmtpEmail.sender = { email: FROM_EMAIL, name: FROM_NAME }
      sendSmtpEmail.subject = options.subject
      sendSmtpEmail.htmlContent = options.html
      sendSmtpEmail.textContent = options.text || this.htmlToText(options.html)

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail)
      console.log('✅ Email sent via Brevo:', options.subject, 'to', options.to, 'Message ID:', response.messageId)
      return true
    } catch (error) {
      console.error('❌ Failed to send email via Brevo:', error)
      if (error.response) {
        console.error('Brevo error details:', error.response.text || error.response.body)
      }
      return false
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
  }

  // Team invitation email
  async sendTeamInvitation(data: {
    email: string
    teamName: string
    inviterName: string
    inviteUrl: string
    expiresAt: Date
  }): Promise<boolean> {
    const subject = `You're invited to join ${data.teamName} on Biirbal`
    
    const html = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Team Invitation - Biirbal</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
    .logo { font-size: 36px; color: #ffffff; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-title { font-size: 24px; color: #ffffff; margin: 0; font-weight: 600; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #2d3748; margin-bottom: 24px; font-weight: 500; }
    .invitation-text { font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px; }
    .info-box { background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #1890ff; }
    .info-title { font-size: 16px; font-weight: 600; color: #1a202c; margin-bottom: 8px; }
    .info-description { font-size: 14px; color: #4a5568; line-height: 1.5; margin: 0; }
    .cta-container { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3); transition: transform 0.2s ease; }
    .cta-button:hover { transform: translateY(-2px); }
    .expires { background-color: #fef5e7; border: 1px solid #f6ad55; color: #c05621; padding: 12px 16px; border-radius: 6px; font-size: 14px; margin: 24px 0; text-align: center; }
    .backup-link { background-color: #f7fafc; padding: 16px; border-radius: 6px; margin: 24px 0; }
    .backup-link-text { font-size: 14px; color: #4a5568; margin-bottom: 8px; }
    .backup-url { font-size: 12px; color: #718096; word-break: break-all; background-color: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
    .footer { background-color: #f7fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 12px; color: #718096; text-align: center; line-height: 1.5; margin: 0; }
    .footer-text a { color: #1890ff; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px; }
      .header { padding: 32px 20px; }
      .cta-button { padding: 14px 24px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">🎧 Biirbal</div>
            <h1 class="header-title">You're invited to join a team!</h1>
          </div>
          
          <!-- Content -->
          <div class="content">
            <div class="greeting">Hello!</div>
            
            <div class="invitation-text">
              <strong>${data.inviterName}</strong> has invited you to join <strong>${data.teamName}</strong> on Biirbal.
            </div>
            
            <div class="info-box">
              <div class="info-title">What is Biirbal?</div>
              <div class="info-description">
                Biirbal automatically converts links shared in your Slack channels into 59-second audio summaries, making it easy to stay informed without interrupting your workflow. Perfect for busy teams who want to stay updated on shared content.
              </div>
            </div>
            
            <div class="invitation-text">
              Click the button below to accept your invitation and start enjoying audio summaries with your team:
            </div>
            
            <div class="cta-container">
              <a href="${data.inviteUrl}" class="cta-button">Accept Invitation</a>
            </div>
            
            <div class="expires">
              ⏰ This invitation expires on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}
            </div>
            
            <div class="backup-link">
              <div class="backup-link-text">If the button doesn't work, copy and paste this link into your browser:</div>
              <div class="backup-url">${data.inviteUrl}</div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              This invitation was sent to ${data.email}. If you received this in error, you can safely ignore this email.<br>
              Questions? Contact us at <a href="mailto:support@biirbal.com">support@biirbal.com</a><br><br>
              © 2025 Biirbal. All rights reserved.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    return this.sendEmail({ to: data.email, subject, html })
  }

  // Team removal email
  async sendTeamRemovalNotification(data: {
    email: string
    teamName: string
    removedBy: string
  }): Promise<boolean> {
    const subject = `You've been removed from ${data.teamName} on Biirbal`
    
    const html = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Team Access Removed - Biirbal</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%); padding: 40px 20px; text-align: center; }
    .logo { font-size: 36px; color: #ffffff; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-title { font-size: 24px; color: #ffffff; margin: 0; font-weight: 600; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #2d3748; margin-bottom: 24px; font-weight: 500; }
    .notification-text { font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px; }
    .info-box { background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 20%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b; }
    .info-title { font-size: 16px; font-weight: 600; color: #92400e; margin-bottom: 12px; }
    .info-list { margin: 0; padding-left: 20px; }
    .info-list li { font-size: 14px; color: #a16207; line-height: 1.5; margin-bottom: 6px; }
    .contact-box { background-color: #f0f9ff; border: 1px solid #7dd3fc; padding: 20px; border-radius: 8px; margin: 24px 0; }
    .contact-text { font-size: 14px; color: #0369a1; margin: 0; text-align: center; }
    .contact-text a { color: #0284c7; text-decoration: none; font-weight: 500; }
    .footer { background-color: #f7fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 12px; color: #718096; text-align: center; line-height: 1.5; margin: 0; }
    .footer-text a { color: #1890ff; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px; }
      .header { padding: 32px 20px; }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">🎧 Biirbal</div>
            <h1 class="header-title">Team Access Removed</h1>
          </div>
          
          <!-- Content -->
          <div class="content">
            <div class="greeting">Hello,</div>
            
            <div class="notification-text">
              This is to inform you that your access to <strong>${data.teamName}</strong> on Biirbal has been removed by <strong>${data.removedBy}</strong>.
            </div>
            
            <div class="info-box">
              <div class="info-title">What this means:</div>
              <ul class="info-list">
                <li>You no longer have access to the team's audio summaries</li>
                <li>You won't receive new link summaries from this team</li>
                <li>Your previous data and listen history remain with the team</li>
                <li>You can no longer access the team's dashboard or content</li>
              </ul>
            </div>
            
            <div class="notification-text">
              If you believe this was done in error, please contact your team administrator directly.
            </div>
            
            <div class="contact-box">
              <p class="contact-text">
                Need help? Contact our support team at <a href="mailto:support@biirbal.com">support@biirbal.com</a>
              </p>
            </div>
            
            <div class="notification-text">
              Thank you for using Biirbal. We hope you had a great experience with our audio summary service.
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              This notification was sent to ${data.email}.<br>
              This is an automated message, please do not reply to this email.<br><br>
              © 2025 Biirbal. All rights reserved.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    return this.sendEmail({ to: data.email, subject, html })
  }
}

// Export singleton instance
export const emailService = new EmailService()