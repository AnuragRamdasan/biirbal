'use client'

import { useEffect, useState } from 'react'

interface ProcessedLink {
  id: string
  url: string
  title: string | null
  extractedText: string | null
  audioFileUrl: string | null
  createdAt: string
  processingStatus: string
  listens: AudioListen[]
}

interface AudioListen {
  id: string
  listenedAt: string
  completed: boolean
  listenDuration: number | null
}

export default function Dashboard() {
  const [links, setLinks] = useState<ProcessedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLinks()
    
    // Scroll to specific link if hash is present
    const hash = window.location.hash.substring(1)
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(`link-${hash}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
          element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
          }, 3000)
        }
      }, 500)
    }
  }, [])

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/dashboard/links')
      if (!response.ok) {
        throw new Error('Failed to fetch links')
      }
      const data = await response.json()
      setLinks(data.links)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const trackListen = async (linkId: string) => {
    try {
      await fetch('/api/dashboard/track-listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkId }),
      })
      fetchLinks()
    } catch (err) {
      console.error('Failed to track listen:', err)
    }
  }

  const markAsCompleted = async (linkId: string, listenId: string) => {
    try {
      await fetch('/api/dashboard/complete-listen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkId, listenId }),
      })
      fetchLinks()
    } catch (err) {
      console.error('Failed to mark as completed:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your links...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Audio Dashboard</h1>
        
        {links.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No links processed yet. Share some links in Slack to get started!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {links.map((link) => (
              <div key={link.id} id={`link-${link.id}`} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {link.title || 'Untitled'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-2">
                      {new Date(link.createdAt).toLocaleDateString()} at{' '}
                      {new Date(link.createdAt).toLocaleTimeString()}
                    </p>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm break-all"
                    >
                      {link.url}
                    </a>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      link.processingStatus === 'COMPLETED' 
                        ? 'bg-green-100 text-green-800' 
                        : link.processingStatus === 'PROCESSING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : link.processingStatus === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {link.processingStatus}
                    </span>
                  </div>
                </div>

                {link.extractedText && (
                  <p className="text-gray-700 mb-4 line-clamp-3">{link.extractedText}</p>
                )}

                {link.audioFileUrl && link.processingStatus === 'COMPLETED' && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900">Audio Summary</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {link.listens.length} listen{link.listens.length !== 1 ? 's' : ''}
                        </span>
                        {link.listens.some(l => l.completed) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <audio 
                      controls 
                      className="w-full"
                      onPlay={() => trackListen(link.id)}
                      onEnded={() => {
                        const latestListen = link.listens[link.listens.length - 1]
                        if (latestListen && !latestListen.completed) {
                          markAsCompleted(link.id, latestListen.id)
                        }
                      }}
                    >
                      <source src={link.audioFileUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>

                    {link.listens.length > 0 && (
                      <div className="mt-3">
                        <details className="text-sm text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-800">
                            Listen History ({link.listens.length})
                          </summary>
                          <div className="mt-2 space-y-1">
                            {link.listens.map((listen) => (
                              <div key={listen.id} className="flex justify-between items-center py-1">
                                <span>
                                  {new Date(listen.listenedAt).toLocaleDateString()} at{' '}
                                  {new Date(listen.listenedAt).toLocaleTimeString()}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  listen.completed 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {listen.completed ? 'Completed' : 'Started'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}