// Mock implementation for @vercel/kv
const kv = {
  hset: jest.fn(),
  hgetall: jest.fn(),
  zadd: jest.fn(),
  zrem: jest.fn(),
  zpopmax: jest.fn(),
  zcard: jest.fn(),
  zrangebyscore: jest.fn(),
  incr: jest.fn(),
  get: jest.fn()
}

module.exports = { kv }