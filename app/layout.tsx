import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Astute AIsistant - Your 24/7 AI Chat Assistant',
  description: 'AI chat assistant that handles customer conversations, answers inquiries, creates tickets, and captures leads. Around the clock in 4 languages.',
  keywords: ['AI chat assistant', 'customer service', 'chatbot', 'lead capture', 'multilingual', 'service desk'],
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}



