/**
 * Unified escalation dispatch: conversation update, notification, email, event log.
 */

import { getSupabaseAdmin } from '@/lib/supabase'
import type { Department, Priority } from '@/lib/customer-matching'
import { buildEscalationContext } from '@/lib/customer-matching'
import { createEscalationNotification } from '@/lib/notifications'
import { notifyDepartmentRouting } from '@/lib/email'
import { getDepartmentEmail, getRoutingConfig } from '@/lib/routing-config'

export interface DispatchEscalationParams {
  tenantId: string
  conversationId: string
  leadId: string
  department: Department
  priority: Priority
  reason: string
  messages: { role: string; content: string }[]
  customerVerified: boolean
  /** Skip if already escalated for same reason this session */
  force?: boolean
}

export interface DispatchEscalationResult {
  escalated: boolean
  alreadyEscalated?: boolean
}

export async function dispatchEscalation(
  params: DispatchEscalationParams
): Promise<DispatchEscalationResult> {
  const supabaseAdmin = getSupabaseAdmin()
  const {
    tenantId,
    conversationId,
    leadId,
    department,
    priority,
    reason,
    messages,
    customerVerified,
  } = params

  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('status, routing_reason')
    .eq('id', conversationId)
    .single()

  if (
    conversation?.status === 'escalated' &&
    conversation.routing_reason === reason &&
    !params.force
  ) {
    return { escalated: false, alreadyEscalated: true }
  }

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('name, email, phone, lead_score, policy_number, account_number, metadata')
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
    .single()

  if (!lead) {
    console.warn('[ESCALATION] Lead not found:', leadId)
    return { escalated: false }
  }

  const minScore = priority === 'urgent' ? 90 : priority === 'high' ? 80 : 70
  const newScore = Math.max(minScore, lead.lead_score || 0)

  await supabaseAdmin
    .from('conversations')
    .update({
      status: 'escalated',
      department,
      priority,
      routing_reason: reason,
      routed_at: new Date().toISOString(),
      customer_verified: customerVerified || undefined,
    })
    .eq('id', conversationId)

  await supabaseAdmin
    .from('leads')
    .update({ lead_score: newScore })
    .eq('tenant_id', tenantId)
    .eq('id', leadId)

  const escalation = buildEscalationContext(
    lead,
    messages,
    department,
    priority,
    customerVerified
  )

  const routingConfig = await getRoutingConfig(tenantId)
  const deptEmail = getDepartmentEmail(routingConfig, department)

  const recentMessages = messages
    .slice(-5)
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n')

  const policyInfo = lead.policy_number ? `\nPolicy #: ${lead.policy_number}` : ''
  const accountInfo = lead.account_number ? `\nAccount #: ${lead.account_number}` : ''

  const conversationContext = `Department: ${department.toUpperCase()}
Priority: ${priority.toUpperCase()}
Reason: ${reason}
Customer verified: ${customerVerified ? 'Yes' : 'No'}${policyInfo}${accountInfo}

Recent conversation:
${recentMessages}`

  await createEscalationNotification({
    tenantId,
    conversationId,
    department,
    priority,
    leadName: lead.name || 'Unknown',
    leadEmail: lead.email || '',
    reason,
    metadata: { ...escalation, leadId },
  })

  await notifyDepartmentRouting({
    department,
    priority,
    leadName: lead.name || 'Unknown',
    leadEmail: lead.email || '',
    leadPhone: lead.phone || null,
    policyNumber: lead.policy_number || null,
    conversationContext,
    conversationId,
    leadId,
    departmentEmail: deptEmail,
    reason,
  })

  try {
    await supabaseAdmin.from('event_logs').insert({
      tenant_id: tenantId,
      lead_id: leadId,
      event_type: 'department_routed',
      metadata: {
        department,
        priority,
        reason,
        customerVerified,
        conversationId,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[ESCALATION] Failed to log event:', err)
  }

  console.log('[ESCALATION] Dispatched:', { conversationId, department, priority, reason })
  return { escalated: true }
}
