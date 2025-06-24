// Jest setup file
import { jest } from '@jest/globals'

// Mock environment variables
process.env.SLACK_CLIENT_ID = 'test_client_id'
process.env.SLACK_CLIENT_SECRET = 'test_client_secret'
process.env.SLACK_SIGNING_SECRET = 'test_signing_secret'
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'

// Mock Google Cloud services
jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn().mockImplementation(() => ({
    synthesizeSpeech: jest.fn().mockResolvedValue([{
      audioContent: Buffer.from('mock audio content')
    }])
  }))
}))

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined)
      })
    })
  }))
}))

// Mock Slack SDK
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    oauth: {
      v2: {
        access: jest.fn().mockResolvedValue({
          ok: true,
          team: { id: 'T123', name: 'Test Team' },
          access_token: 'xoxb-test-token',
          bot_user_id: 'B123'
        })
      }
    },
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ok: true })
    },
    files: {
      upload: jest.fn().mockResolvedValue({ ok: true })
    }
  }))
}))

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test'
        })
      }
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test123' } }
      })
    }
  }))
})