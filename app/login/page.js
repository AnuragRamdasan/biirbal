'use client'

import { signIn } from 'next-auth/react'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to Biirbal</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to access your workspace</p>
        </div>

        <div className="mt-8 space-y-6">
          <button
            onClick={() => signIn('slack', { callbackUrl: '/dashboard' })}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-[#4A154B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#611f64] focus:outline-none focus:ring-2 focus:ring-[#4A154B] focus:ring-offset-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 0-2.521-2.52A2.528 2.528 0 0 0 3.792 5.042v2.52h5.042V5.042zM8.834 6.313a2.528 2.528 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52A2.528 2.528 0 0 1 11.355 8.834H8.834V6.313zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.52A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.52h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 0-2.523 2.52 2.527 2.527 0 0 0 2.523 2.521h6.313A2.528 2.528 0 0 0 26.5 11.354a2.528 2.528 0 0 0-2.522-2.52h-6.313zM17.688 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 17.688 24a2.527 2.527 0 0 1-2.523-2.522v-2.522h2.523zM17.688 17.688a2.527 2.527 0 0 0-2.523-2.521 2.526 2.526 0 0 0-2.52 2.521v6.313A2.528 2.528 0 0 0 15.165 26.5a2.528 2.528 0 0 0 2.523-2.522v-6.313zM11.355 17.688a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 11.355 22.73a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zM11.355 16.417a2.528 2.528 0 0 0-2.521-2.52 2.527 2.527 0 0 0-2.52 2.52v6.313A2.528 2.528 0 0 0 8.834 26.5a2.528 2.528 0 0 0 2.521-2.522v-6.313z" />
            </svg>
            Sign in with Slack
          </button>
        </div>
      </div>
    </div>
  )
}
