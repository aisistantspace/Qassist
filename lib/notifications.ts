import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'

export type NotificationType = 'form_submission' | 'lead_capture' | 'system' | 'escalation' | 'department_routing'

export interface CreateNotificationParams {
  type: NotificationType
  title: string
  message?: string
  metadata?: Record<string, unknown>
  tenantId?: string
  department?: string
  conversationId?: string
}

/**
 * Create a notification in the database
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const tenantId = params.tenantId ?? DEFAULT_TENANT_ID
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        tenant_id: tenantId,
        type: params.type,
        title: params.title,
        message: params.message || null,
        metadata: params.metadata || {},
        department: params.department || null,
        conversation_id: params.conversationId || null,
        is_read: false
      })

    if (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to create notification:', error)
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create a notification for a form submission
 */
export async function createFormSubmissionNotification(
  formName: string,
  leadName?: string,
  leadEmail?: string,
  formId?: string,
  submissionId?: string,
  tenantId?: string
): Promise<void> {
  const submitterInfo = leadName 
    ? `${leadName}${leadEmail ? ` (${leadEmail})` : ''}`
    : leadEmail || 'Unknown user'

  await createNotification({
    type: 'form_submission',
    title: `New submission: ${formName}`,
    message: `Form submitted by ${submitterInfo}`,
    metadata: {
      formId,
      formName,
      submissionId,
      leadName,
      leadEmail,
      submittedAt: new Date().toISOString()
    },
    tenantId,
  })
}

/**
 * Create a notification for a new lead capture
 */
export async function createLeadCaptureNotification(
  leadName?: string,
  leadEmail?: string,
  leadId?: string,
  source?: string
): Promise<void> {
  const leadInfo = leadName || leadEmail || 'Unknown'

  await createNotification({
    type: 'lead_capture',
    title: `New lead: ${leadInfo}`,
    message: source ? `Captured from ${source}` : 'New lead captured',
    metadata: {
      leadId,
      leadName,
      leadEmail,
      source,
      capturedAt: new Date().toISOString()
    }
  })
}

/**
 * Create a system notification
 */
export async function createSystemNotification(
  title: string,
  message?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createNotification({
    type: 'system',
    title,
    message,
    metadata
  })
}

export async function createEscalationNotification(params: {
  tenantId: string
  conversationId: string
  department: string
  priority: string
  leadName: string
  leadEmail: string
  reason: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const prefix =
    params.priority === 'urgent' ? 'URGENT: ' :
    params.priority === 'high' ? 'HIGH: ' : ''

  await createNotification({
    type: 'escalation',
    title: `${prefix}${params.department.charAt(0).toUpperCase() + params.department.slice(1)} — ${params.reason}`,
    message: `${params.leadName}${params.leadEmail ? ` (${params.leadEmail})` : ''} needs attention.`,
    metadata: params.metadata,
    tenantId: params.tenantId,
    department: params.department,
    conversationId: params.conversationId,
  })
}
