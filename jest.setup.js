// Jest setup file

// Mock environment variables
process.env.SLACK_CLIENT_ID = 'test_client_id'
process.env.SLACK_CLIENT_SECRET = 'test_client_secret'
process.env.SLACK_SIGNING_SECRET = 'test_signing_secret'
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.OPENAI_API_KEY = 'sk-test-key'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.SCRAPINGBEE_API_KEY = 'test-scrapingbee-key'
process.env.AWS_S3_BUCKET_NAME = 'test-bucket'
process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.AWS_REGION = 'us-east-1'
process.env.ADMIN_SLACK_TOKEN = 'xoxb-admin-test-token'

// Mock OpenAI
const mockOpenAIInstance = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test summary content' } }]
      })
    }
  },
  audio: {
    speech: {
      create: jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      })
    }
  }
}

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIInstance)
})

// Export mock instance for use in tests
global.mockOpenAIInstance = mockOpenAIInstance

// Mock Slack SDK
const mockSlackWebClient = {
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
}

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => mockSlackWebClient),
  addAppMetadata: jest.fn()
}))

// Export mock instance for use in tests
global.mockSlackWebClient = mockSlackWebClient

// Mock Slack Bolt
jest.mock('@slack/bolt', () => ({
  App: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    event: jest.fn(),
    message: jest.fn(),
    command: jest.fn(),
    action: jest.fn(),
    client: {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true })
      },
      files: {
        upload: jest.fn().mockResolvedValue({ ok: true })
      }
    }
  }))
}))

// Mock Stripe with configurable mocks
const mockStripeInstance = {
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
}

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance)
})

// Export mock instance for use in tests
global.mockStripeInstance = mockStripeInstance

// Mock Prisma Client
const mockPrismaClient = {
  team: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  },
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  },
  processedLink: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  subscription: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  queuedJob: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  channel: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  audioListen: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn()
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient)
}))

// Mock database module
jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn().mockResolvedValue(mockPrismaClient),
  prisma: mockPrismaClient,
  dbHealthCheck: jest.fn().mockResolvedValue(true),
  ensureDbConnection: jest.fn().mockResolvedValue(true)
}))

// Mock Bull queue
const mockBullInstance = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  process: jest.fn(),
  on: jest.fn(),
  getStats: jest.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 10,
    failed: 0
  }),
  clean: jest.fn(),
  close: jest.fn(),
  getWaiting: jest.fn().mockResolvedValue([]),
  getActive: jest.fn().mockResolvedValue([]),
  getCompleted: jest.fn().mockResolvedValue([]),
  getFailed: jest.fn().mockResolvedValue([]),
  getDelayed: jest.fn().mockResolvedValue([])
}

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => mockBullInstance)
})

// Export mock instance for use in tests
global.mockBullInstance = mockBullInstance

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn()
  }))
})

// Mock file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
  unlink: jest.fn().mockResolvedValue(undefined)
}))

// Mock AWS S3
const mockS3Instance = {
  send: jest.fn().mockResolvedValue({
    Location: 'https://s3.amazonaws.com/bucket/file.mp3'
  })
}

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => mockS3Instance),
  PutObjectCommand: jest.fn()
}))

// Export mock instance for use in tests
global.mockS3Instance = mockS3Instance

// Mock JSDOM
jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: {
      document: {
        querySelector: jest.fn(),
        querySelectorAll: jest.fn().mockReturnValue([])
      }
    }
  }))
}))

// Mock axios for ScrapingBee API
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    status: 200,
    data: Buffer.from('<html><body><h1>Test Article Title</h1><p>Test article content that is long enough to pass the minimum content check. This content needs to be at least 100 characters long to not trigger the insufficient content error. Here is some additional text to make sure we meet that requirement and can properly test the content extraction functionality.</p></body></html>')
  })
}))

// Mock Mozilla Readability
jest.mock('@mozilla/readability', () => ({
  Readability: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      title: 'Test Article Title',
      content: '<p>Test article content that is long enough to pass the minimum content check. This content needs to be at least 100 characters long to not trigger the insufficient content error.</p>',
      textContent: 'Test article content that is long enough to pass the minimum content check. This content needs to be at least 100 characters long to not trigger the insufficient content error.',
      excerpt: 'Test excerpt'
    })
  }))
}))

// Mock Next.js
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }))
}))

// Mock fetch globally - will be overridden in individual tests as needed
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })
)

// Mock localStorage for client-side tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Note: window.location is provided by jsdom

// Mock Next.js useSearchParams and useRouter
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null)
  })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }))
}))