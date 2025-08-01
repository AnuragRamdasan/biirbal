import { POST } from '@/app/api/dashboard/complete-listen/route'
import { NextRequest } from 'next/server'

// Mock dependencies
const mockAudioListenUpdate = jest.fn()

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(() => ({
    audioListen: {
      update: mockAudioListenUpdate,
    }
  }))
}))

describe('/api/dashboard/complete-listen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete listen successfully', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 120,
      listenDuration: 115,
      completed: true
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)

    const request = new NextRequest('http://localhost:3000/api/dashboard/complete-listen', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        duration: 115,
        currentTime: 120,
        completed: true
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.listen).toEqual(mockListen)
    expect(data.archived).toBe(false) // No global archiving - completion is per-user
    expect(data.message).toBe('Listen completed')
    
    expect(mockAudioListenUpdate).toHaveBeenCalledWith({
      where: { id: 'listen123' },
      data: {
        listenDuration: 115,
        resumePosition: 120,
        completed: true
      }
    })
  })

  it('should update progress when not completed', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 60,
      listenDuration: 55,
      completed: false
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)

    const request = new NextRequest('http://localhost:3000/api/dashboard/complete-listen', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        duration: 55,
        currentTime: 60,
        completed: false
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.listen).toEqual(mockListen)
    expect(data.archived).toBe(false)
    expect(data.message).toBe('Progress updated')
    
    expect(mockAudioListenUpdate).toHaveBeenCalledWith({
      where: { id: 'listen123' },
      data: {
        listenDuration: 55,
        resumePosition: 60
      }
    })
  })

  it('should handle partial data updates with explicit completed=false', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 45,
      completed: false
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)

    const request = new NextRequest('http://localhost:3000/api/dashboard/complete-listen', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 45,
        completed: false  // Explicitly set to false
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.listen).toEqual(mockListen)
    
    expect(mockAudioListenUpdate).toHaveBeenCalledWith({
      where: { id: 'listen123' },
      data: {
        resumePosition: 45
        // Note: completed is not set when it's false
      }
    })
  })

  it('should return 400 for missing linkId', async () => {
    const request = new NextRequest('http://localhost:3000/api/dashboard/complete-listen', {
      method: 'POST',
      body: JSON.stringify({
        listenId: 'listen123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('linkId and listenId are required')
  })

  it('should return 400 for missing listenId', async () => {
    const request = new NextRequest('http://localhost:3000/api/dashboard/complete-listen', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('linkId and listenId are required')
  })

  it('should handle database errors', async () => {
    mockAudioListenUpdate.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/dashboard/complete-listen', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 60,
        completed: true
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update listen progress')
  })

})