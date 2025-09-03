import { Metadata } from 'next'
import { newsroomMetadata } from './metadata'

export const metadata: Metadata = newsroomMetadata

export default function NewsroomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}