'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'

interface DashboardStats {
  leads_today: number
  active_conversations: number
  booking_requests_week: number
  mailchimp_synced: number
  hubspot_synced: number
  avg_conversation_length: number
  language_distribution: Record<string, number>
  knowledge_base_entries: number
}

interface RecentLead {
  id: string
  name: string
  email: string
  created_at: string
  status: string
}

const LANG_LABELS: Record<string, { label: string; color: string }> = {
  EN: { label: 'English', color: 'bg-blue-500' },
  NL: { label: 'Dutch', color: 'bg-orange-500' },
  ES: { label: 'Spanish', color: 'bg-yellow-500' },
  PA: { label: 'Papiamentu', color: 'bg-red-500' },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)

  // Demo setup state
  const [showDemoSetup, setShowDemoSetup] = useState(false)
  const [demoForm, setDemoForm] = useState({
    company_name: '',
    company_website: '',
    primary_color: '#3B82F6',
  })
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoResult, setDemoResult] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const [statsRes, leadsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/recent-leads'),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setRecentLeads(leadsData.leads)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDemoSetup() {
    if (!demoForm.company_name || !demoForm.company_website) return
    setDemoLoading(true)
    setDemoResult(null)
    try {
      const res = await fetch('/api/demo/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDemoResult(data.message || 'Demo configured successfully!')
      fetchDashboardData()
    } catch (err: any) {
      setDemoResult(`Error: ${err.message}`)
    } finally {
      setDemoLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  const langDist = stats?.language_distribution || {}
  const totalConversations = Object.values(langDist).reduce((a, b) => a + b, 0)
  const hasKb = (stats?.knowledge_base_entries || 0) > 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Leads Today"
          value={stats?.leads_today || 0}
          icon={UserGroupIcon}
          color="blue"
          href="/dashboard/leads"
        />
        <StatCard
          title="Active Chats"
          value={stats?.active_conversations || 0}
          icon={ChatBubbleLeftRightIcon}
          color="green"
          href="/dashboard/conversations"
        />
        <StatCard
          title="Knowledge Base"
          value={stats?.knowledge_base_entries || 0}
          icon={BookOpenIcon}
          color="purple"
          href="/dashboard/knowledge-base"
        />
        <StatCard
          title="Avg Conversation"
          value={stats?.avg_conversation_length ? `${Math.round(stats.avg_conversation_length)} turns` : '0 turns'}
          icon={ArrowTrendingUpIcon}
          color="orange"
          href="/dashboard/conversations"
        />
      </div>

      {/* Quick Demo Setup — prominent when KB is empty */}
      {!hasKb && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <RocketLaunchIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Demo Setup</h3>
              <p className="text-sm text-gray-600">Configure branding and import website content in one click</p>
            </div>
          </div>

          {!showDemoSetup ? (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDemoSetup(true)}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Set Up for a Company
              </button>
              <Link
                href="/dashboard/knowledge-base"
                className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-lg transition-colors"
              >
                Manual Setup
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={demoForm.company_name}
                    onChange={(e) => setDemoForm({ ...demoForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g. ENNIA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={demoForm.company_website}
                    onChange={(e) => setDemoForm({ ...demoForm, company_website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://www.ennia.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={demoForm.primary_color}
                      onChange={(e) => setDemoForm({ ...demoForm, primary_color: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={demoForm.primary_color}
                      onChange={(e) => setDemoForm({ ...demoForm, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDemoSetup}
                  disabled={demoLoading || !demoForm.company_name || !demoForm.company_website}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {demoLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Setting up... (crawling website)
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon className="w-4 h-4" />
                      Configure &amp; Crawl Website
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDemoSetup(false)}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
              {demoResult && (
                <div className={`p-3 rounded-lg text-sm ${demoResult.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {demoResult}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State for existing users */}
      {hasKb && stats && stats.leads_today === 0 && stats.active_conversations === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Ready to Go</h3>
          <p className="text-blue-700 mb-4">
            Your knowledge base has {stats.knowledge_base_entries} entries. Test the chat or share the widget with customers.
          </p>
          <div className="flex gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Test Chat Assistant
            </Link>
            <Link
              href="/dashboard/deploy"
              className="px-4 py-2 bg-white hover:bg-gray-50 text-blue-700 border border-blue-300 font-medium rounded-lg transition-colors"
            >
              Deploy Widget
            </Link>
          </div>
        </div>
      )}

      {/* Language Distribution + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Language Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <GlobeAltIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Language Distribution</h2>
          </div>
          {totalConversations > 0 ? (
            <div className="space-y-3">
              {Object.entries(langDist)
                .sort(([, a], [, b]) => b - a)
                .map(([lang, count]) => {
                  const pct = Math.round((count / totalConversations) * 100)
                  const info = LANG_LABELS[lang] || { label: lang, color: 'bg-gray-400' }
                  return (
                    <div key={lang}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{info.label}</span>
                        <span className="text-sm text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${info.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              <p className="text-xs text-gray-400 mt-2">{totalConversations} total conversations</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-4">No conversations yet. Language breakdown will appear here once customers start chatting.</p>
          )}
        </div>

        {/* Quick Actions + CRM */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <ActionButton href="/dashboard/conversations" label="View All Conversations" />
              <ActionButton href="/dashboard/leads?status=new" label="New Leads" />
              <ActionButton href="/dashboard/tickets" label="Service Desk Tickets" />
              <ActionButton href="/dashboard/knowledge-base" label="Manage Knowledge Base" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">CRM Sync Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Mailchimp</span>
                <span className="text-green-600 font-semibold">
                  {stats?.mailchimp_synced || 0} synced
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">HubSpot</span>
                <span className="text-blue-600 font-semibold">
                  {stats?.hubspot_synced || 0} synced
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
          <Link href="/dashboard/leads" className="text-sm text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>
        {recentLeads.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{lead.name}</div>
                  <div className="text-sm text-gray-500">{lead.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleString()}
                  </div>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    lead.status === 'new' ? 'bg-green-100 text-green-800' :
                    lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No leads yet today
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  href 
}: { 
  title: string
  value: string | number
  icon: any
  color: string
  href: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600 mt-1">{title}</div>
      </div>
    </Link>
  )
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block w-full text-left px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700"
    >
      {label}
    </Link>
  )
}


