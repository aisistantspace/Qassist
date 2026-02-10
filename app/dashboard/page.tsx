'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  CalendarIcon,
  ArrowTrendingUpIcon 
} from '@heroicons/react/24/outline'

interface DashboardStats {
  leads_today: number
  active_conversations: number
  booking_requests_week: number
  mailchimp_synced: number
  hubspot_synced: number
  avg_conversation_length: number
}

interface RecentLead {
  id: string
  name: string
  email: string
  created_at: string
  status: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
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
          title="Booking Requests (7d)"
          value={stats?.booking_requests_week || 0}
          icon={CalendarIcon}
          color="purple"
          href="/dashboard/conversations?status=escalated"
        />
        <StatCard
          title="Avg Conversation Length"
          value={stats?.avg_conversation_length ? `${Math.round(stats.avg_conversation_length)} turns` : '0 turns'}
          icon={ArrowTrendingUpIcon}
          color="orange"
          href="/dashboard/conversations"
        />
      </div>

      {/* Empty State Message */}
      {stats && stats.leads_today === 0 && stats.active_conversations === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
          <p className="text-blue-700 mb-4">
            Your dashboard is ready! Start by testing the chat assistant or uploading content to your knowledge base.
          </p>
          <div className="flex gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Test Chat Assistant
            </Link>
            <Link
              href="/dashboard/knowledge-base"
              className="px-4 py-2 bg-white hover:bg-gray-50 text-blue-700 border border-blue-300 font-medium rounded-lg transition-colors"
            >
              Add Knowledge Base Content
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <ActionButton href="/dashboard/conversations" label="View All Conversations" />
            <ActionButton href="/dashboard/leads?status=new" label="New Leads" />
            <ActionButton href="/admin/knowledge-base" label="Add Content" />
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


