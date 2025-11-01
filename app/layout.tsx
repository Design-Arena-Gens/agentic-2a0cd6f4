import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Part Search Agent',
  description: 'Search multiple websites for parts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
