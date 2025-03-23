import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = {
  title: 'Article Audio - Dashboard',
  description: 'Convert your articles to audio',
}

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white pt-16">
      <div className="h-full overflow-y-auto px-4 py-4">
        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
          >
            <svg
              className="mr-3 h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </Link>
          <Link
            href="/articles"
            className="flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
          >
            <svg
              className="mr-3 h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Articles
          </Link>
          <Link
            href="/settings"
            className="flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
          >
            <svg
              className="mr-3 h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </Link>
        </nav>
      </div>
    </aside>
  )
}

function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold">
            Article Audio
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <button className="rounded-full bg-gray-100 p-1">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
              alt="User"
              className="h-8 w-8 rounded-full"
            />
          </button>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="fixed bottom-0 z-40 w-full border-t border-gray-200 bg-white py-4 pl-64">
      <div className="px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Article Audio. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        <Sidebar />
        <main className="min-h-screen pb-16 pl-64 pt-16">
          <div className="container mx-auto p-6">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  )
}
