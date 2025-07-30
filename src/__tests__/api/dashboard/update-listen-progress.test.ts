import { POST } from '@/app/api/dashboard/update-listen-progress/route'
import { NextRequest } from 'next/server'

// Mock dependencies
const mockAudioListenUpdate = jest.fn()
const mockProcessedLinkFindUnique = jest.fn()
const mockProcessedLinkUpdate = jest.fn()

jest.mock('@/lib/db', () => ({
  getDbClient: jest.fn(() => ({
    audioListen: {
      update: mockAudioListenUpdate,
    },
    processedLink: {
      findUnique: mockProcessedLinkFindUnique,
      update: mockProcessedLinkUpdate,
    }
  }))
}))

describe('/api/dashboard/update-listen-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update listen progress successfully', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 30,
      listenDuration: 25,
      completed: false
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)

    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 30,
        duration: 25,
        completed: false,
        completionPercentage: 25
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
        resumePosition: 30,
        listenDuration: 25
      }
    })
  })

  it('should mark as completed and archive link when completion >= 85%', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 85,
      listenDuration: 90,
      completed: true
    }

    const mockProcessedLink = {
      id: 'link123',
      isAccessRestricted: false,
      listens: [{ completed: true }]
    }

    const mockArchivedLink = {
      ...mockProcessedLink,
      isAccessRestricted: true
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)
    mockProcessedLinkFindUnique.mockResolvedValue(mockProcessedLink)
    mockProcessedLinkUpdate.mockResolvedValue(mockArchivedLink)

    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 85,
        duration: 90,
        completed: false,
        completionPercentage: 85
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.listen).toEqual(mockListen)
    expect(data.archived).toBe(true)
    expect(data.message).toBe('Listen completed and link archived')
    
    // Should mark as completed due to 85% threshold
    expect(mockAudioListenUpdate).toHaveBeenCalledWith({
      where: { id: 'listen123' },
      data: {
        resumePosition: 85,
        listenDuration: 90,
        completed: true
      }
    })

    // Should archive the link
    expect(mockProcessedLinkUpdate).toHaveBeenCalledWith({
      where: { id: 'link123' },
      data: {
        isAccessRestricted: true,
        updatedAt: expect.any(Date)
      }
    })
  })

  it('should mark as completed when explicitly set', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 60,
      listenDuration: 55,
      completed: true
    }

    const mockProcessedLink = {
      id: 'link123',
      isAccessRestricted: false,
      listens: [{ completed: true }]
    }

    const mockArchivedLink = {
      ...mockProcessedLink,
      isAccessRestricted: true
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)
    mockProcessedLinkFindUnique.mockResolvedValue(mockProcessedLink)
    mockProcessedLinkUpdate.mockResolvedValue(mockArchivedLink)

    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 60,
        duration: 55,
        completed: true,
        completionPercentage: 60
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.archived).toBe(true)
    expect(mockAudioListenUpdate).toHaveBeenCalledWith({
      where: { id: 'listen123' },
      data: {
        resumePosition: 60,
        listenDuration: 55,
        completed: true
      }
    })
  })

  it('should not archive already archived links', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 90,
      completed: true
    }

    const mockProcessedLink = {
      id: 'link123',
      isAccessRestricted: true, // Already archived
      listens: [{ completed: true }]
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)
    mockProcessedLinkFindUnique.mockResolvedValue(mockProcessedLink)

    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 90,
        completed: true,
        completionPercentage: 100
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.archived).toBe(false)
    expect(mockProcessedLinkUpdate).not.toHaveBeenCalled()
  })

  it('should return 400 for missing linkId', async () => {
    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        listenId: 'listen123',
        currentTime: 30
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
    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        currentTime: 30
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

  it('should return 400 for invalid currentTime', async () => {
    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: -5
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Valid currentTime is required')
  })

  it('should handle archiving errors gracefully', async () => {
    const mockListen = {
      id: 'listen123',
      processedLinkId: 'link123',
      resumePosition: 90,
      completed: true
    }

    const mockProcessedLink = {
      id: 'link123',
      isAccessRestricted: false,
      listens: [{ completed: true }]
    }

    mockAudioListenUpdate.mockResolvedValue(mockListen)
    mockProcessedLinkFindUnique.mockResolvedValue(mockProcessedLink)
    mockProcessedLinkUpdate.mockRejectedValue(new Error('Archive failed'))

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 90,
        completed: true,
        completionPercentage: 100
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.archived).toBe(false)
    expect(data.message).toBe('Listen completed and link archived')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to archive link:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('should return 500 for database errors', async () => {
    mockAudioListenUpdate.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/dashboard/update-listen-progress', {
      method: 'POST',
      body: JSON.stringify({
        linkId: 'link123',
        listenId: 'listen123',
        currentTime: 30
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