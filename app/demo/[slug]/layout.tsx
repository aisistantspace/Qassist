import type { Metadata } from 'next'
import { Signika } from 'next/font/google'

const signika = Signika({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
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
      title: 'ENNIA Feel Secure — Inloggen',
      description: 'Log in op de ENNIA AI assistant demo.',
      icons: { icon: 'https://www.ennia.com/assets/img/favicon-32x32.png' },
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

  return <div className={isEnnia ? signika.className : undefined}>{children}</div>
}
