'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface BrandingConfig {
  company_name: string
  company_description: string
  company_website: string
  company_phone: string
  company_email: string
  widget_title: string
  widget_subtitle: string
  welcome_message: string
  primary_color: string
  logo_url: string
  favicon_url: string
  default_language: string
  enable_lead_capture: boolean
  lead_capture_fields: string[]
  booking_url: string
  booking_cta_text: string
  enable_booking_cta: boolean
  agent_name: string
  agent_avatar_url: string
  developer_branding_enabled: boolean
}

interface IntegrationConfig {
  mailchimp_api_key: string
  mailchimp_server_prefix: string
  mailchimp_audience_id: string
  mailchimp_enabled: boolean
  hubspot_access_token: string
  hubspot_enabled: boolean
  whatsapp_phone_number_id: string
  whatsapp_business_account_id: string
  whatsapp_access_token: string
  whatsapp_verify_token: string
  whatsapp_enabled: boolean
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_from_email: string
  smtp_secure: boolean
  smtp_enabled: boolean
  notification_recipient_email: string
  department_routing?: Record<string, { email: string; url: string; auto_route: boolean }>
  customer_lookup_config?: {
    enabled: boolean
    api_url: string
    method: 'GET' | 'POST'
    auth_header: string
    auth_value: string
    request_field: 'email' | 'policy_number' | 'account_number' | 'phone'
    response_name_field: string
    response_policy_field: string
    response_status_field?: string
    timeout_ms: number
  }
  routing_rules?: {
    auto_route_claims: boolean
    auto_route_sales_registration: boolean
    auto_route_billing_urgent: boolean
    knowledge_gap_route: boolean
  }
}

const defaultDepartmentRouting: Record<string, { email: string; url: string; auto_route: boolean }> = {
  claims: { email: '', url: '', auto_route: true },
  support: { email: '', url: '', auto_route: false },
  sales: { email: '', url: '', auto_route: false },
  billing: { email: '', url: '', auto_route: true },
  general: { email: '', url: '', auto_route: false },
}

const defaultCustomerLookup = {
  enabled: false,
  api_url: '',
  method: 'POST' as const,
  auth_header: 'Authorization',
  auth_value: '',
  request_field: 'email' as const,
  response_name_field: 'name',
  response_policy_field: 'policy_number',
  response_status_field: 'status',
  timeout_ms: 5000,
}

const defaultRoutingRules = {
  auto_route_claims: true,
  auto_route_sales_registration: false,
  auto_route_billing_urgent: true,
  knowledge_gap_route: false,
}

interface WidgetConfig {
  theme: string
  primary_color: string
  position: string
  initial_state: string
  initial_messages: string[]
  suggested_messages: string[]
  placeholder_text: string
  notice_text: string
  disclaimer_text: string
  chat_icon_url: string
  bubble_text?: string | null
  bubble_position?: string
}

interface LeadScoringWeights {
  conversation_length: { multiplier: number; cap: number }
  booking_clicks: { multiplier: number; cap: number }
  case_specific_queries: { multiplier: number; cap: number }
  time_spent: { multiplier: number; cap: number }
  return_visits: { multiplier: number; cap: number }
}

interface LeadScoringConfig {
  hot_threshold: number
  warm_threshold: number
  include_human_contact_requests: boolean
  weights: LeadScoringWeights
  ai_filtering_instructions: string
}

