import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { canAccessDemoChatFromCookieStore } from '@/lib/demo-auth'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DemoEntryPage({ params }: Props) {
  const { slug } = await params
  const normalized = slug.toLowerCase()
  const cookieStore = await cookies()

  const allowed = await canAccessDemoChatFromCookieStore(normalized, (name) => cookieStore.get(name)?.value)

  if (allowed) {
    redirect(normalized === 'ennia' ? '/chat' : `/chat?slug=${encodeURIComponent(normalized)}`)
  }

  redirect(`/demo/${normalized}/login`)
}
