import React from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  link: {
    id: string
    url: string
    title: string | null
    audioFileUrl: string | null
    ttsScript: string | null
    createdAt: string
    processingStatus: string
    listens: Array<{
      id: string
      listenedAt: string
      completed: boolean
      listenDuration: number | null
    }>
    ogImage?: string | null
  }
  isCurrentTrack: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  onPlay: () => void
  className?: string
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  link,
  isCurrentTrack,
  isPlaying,
  currentTime,
  duration,
  progress,
  onPlay,
  className
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const hasBeenListened = link.listens.some(l => l.completed)

  return (
    <Card 
      className={cn(
        'transition-all duration-200 overflow-hidden hover:shadow-lg',
        hasBeenListened ? 'opacity-60' : '',
        isCurrentTrack ? 'ring-2 ring-blue-500 shadow-lg' : '',
        className
      )}
    >
      <div className="flex items-center">
        {/* Play Button Column */}
        <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-r border-gray-100">
          {link.audioFileUrl && link.processingStatus === 'COMPLETED' ? (
            <Button 
              onClick={onPlay}
              size="lg"
              className={cn(
                'w-14 h-14 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 p-0',
                isCurrentTrack && isPlaying 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              )}
            >
              {isCurrentTrack && isPlaying ? (
                <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </Button>
          ) : (
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center border-2',
              link.processingStatus === 'PROCESSING' ? 'border-yellow-300 bg-yellow-50 animate-pulse' :
              link.processingStatus === 'FAILED' ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
            )}>
              <div className={cn(
                'w-4 h-4 rounded-full',
                link.processingStatus === 'PROCESSING' ? 'bg-yellow-500 animate-pulse' :
                link.processingStatus === 'FAILED' ? 'bg-red-500' : 'bg-gray-400'
              )}></div>
            </div>
          )}
        </div>
        
        {/* Content Column */}
        <CardContent className="flex-1 p-6">
          <div className="flex items-center gap-6">
            {/* Article Image */}
            <div className="flex-shrink-0 hidden sm:block">
              {link.ogImage ? (
                <img 
                  src={link.ogImage} 
                  alt={link.title || 'Article'}
                  className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border border-gray-200">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Article Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                  {link.title || 'Untitled'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                  <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                  {link.listens.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{link.listens.length} play{link.listens.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                  {hasBeenListened && (
                    <>
                      <span>•</span>
                      <Badge variant="success" className="text-xs">Completed</Badge>
                    </>
                  )}
                </div>
              </div>
              
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-blue-600 transition-colors truncate block mb-3 font-medium"
              >
                {link.url}
              </a>
              
              {/* Progress Bar */}
              {link.audioFileUrl && link.processingStatus === 'COMPLETED' && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        hasBeenListened ? 'bg-green-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${progress * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium min-w-0">
                    {formatTime(currentTime)} / {formatTime(duration || 59)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
      
      {/* Summary Display - Only shown when playing */}
      {isCurrentTrack && isPlaying && link.ttsScript && (
        <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span>🎧 Now Playing Summary</span>
              </h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                {link.ttsScript}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default AudioPlayer