const defaultLeadScoringConfig: LeadScoringConfig = {
  hot_threshold: 70,
  warm_threshold: 40,
  include_human_contact_requests: true,
  weights: {
    conversation_length: { multiplier: 3, cap: 25 },
    booking_clicks: { multiplier: 15, cap: 30 },
    case_specific_queries: { multiplier: 10, cap: 20 },
    time_spent: { multiplier: 2, cap: 15 },
    return_visits: { multiplier: 5, cap: 10 },
  },
  ai_filtering_instructions: '',
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'branding' | 'agent' | 'widget' | 'integrations' | 'routing' | 'lead-scoring' | 'papiamentu'>('branding')
  const [papiamentuLearning, setPapiamentuLearning] = useState(false)
  const [papiamentuLocale, setPapiamentuLocale] = useState<'pap-CW' | 'pap-AW'>('pap-CW')
  
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    theme: 'light',
    primary_color: '#3B82F6',
    position: 'bottom-right',
    initial_state: 'minimized',
    initial_messages: ['Hi! 👋 How can I help you today?'],
    suggested_messages: [],
    placeholder_text: 'Type your message...',
    notice_text: '',
    disclaimer_text: '',
    chat_icon_url: '',
    bubble_text: null,
    bubble_position: 'left',
  })

  const [branding, setBranding] = useState<BrandingConfig>({
    company_name: '',
    company_description: '',
    company_website: '',
    company_phone: '',
    company_email: '',
    widget_title: '',
    widget_subtitle: '',
    welcome_message: '',
    primary_color: '#3B82F6',
    logo_url: '',
    favicon_url: '',
    default_language: 'EN',
    enable_lead_capture: true,
    lead_capture_fields: ['name', 'email'],
    booking_url: '',
    booking_cta_text: '',
    enable_booking_cta: false,
    agent_name: 'Assistant',
    agent_avatar_url: '',
    developer_branding_enabled: true,
  })

  const [integrations, setIntegrations] = useState<IntegrationConfig>({
    mailchimp_api_key: '',
    mailchimp_server_prefix: '',
    mailchimp_audience_id: '',
    mailchimp_enabled: false,
    hubspot_access_token: '',
    hubspot_enabled: false,
    whatsapp_phone_number_id: '',
    whatsapp_business_account_id: '',
    whatsapp_access_token: '',
    whatsapp_verify_token: '',
    whatsapp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_secure: false,
    smtp_enabled: false,
    notification_recipient_email: '',
    department_routing: defaultDepartmentRouting,
    customer_lookup_config: defaultCustomerLookup,
    routing_rules: defaultRoutingRules,
  })
  const [lookupTestValue, setLookupTestValue] = useState('')
  const [lookupTestResult, setLookupTestResult] = useState<string | null>(null)
  const [lookupTesting, setLookupTesting] = useState(false)

  const [leadScoringConfig, setLeadScoringConfig] = useState<LeadScoringConfig>(defaultLeadScoringConfig)
  const [leadScoringWeightsOpen, setLeadScoringWeightsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [defaultFormMode, setDefaultFormMode] = useState<'conversational' | 'inline'>('conversational')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const [brandingRes, widgetRes, integrationsRes, agentRes, leadScoringRes] = await Promise.all([
        fetch('/api/settings/branding'),
        fetch('/api/settings/widget'),
        fetch('/api/settings/integrations'),
        fetch('/api/settings/agent'),
        fetch('/api/settings/lead-scoring'),
      ])

      if (brandingRes.ok) {
        const brandingData = await brandingRes.json()
        setBranding(brandingData)
      }

      if (widgetRes.ok) {
        const widgetData = await widgetRes.json()
        setWidgetConfig(widgetData)
      }

      if (integrationsRes.ok) {
        const integrationsData = await integrationsRes.json()
        setIntegrations({
          ...integrationsData,
          department_routing: Object.fromEntries(
            Object.entries(defaultDepartmentRouting).map(([dept, defaults]) => [
              dept,
              { ...defaults, ...(integrationsData.department_routing?.[dept] || {}) },
            ])
          ),
          customer_lookup_config: { ...defaultCustomerLookup, ...(integrationsData.customer_lookup_config || {}) },
          routing_rules: { ...defaultRoutingRules, ...(integrationsData.routing_rules || {}) },
        })
      }

      if (agentRes.ok) {
        const agentData = await agentRes.json()
        setDefaultFormMode(agentData.default_form_mode || 'conversational')
        if (agentData.papiamentu_locale) setPapiamentuLocale(agentData.papiamentu_locale)
        if (agentData.papiamentu_learning !== undefined) setPapiamentuLearning(agentData.papiamentu_learning)
      }

      if (leadScoringRes.ok) {
        const leadScoringData = await leadScoringRes.json()
        setLeadScoringConfig(leadScoringData)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      showMessage('error', 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSaveBranding = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save branding')
      }

      showMessage('success', 'Branding saved successfully!')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRouting = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_routing: integrations.department_routing,
          customer_lookup_config: integrations.customer_lookup_config,
          routing_rules: integrations.routing_rules,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save routing settings')
      }
      showMessage('success', 'Routing settings saved successfully!')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to save routing settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestCustomerLookup = async () => {
    setLookupTesting(true)
    setLookupTestResult(null)
    try {
      const res = await fetch('/api/settings/customer-lookup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_lookup_config: integrations.customer_lookup_config,
          test_value: lookupTestValue,
        }),
      })
      const data = await res.json()
      setLookupTestResult(data.success
        ? `Success (${data.status}): ${JSON.stringify(data.raw, null, 2)}`
        : `Failed: ${data.error || 'Unknown error'}`)
    } catch (error: any) {
      setLookupTestResult(`Error: ${error.message}`)
    } finally {
      setLookupTesting(false)
    }
  }

  const handleSaveIntegrations = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrations),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save integrations')
      }

      showMessage('success', 'Integrations saved successfully!')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to save integrations')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLeadScoring = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/lead-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadScoringConfig),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save lead scoring config')
      }

      const data = await res.json()
      setLeadScoringConfig(data)
      showMessage('success', 'Lead scoring settings saved.')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to save lead scoring settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWidget = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widgetConfig),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save widget settings')
      }

      const result = await res.json()
      // Update state with saved data to ensure consistency
      if (result.data) {
        setWidgetConfig(result.data)
      }

      showMessage('success', 'Widget settings saved successfully!')
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to save widget settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your platform and branding</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <XCircleIcon className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <nav className="flex gap-4 sm:gap-8 pb-2 min-w-0">
          {[
            { id: 'branding', label: 'Company Branding' },
            { id: 'agent', label: 'Agent Identity' },
            { id: 'widget', label: 'Widget Styles' },
            { id: 'integrations', label: 'Integrations' },
            { id: 'routing', label: 'Routing' },
            { id: 'lead-scoring', label: 'Lead scoring' },
            { id: 'papiamentu', label: 'Papiamentu' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Company Branding</h2>

          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={branding.company_name}
                onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Your Company Name"
              />
            </div>

            {/* Company Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Description
              </label>
              <textarea
                value={branding.company_description}
                onChange={(e) => setBranding({ ...branding, company_description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Brief description of your company (used in AI context)"
              />
            </div>

            {/* Logo & Favicon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={branding.logo_url}
                  onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favicon URL
                </label>
                <input
                  type="url"
                  value={branding.favicon_url}
                  onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  placeholder="https://example.com/favicon.ico"
                />
              </div>
            </div>

            {/* Developer Branding */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">White Label Settings</h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="dev-branding"
                  checked={branding.developer_branding_enabled}
                  onChange={(e) => setBranding({ ...branding, developer_branding_enabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="dev-branding" className="text-sm font-medium text-gray-700">
                  Show "Powered by Astute Web Agency" in widget
                </label>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveBranding}
              disabled={saving}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </div>
      )}

      {/* Agent Identity Tab */}
      {activeTab === 'agent' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Agent Identity</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={branding.agent_name}
                onChange={(e) => setBranding({ ...branding, agent_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="e.g. Assistant"
              />
              <p className="text-xs text-gray-500 mt-1">What the AI assistant calls itself.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Avatar URL
              </label>
              <input
                type="url"
                value={branding.agent_avatar_url}
                onChange={(e) => setBranding({ ...branding, agent_avatar_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="https://example.com/avatar.png"
              />
              <p className="text-xs text-gray-500 mt-1">Image URL for the AI's profile picture.</p>
              {branding.agent_avatar_url && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Preview:</p>
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                    <img 
                      src={branding.agent_avatar_url} 
                      alt="Agent avatar preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = '<span class="text-xs text-red-500">Invalid image</span>'
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveBranding}
              disabled={saving}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-medium"
            >
              {saving ? 'Saving...' : 'Save Agent Identity'}
            </button>
          </div>
        </div>
      )}


      {/* Widget Tab */}
      {activeTab === 'widget' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Widget Customization</h2>

          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <div className="flex gap-4">
                {['light', 'dark'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setWidgetConfig({ ...widgetConfig, theme: t })}
                    className={`px-6 py-3 rounded-lg border-2 font-medium capitalize ${
                      widgetConfig.theme === t
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={widgetConfig.primary_color}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, primary_color: e.target.value })}
                  className="h-12 w-24 rounded border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={widgetConfig.primary_color}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, primary_color: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Widget Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Widget Icon/Image URL
              </label>
              <input
                type="url"
                value={widgetConfig.chat_icon_url}
                onChange={(e) => setWidgetConfig({ ...widgetConfig, chat_icon_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="https://example.com/icon.png (leave empty for default chat icon)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom icon or image URL for the chat widget button. Recommended size: 32x32px or larger square image.
              </p>
              {widgetConfig.chat_icon_url && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Preview:</p>
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                    <img 
                      src={widgetConfig.chat_icon_url} 
                      alt="Widget icon preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = '<span class="text-xs text-red-500">Invalid image</span>'
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bubble Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bubble Text (Optional)
              </label>
              <input
                type="text"
                value={widgetConfig.bubble_text || ''}
                onChange={(e) => setWidgetConfig({ ...widgetConfig, bubble_text: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="e.g., Chat with us now!"
              />
              <p className="text-xs text-gray-500 mt-1">
                Text to show in a dismissible bubble next to the chat button. Leave empty to hide the bubble.
              </p>
            </div>

            {/* Bubble Position */}
            {widgetConfig.bubble_text && widgetConfig.bubble_text.trim() !== '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bubble Position
                </label>
                <p className="text-xs text-gray-500 mb-3">Where should the text bubble appear relative to the chat button?</p>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="bubble_position"
                      value="left"
                      checked={widgetConfig.bubble_position === 'left'}
                      onChange={(e) => setWidgetConfig({ ...widgetConfig, bubble_position: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">Left</div>
                      <div className="text-xs text-gray-500">To the left of button</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="bubble_position"
                      value="top"
                      checked={widgetConfig.bubble_position === 'top'}
                      onChange={(e) => setWidgetConfig({ ...widgetConfig, bubble_position: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">Top</div>
                      <div className="text-xs text-gray-500">Above the button</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="bubble_position"
                      value="bottom"
                      checked={widgetConfig.bubble_position === 'bottom'}
                      onChange={(e) => setWidgetConfig({ ...widgetConfig, bubble_position: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">Bottom</div>
                      <div className="text-xs text-gray-500">Below the button</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="bubble_position"
                      value="right"
                      checked={widgetConfig.bubble_position === 'right'}
                      onChange={(e) => setWidgetConfig({ ...widgetConfig, bubble_position: e.target.value })}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">Right</div>
                      <div className="text-xs text-gray-500">To the right of button</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Initial Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <textarea
                value={branding.welcome_message}
                onChange={(e) => setBranding({ ...branding, welcome_message: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                placeholder="Hi! 👋 How can I help you today?"
              />
            </div>

            {/* Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Placeholder
              </label>
              <input
                type="text"
                value={widgetConfig.placeholder_text}
                onChange={(e) => setWidgetConfig({ ...widgetConfig, placeholder_text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Booking CTA */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Booking / Consultation</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enable-booking"
                    checked={branding.enable_booking_cta}
                    onChange={(e) => setBranding({ ...branding, enable_booking_cta: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="enable-booking" className="text-sm font-medium text-gray-700">
                    Enable booking CTA after conversation
                  </label>
                </div>

                {branding.enable_booking_cta && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Booking URL
                      </label>
                      <input
                        type="url"
                        value={branding.booking_url}
                        onChange={(e) => setBranding({ ...branding, booking_url: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                        placeholder="https://calendly.com/yourcompany"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CTA Button Text
                      </label>
                      <input
                        type="text"
                        value={branding.booking_cta_text}
                        onChange={(e) => setBranding({ ...branding, booking_cta_text: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
                        placeholder="Book a consultation"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveWidget}
              disabled={saving}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 font-medium"
            >
              {saving ? 'Saving...' : 'Save Widget Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Optional Integrations</h2>

          <div className="space-y-10">
            {/* Mailchimp */}
            <div className="border-b pb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Mailchimp</h3>
                  <p className="text-sm text-gray-600">Sync all captured leads to your audience.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">{integrations.mailchimp_enabled ? 'Enabled' : 'Disabled'}</span>
                  <input 
                    type="checkbox" 
                    checked={integrations.mailchimp_enabled} 
                    onChange={(e) => setIntegrations({ ...integrations, mailchimp_enabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">API Key</label>
                  <input
                    type="password"
                    value={integrations.mailchimp_api_key}
                    onChange={(e) => setIntegrations({ ...integrations, mailchimp_api_key: e.target.value })}
                    placeholder="e.g. 1234567890abcdef-us1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Server Prefix</label>
                    <input
                      type="text"
                      value={integrations.mailchimp_server_prefix}
                      onChange={(e) => setIntegrations({ ...integrations, mailchimp_server_prefix: e.target.value })}
                      placeholder="e.g. us1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Audience ID</label>
                    <input
                      type="text"
                      value={integrations.mailchimp_audience_id}
                      onChange={(e) => setIntegrations({ ...integrations, mailchimp_audience_id: e.target.value })}
                      placeholder="e.g. a1b2c3d4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* HubSpot */}
            <div className="border-b pb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">HubSpot CRM</h3>
                  <p className="text-sm text-gray-600">Sync qualified (high-intent) leads to CRM.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">{integrations.hubspot_enabled ? 'Enabled' : 'Disabled'}</span>
                  <input 
                    type="checkbox" 
                    checked={integrations.hubspot_enabled} 
                    onChange={(e) => setIntegrations({ ...integrations, hubspot_enabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </label>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Access Token</label>
                <input
                  type="password"
                  value={integrations.hubspot_access_token}
                  onChange={(e) => setIntegrations({ ...integrations, hubspot_access_token: e.target.value })}
                  placeholder="pat-na1-..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">WhatsApp Business (Meta)</h3>
                  <p className="text-sm text-gray-600">Enable multi-channel chat support.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">{integrations.whatsapp_enabled ? 'Enabled' : 'Disabled'}</span>
                  <input 
                    type="checkbox" 
                    checked={integrations.whatsapp_enabled} 
                    onChange={(e) => setIntegrations({ ...integrations, whatsapp_enabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={integrations.whatsapp_phone_number_id}
                    onChange={(e) => setIntegrations({ ...integrations, whatsapp_phone_number_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Business Account ID</label>
                  <input
                    type="text"
                    value={integrations.whatsapp_business_account_id}
                    onChange={(e) => setIntegrations({ ...integrations, whatsapp_business_account_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">System Access Token</label>
                  <input
                    type="password"
                    value={integrations.whatsapp_access_token}
                    onChange={(e) => setIntegrations({ ...integrations, whatsapp_access_token: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Webhook Verify Token</label>
                  <input
                    type="text"
                    value={integrations.whatsapp_verify_token}
                    onChange={(e) => setIntegrations({ ...integrations, whatsapp_verify_token: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* SMTP Email Configuration */}
            <div className="border-b pb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">SMTP Email (Internal Notifications)</h3>
                  <p className="text-sm text-gray-600">Configure SMTP for sending internal notifications (new leads, human contact requests, etc.)</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">{integrations.smtp_enabled ? 'Enabled' : 'Disabled'}</span>
                  <input 
                    type="checkbox" 
                    checked={integrations.smtp_enabled} 
                    onChange={(e) => setIntegrations({ ...integrations, smtp_enabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={integrations.smtp_host}
                    onChange={(e) => setIntegrations({ ...integrations, smtp_host: e.target.value })}
                    placeholder="e.g. smtp.gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={integrations.smtp_port || 587}
                    onChange={(e) => setIntegrations({ ...integrations, smtp_port: parseInt(e.target.value) || 587 })}
                    placeholder="587 (TLS) or 465 (SSL)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">587 for TLS, 465 for SSL</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SMTP User/Email</label>
                  <input
                    type="text"
                    value={integrations.smtp_user}
                    onChange={(e) => setIntegrations({ ...integrations, smtp_user: e.target.value })}
                    placeholder="your-email@yourdomain.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={integrations.smtp_password}
                    onChange={(e) => setIntegrations({ ...integrations, smtp_password: e.target.value })}
                    placeholder="Your email password or app password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Email (Optional)</label>
                  <input
                    type="text"
                    value={integrations.smtp_from_email}
                    onChange={(e) => setIntegrations({ ...integrations, smtp_from_email: e.target.value })}
                    placeholder="noreply@yourdomain.com (defaults to SMTP User)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notification Recipient Email</label>
                  <input
                    type="email"
                    value={integrations.notification_recipient_email}
                    onChange={(e) => setIntegrations({ ...integrations, notification_recipient_email: e.target.value })}
                    placeholder="admin@yourdomain.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email address to receive internal notifications</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={integrations.smtp_secure}
                    onChange={(e) => setIntegrations({ ...integrations, smtp_secure: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Use SSL (Secure Connection)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Enable for port 465, disable for port 587 (TLS)</p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveIntegrations}
              disabled={saving}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 font-medium shadow-sm transition-all"
            >
              {saving ? 'Saving...' : 'Save All Integrations'}
            </button>
          </div>
        </div>
      )}

      {/* Routing Tab */}
      {activeTab === 'routing' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-10">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-medium mb-1">Links + triggers live here</p>
            <p>
              Set a <strong>customer link</strong> per department (claim page, quote portal, contact form).
              Use <strong>auto-route</strong> and <strong>trigger rules</strong> below — these control backend escalation
              and are also injected into the AI agent so it knows when to share each link.
              Scroll down and click <strong>Save Routing Settings</strong> when done.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Department Routing</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure team email, customer-facing links, and auto-route rules per department.
            </p>
            <div className="space-y-4">
              {Object.entries(integrations.department_routing || defaultDepartmentRouting).map(([dept, config]) => (
                <div key={dept} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end border-b border-gray-100 pb-4">
                  <div className="font-medium text-gray-900 capitalize lg:col-span-1">{dept}</div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Team email</label>
                    <input
                      type="email"
                      value={config.email}
                      onChange={(e) => setIntegrations({
                        ...integrations,
                        department_routing: {
                          ...integrations.department_routing!,
                          [dept]: { ...config, email: e.target.value },
                        },
                      })}
                      placeholder={`${dept}@company.com`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Customer link (form, portal, store)</label>
                    <input
                      type="url"
                      value={config.url || ''}
                      onChange={(e) => setIntegrations({
                        ...integrations,
                        department_routing: {
                          ...integrations.department_routing!,
                          [dept]: { ...config, url: e.target.value },
                        },
                      })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 lg:col-span-5 lg:justify-end">
                    <input
                      type="checkbox"
                      checked={config.auto_route}
                      onChange={(e) => setIntegrations({
                        ...integrations,
                        department_routing: {
                          ...integrations.department_routing!,
                          [dept]: { ...config, auto_route: e.target.checked },
                        },
                      })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    Auto-route to this department
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Trigger rules</h2>
            <p className="text-sm text-gray-600 mb-4">
              When the bot detects these intents in chat, it escalates to the matching department (if auto-route is on) and sends the customer link when configured.
            </p>
            <div className="space-y-3">
              {([
                ['auto_route_claims', 'Auto-escalate claims (accidents, damage, claim keywords)'],
                ['auto_route_sales_registration', 'Auto-notify sales on registration intent'],
                ['auto_route_billing_urgent', 'Auto-escalate urgent billing issues'],
                ['knowledge_gap_route', 'Route to sales when registration intent + KB gap'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={integrations.routing_rules?.[key] ?? false}
                    onChange={(e) => setIntegrations({
                      ...integrations,
                      routing_rules: { ...integrations.routing_rules!, [key]: e.target.checked },
                    })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Customer Lookup API</h2>
            <p className="text-sm text-gray-600 mb-4">On-demand lookup against your core customer system (read-only).</p>
            <label className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={integrations.customer_lookup_config?.enabled ?? false}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: { ...integrations.customer_lookup_config!, enabled: e.target.checked },
                })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              Enable customer API lookup
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="url"
                value={integrations.customer_lookup_config?.api_url || ''}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: { ...integrations.customer_lookup_config!, api_url: e.target.value },
                })}
                placeholder="https://api.example.com/customers/lookup"
                className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
              <select
                value={integrations.customer_lookup_config?.method || 'POST'}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: { ...integrations.customer_lookup_config!, method: e.target.value as 'GET' | 'POST' },
                })}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
              <select
                value={integrations.customer_lookup_config?.request_field || 'email'}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: {
                    ...integrations.customer_lookup_config!,
                    request_field: e.target.value as 'email' | 'policy_number' | 'account_number' | 'phone',
                  },
                })}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              >
                <option value="email">Send email</option>
                <option value="policy_number">Send policy number</option>
                <option value="account_number">Send account number</option>
                <option value="phone">Send phone</option>
              </select>
              <input
                type="text"
                value={integrations.customer_lookup_config?.auth_header || ''}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: { ...integrations.customer_lookup_config!, auth_header: e.target.value },
                })}
                placeholder="Auth header (e.g. Authorization)"
                className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
              <input
                type="password"
                value={integrations.customer_lookup_config?.auth_value || ''}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: { ...integrations.customer_lookup_config!, auth_value: e.target.value },
                })}
                placeholder="Auth value / API key"
                className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
              <input
                type="text"
                value={integrations.customer_lookup_config?.response_name_field || 'name'}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: { ...integrations.customer_lookup_config!, response_name_field: e.target.value },
                })}
                placeholder="Response name field"
                className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
              <input
                type="text"
                value={integrations.customer_lookup_config?.response_policy_field || 'policy_number'}
                onChange={(e) => setIntegrations({
                  ...integrations,
                  customer_lookup_config: { ...integrations.customer_lookup_config!, response_policy_field: e.target.value },
                })}
                placeholder="Response policy field"
                className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={lookupTestValue}
                onChange={(e) => setLookupTestValue(e.target.value)}
                placeholder="Test value (email or policy#)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
              <button
                type="button"
                onClick={handleTestCustomerLookup}
                disabled={lookupTesting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
              >
                {lookupTesting ? 'Testing...' : 'Test API'}
              </button>
            </div>
            {lookupTestResult && (
              <pre className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-x-auto text-gray-800">{lookupTestResult}</pre>
            )}
          </div>

          <button
            onClick={handleSaveRouting}
            disabled={saving}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? 'Saving...' : 'Save Routing Settings'}
          </button>
        </div>
      )}

      {/* Lead scoring Tab */}
      {activeTab === 'lead-scoring' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Lead scoring</h2>
          <p className="text-sm text-gray-600 mb-6">
            Configure how leads are scored and which ones appear in Hot Leads. Same lead data is used for both Leads and Hot Leads; Hot Leads shows only those meeting your rules.
          </p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hot threshold (0–100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={leadScoringConfig.hot_threshold}
                  onChange={(e) =>
                    setLeadScoringConfig({
                      ...leadScoringConfig,
                      hot_threshold: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum score for a lead to appear in Hot Leads.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warm threshold (0–100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={leadScoringConfig.warm_threshold}
                  onChange={(e) =>
                    setLeadScoringConfig({
                      ...leadScoringConfig,
                      warm_threshold: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum score for warm category.</p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={leadScoringConfig.include_human_contact_requests}
                  onChange={(e) =>
                    setLeadScoringConfig({
                      ...leadScoringConfig,
                      include_human_contact_requests: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Always show in Hot Leads when someone requests human contact</span>
              </label>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setLeadScoringWeightsOpen(!leadScoringWeightsOpen)}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {leadScoringWeightsOpen ? 'Hide' : 'Show'} advanced weights
              </button>
              {leadScoringWeightsOpen && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
                  {(
                    [
                      { key: 'conversation_length', label: 'Conversation length', mult: 'multiplier', cap: 'cap' },
                      { key: 'booking_clicks', label: 'Booking clicks', mult: 'multiplier', cap: 'cap' },
                      { key: 'case_specific_queries', label: 'Case-specific queries', mult: 'multiplier', cap: 'cap' },
                      { key: 'time_spent', label: 'Time spent', mult: 'multiplier', cap: 'cap' },
                      { key: 'return_visits', label: 'Return visits', mult: 'multiplier', cap: 'cap' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key} className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{label} multiplier</label>
                        <input
                          type="number"
                          min={0}
                          value={leadScoringConfig.weights[key].multiplier}
                          onChange={(e) =>
                            setLeadScoringConfig({
                              ...leadScoringConfig,
                              weights: {
                                ...leadScoringConfig.weights,
                                [key]: {
                                  ...leadScoringConfig.weights[key],
                                  multiplier: Math.max(0, parseInt(e.target.value, 10) || 0),
                                },
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{label} cap</label>
                        <input
                          type="number"
                          min={0}
                          value={leadScoringConfig.weights[key].cap}
                          onChange={(e) =>
                            setLeadScoringConfig({
                              ...leadScoringConfig,
                              weights: {
                                ...leadScoringConfig.weights,
                                [key]: {
                                  ...leadScoringConfig.weights[key],
                                  cap: Math.max(0, parseInt(e.target.value, 10) || 0),
                                },
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI filtering instructions (optional)</label>
              <textarea
                value={leadScoringConfig.ai_filtering_instructions}
                onChange={(e) =>
                  setLeadScoringConfig({ ...leadScoringConfig, ai_filtering_instructions: e.target.value })
                }
                placeholder="e.g. Consider high-intent when the user asks about pricing, booking, or their specific case."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">Reserved for future use. Leave blank to use score and thresholds only.</p>
            </div>
          </div>

          <button
            onClick={handleSaveLeadScoring}
            disabled={saving}
            className="mt-6 w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? 'Saving...' : 'Save lead scoring settings'}
          </button>
        </div>
      )}

      {/* Papiamentu Tab */}
      {activeTab === 'papiamentu' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Papiamentu Correction Layer</h2>
              <p className="text-sm text-gray-500">Automatic language correction using Buki di Oro &amp; official Curaçao orthography</p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {/* Active status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Correction Layer is Active</p>
                <p className="text-xs text-green-700 mt-0.5">
                  All Papiamentu chat responses are automatically corrected before being sent to users. No action needed — this runs by default.
                </p>
              </div>
            </div>

            {/* Locale selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Locale / Variant</label>
              <select
                value={papiamentuLocale}
                onChange={(e) => setPapiamentuLocale(e.target.value as 'pap-CW' | 'pap-AW')}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="pap-CW">Curaçao (pap-CW) — Buki di Oro</option>
                <option value="pap-AW">Aruba (pap-AW)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Aruba variant words will be normalized to the selected locale.</p>
            </div>

            {/* Self-learning toggle */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Self-Learning Mode</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Log every correction to the database for manual review. View logged corrections in the{' '}
                    <a href="/dashboard/papiamentu" className="text-primary-600 hover:text-primary-700 font-medium">Papiamentu dashboard</a>.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">{papiamentuLearning ? 'Enabled' : 'Disabled'}</span>
                  <input
                    type="checkbox"
                    checked={papiamentuLearning}
                    onChange={(e) => setPapiamentuLearning(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </label>
              </div>
              {papiamentuLearning && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Self-learning requires the environment variable <code className="bg-amber-100 px-1 rounded text-[11px]">PAPIAMENTU_LEARNING_ENABLED=true</code> to be set on your server. Corrections will be saved to the <code className="bg-amber-100 px-1 rounded text-[11px]">papiamentu_corrections</code> table.
                  </p>
                </div>
              )}
            </div>

            {/* Save Papiamentu Settings */}
            <button
              onClick={async () => {
                setSaving(true)
                try {
                  const res = await fetch('/api/settings/agent', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ papiamentu_locale: papiamentuLocale, papiamentu_learning: papiamentuLearning }),
                  })
                  if (!res.ok) throw new Error('Failed to save')
                  showMessage('success', 'Papiamentu settings saved!')
                } catch {
                  showMessage('error', 'Failed to save Papiamentu settings')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Papiamentu Settings'}
            </button>

            {/* View Correction Log */}
            <a
              href="/dashboard/papiamentu"
              className="flex items-center justify-between p-4 border border-primary-200 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors group"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Correction Log</h3>
                <p className="text-xs text-gray-500 mt-0.5">View all logged corrections, stats, and filter by type</p>
              </div>
              <svg className="w-5 h-5 text-primary-600 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>

            {/* What gets corrected */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">What Gets Corrected</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Spelling</span>
                  </div>
                  <p className="text-xs text-gray-600">Words checked against the official Buki di Oro wordlist for correct Papiamentu spelling.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Orthography</span>
                  </div>
                  <p className="text-xs text-gray-600">Diacritics, capitalization, and official Curaçao orthography rules.</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Variant</span>
                  </div>
                  <p className="text-xs text-gray-600">Aruba ↔ Curaçao dialect differences normalized to your selected locale.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
