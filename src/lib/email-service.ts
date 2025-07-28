import nodemailer from 'nodemailer'

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.resend.com'
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587')
const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@biirbal.com'
const FROM_NAME = process.env.FROM_NAME || 'Biirbal Team'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    if (EMAIL_USER && EMAIL_PASSWORD) {
      this.transporter = nodemailer.createTransporter({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_PORT === 465,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASSWORD,
        },
      })
    } else {
      console.warn('⚠️ Email credentials not configured - email service disabled')
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log('📧 Email (no transporter configured):', options.subject, 'to', options.to)
      return false
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      })

      console.log('✅ Email sent:', options.subject, 'to', options.to, 'ID:', info.messageId)
      return true
    } catch (error) {
      console.error('❌ Failed to send email:', error)
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
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation - Biirbal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 32px; font-weight: bold; color: #1890ff; margin-bottom: 10px; }
    .title { font-size: 24px; margin-bottom: 20px; color: #333; }
    .content { margin-bottom: 30px; }
    .cta-button { display: inline-block; background-color: #1890ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
    .cta-button:hover { background-color: #096dd9; }
    .info-box { background-color: #f6f8fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
    .expires { color: #fa8c16; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎧 Biirbal</div>
      <h1 class="title">You're invited to join a team!</h1>
    </div>
    
    <div class="content">
      <p>Hi there!</p>
      
      <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.teamName}</strong> on Biirbal.</p>
      
      <div class="info-box">
        <p><strong>What is Biirbal?</strong></p>
        <p>Biirbal automatically converts links shared in your Slack channels into 59-second audio summaries, making it easy to stay informed without interrupting your workflow.</p>
      </div>
      
      <p>Click the button below to accept the invitation and join the team:</p>
      
      <div style="text-align: center;">
        <a href="${data.inviteUrl}" class="cta-button">Accept Invitation</a>
      </div>
      
      <p class="expires">⏰ This invitation expires on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}</p>
      
      <p>If you can't click the button, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 14px;">${data.inviteUrl}</p>
    </div>
    
    <div class="footer">
      <p>This invitation was sent to ${data.email}. If you received this in error, you can safely ignore this email.</p>
      <p>© 2025 Biirbal. All rights reserved.</p>
    </div>
  </div>
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
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Removal - Biirbal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 32px; font-weight: bold; color: #1890ff; margin-bottom: 10px; }
    .title { font-size: 24px; margin-bottom: 20px; color: #333; }
    .content { margin-bottom: 30px; }
    .info-box { background-color: #fff2e8; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #fa8c16; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎧 Biirbal</div>
      <h1 class="title">Team Access Removed</h1>
    </div>
    
    <div class="content">
      <p>Hi,</p>
      
      <p>This is to inform you that your access to <strong>${data.teamName}</strong> on Biirbal has been removed by ${data.removedBy}.</p>
      
      <div class="info-box">
        <p><strong>What this means:</strong></p>
        <ul>
          <li>You no longer have access to the team's audio summaries</li>
          <li>You won't receive new link summaries from this team</li>
          <li>Your previous data and listen history remain with the team</li>
        </ul>
      </div>
      
      <p>If you believe this was done in error, please contact the team administrator or reach out to our support team.</p>
      
      <p>Thank you for using Biirbal!</p>
    </div>
    
    <div class="footer">
      <p>This notification was sent to ${data.email}.</p>
      <p>© 2025 Biirbal. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `

    return this.sendEmail({ to: data.email, subject, html })
  }
}

// Export singleton instance
export const emailService = new EmailService()