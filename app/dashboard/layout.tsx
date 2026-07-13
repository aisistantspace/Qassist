'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Signika } from 'next/font/google'
import {
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  HomeIcon,
  CloudArrowUpIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  TicketIcon,
  QuestionMarkCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import NotificationBell from '@/components/NotificationBell'
import EnniaLogo from '@/components/demo/EnniaLogo'
import { enniaTheme } from '@/lib/demo-themes/ennia'

const signika = Signika({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

interface SessionInfo {
  authenticated: boolean
  isSuperAdmin?: boolean
  user?: { username: string; role: string }
  tenant?: { id: string; name: string; slug: string }
  chatPath?: string
}

const baseNavigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'Conversations', href: '/dashboard/conversations', icon: ChatBubbleLeftRightIcon },
  { name: 'Leads', href: '/dashboard/leads', icon: UserGroupIcon },
  { name: 'Tickets', href: '/dashboard/tickets', icon: TicketIcon },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: DocumentTextIcon },
  { name: 'Knowledge Gaps', href: '/dashboard/knowledge-gaps', icon: QuestionMarkCircleIcon },
  { name: 'Automated Forms', href: '/dashboard/forms', icon: ClipboardDocumentListIcon },
  { name: 'Deploy', href: '/dashboard/deploy', icon: CloudArrowUpIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

const superAdminNav = { name: 'Tenants', href: '/dashboard/tenants', icon: BuildingOffice2Icon }

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/conversations': 'Conversations',
  '/dashboard/leads': 'Leads',
  '/dashboard/tickets': 'Tickets',
  '/dashboard/knowledge-base': 'Knowledge Base',
  '/dashboard/knowledge-gaps': 'Knowledge Gaps',
  '/dashboard/forms': 'Automated Forms',
  '/dashboard/deploy': 'Deploy',
  '/dashboard/settings': 'Settings',
  '/dashboard/tenants': 'Tenants',
  '/dashboard/documents': 'Documents',
  '/dashboard/upload': 'Upload',
  '/dashboard/hot-leads': 'Hot Leads',
  '/dashboard/papiamentu': 'Papiamentu',
}

const pageTitleEntries = Object.entries(pageTitles).sort((a, b) => b[0].length - a[0].length)

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard'
  for (const [path, title] of pageTitleEntries) {
    if (pathname === path || pathname.startsWith(path + '/')) return title
  }
  return 'Dashboard'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isLg, setIsLg] = useState(true)
  const [session, setSession] = useState<SessionInfo | null>(null)

  const pageTitle = getPageTitle(pathname)

  const navigation = session?.isSuperAdmin
    ? [...baseNavigation.slice(0, 8), superAdminNav, baseNavigation[8]]
    : baseNavigation

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null))
  }, [pathname])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => {
      const lg = mq.matches
      setIsLg(lg)
      if (lg) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!isLg) setSidebarOpen(false)
  }, [pathname, isLg])

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [])

  useEffect(() => {
    if (sidebarOpen && !isLg) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen, isLg])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      const slug = session?.tenant?.slug
      router.push(slug && !session?.isSuperAdmin ? `/demo/${slug}/login` : '/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
      router.refresh()
    }
  }

  const tenantLabel = session?.isSuperAdmin
    ? 'Astute AIssistant'
    : session?.tenant?.name || session?.tenant?.slug?.toUpperCase() || 'AI Assistant'
  const chatHref = session?.chatPath || '/chat'
  const isEnniaTenant = !session?.isSuperAdmin && session?.tenant?.slug === 'ennia'
  const ec = enniaTheme.colors

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div
        className={`p-6 border-b ${isEnniaTenant ? '' : 'border-gray-200'}`}
        style={isEnniaTenant ? { backgroundColor: ec.greenDark, borderColor: ec.greenDarker } : undefined}
      >
        {isEnniaTenant ? (
          <>
            <EnniaLogo variant="light" />
            <p className="text-xs text-white/80 mt-3">
              {session?.user?.username ? `@${session.user.username}` : 'Demo account'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">{tenantLabel}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {session?.isSuperAdmin
                ? 'Platform super admin'
                : session?.user?.username
                  ? `@${session.user.username} · customer account`
                  : 'Dashboard'}
            </p>
          </>
        )}
        {session?.isSuperAdmin && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-2">
            Admin mode — use <strong>Tenants</strong> to manage customers. ENNIA demo is a separate login.
          </p>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = isNavActive(pathname, item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => !isLg && setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors min-h-[44px]
                ${
                  isEnniaTenant
                    ? isActive
                      ? 'font-semibold'
                      : 'hover:bg-black/[0.04]'
                    : isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }
              `}
              style={
                isEnniaTenant
                  ? {
                      color: isActive ? ec.greenDark : ec.text,
                      backgroundColor: isActive ? ec.greenBg : undefined,
                    }
                  : undefined
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className={`p-4 border-t space-y-2 ${isEnniaTenant ? 'border-gray-200 bg-white' : 'border-gray-200'}`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
            isEnniaTenant ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Logout
        </button>
        <div className="text-[10px] text-gray-400 font-medium mb-2">
          Developed by{' '}
          <a href="https://astuteweb.agency" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
            Astute Web Agency
          </a>
        </div>
        <Link
          href={chatHref}
          className={`text-xs mt-1 inline-block font-semibold hover:underline ${isEnniaTenant ? '' : 'text-primary-600 hover:text-primary-700'}`}
          style={isEnniaTenant ? { color: ec.greenDark } : undefined}
        >
          ← Open Chat Assistant
        </Link>
      </div>
    </div>
  )

  return (
    <div
      className={`min-h-screen ${isEnniaTenant ? signika.className : 'bg-gray-50'}`}
      style={isEnniaTenant ? { backgroundColor: ec.greenBg } : undefined}
    >
      {!isLg && sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 shadow-sm
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${isLg ? 'w-64' : 'w-72 max-w-[85vw]'}
          ${!isLg && !sidebarOpen ? '-translate-x-full' : ''}
        `}
      >
        {sidebarContent}
      </div>

      <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate flex-1 text-center mx-2">
          {pageTitle}
        </h1>
        <div className="min-w-[44px] flex items-center justify-center">
          <NotificationBell />
        </div>
      </header>

      <div className="hidden lg:flex lg:fixed lg:top-0 lg:right-0 lg:left-64 lg:z-20 lg:h-14 lg:items-center lg:justify-between lg:px-8 lg:bg-white/95 lg:backdrop-blur lg:border-b lg:border-gray-200 lg:shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">{pageTitle}</h1>
        <NotificationBell />
      </div>

      <div className="pl-0 lg:pl-64 lg:pt-14">
        {session?.isSuperAdmin && pathname === '/dashboard' && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You&apos;re in <strong>platform admin</strong> mode. This overview shows the default tenant (ENNIA) data.
            Go to <Link href="/dashboard/tenants" className="font-semibold underline">Tenants</Link> to create accounts, or use{' '}
            <a href="/demo/ennia/login" className="font-semibold underline">/demo/ennia/login</a> for the customer demo experience.
          </div>
        )}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
