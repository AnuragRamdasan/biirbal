import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { formatDistanceToNow } from 'date-fns'

const prisma = new PrismaClient()

async function getArticles(workspaceId) {
  console.log('workspaceId')
  console.log(workspaceId)
  if (!workspaceId) {
    return []
  }
  try {
    return await prisma.article.findMany({
      where: {
        workspaceId: workspaceId,
      },
      include: {
        Channel: true,
        Workspace: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch (error) {
    console.error('Error fetching articles:', error)
    return []
  }
}

export default async function Home() {
  const cookieStore = await cookies()
  const workspaceId = cookieStore.get('workspaceId')
  const articles = await getArticles(workspaceId && workspaceId.value)

  console.log(articles)
  console.log(workspaceId)
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold">Article Audio Library</h1>

        <div className="grid gap-6">
          {articles.length > 0 ? (
            articles.map((article) => (
              <div key={article.id} className="space-y-4 rounded-lg bg-white p-6 shadow-md">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {new URL(article.url).hostname}
                      </a>
                    </h2>
                    <div className="space-x-3 text-sm text-gray-500">
                      <span>Channel: #{article.Channel.name}</span>
                      <span>•</span>
                      <span>Workspace: {article.Workspace.name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(article.createdAt))} ago</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-4 line-clamp-3 text-sm text-gray-600">{article.text}</div>

                  {article.audioUrl && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">🎧 Audio Version</div>
                      <audio controls className="w-full" src={article.audioUrl}>
                        Your browser does not support the audio element.
                      </audio>
                      <a
                        href={article.audioUrl}
                        download
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download MP3
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg bg-gray-50 py-12 text-center">
              <p className="text-gray-600">
                No articles have been processed yet. Share some links in your Slack channels!
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
