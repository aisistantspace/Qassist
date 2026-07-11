import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const normalized = slug.toLowerCase()

  if (normalized === 'ennia') {
    return {
      title: 'ENNIA Feel Secure — AI Assistant Demo',
      description:
        'Sign in to the ENNIA AI assistant demo. Dashboard, chat, and insurance knowledge for the Dutch Caribbean.',
    }
  }

  return {
    title: `${normalized.toUpperCase()} — Demo Login`,
    description: 'Sign in to your AI assistant demo account.',
  }
}

export default async function DemoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const isEnnia = slug.toLowerCase() === 'ennia'

  return <div className={isEnnia ? jakarta.className : undefined}>{children}</div>
}
