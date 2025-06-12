'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [articles, setArticles] = useState([])
  const [channels, setChannels] = useState([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetch('/api/workspace/articles')
        .then((res) => res.json())
        .then((data) => setArticles(data))

      fetch('/api/workspace/channels')
        .then((res) => res.json())
        .then((data) => setChannels(data))
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  console.log('session')
  console.log(session)
  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Workspace Dashboard</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Channels</h2>
          <div className="rounded-lg bg-white p-4 shadow">
            {channels.map((channel) => (
              <div key={channel.id} className="mb-2">
                <span className="font-medium">#{channel.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Recent Articles</h2>
          <div className="rounded-lg bg-white p-4 shadow">
            {articles.map((article) => (
              <div key={article.id} className="mb-4 border-b p-4">
                <a href={article.url} className="text-blue-600 hover:underline">
                  {article.url}
                </a>
                <div className="mt-2">
                  <audio controls src={article.audioUrl} className="w-full" />
                </div>
                <div className="mt-2 text-sm text-gray-500">Channel: #{article.channel.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps(context) {
  return {
    props: {},
  }
}
