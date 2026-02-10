/**
 * Email notification utilities
 * Sends email notifications to admin/notification recipient when important events occur
 */

import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from './supabase'

interface EmailNotification {
  to: string
  subject: string
  body: string
}

interface SMTPConfig {
  host: string | null
  port: number | null
  user: string | null
  password: string | null
  fromEmail: string | null
  secure: boolean | null
  enabled: boolean | null
}

/**
 * Get SMTP configuration from database, with fallback to environment variables
 */
async function getSMTPConfig(): Promise<SMTPConfig> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin
      .from('integration_config')
      .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_secure, smtp_enabled')
      .limit(1)
      .maybeSingle()

    return {
      host: data?.smtp_host || process.env.SMTP_HOST || null,
      port: data?.smtp_port || parseInt(process.env.SMTP_PORT || '587') || null,
      user: data?.smtp_user || process.env.SMTP_USER || null,
      password: data?.smtp_password || process.env.SMTP_PASSWORD || null,
      fromEmail: data?.smtp_from_email || process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || null,
      secure: data?.smtp_secure ?? (process.env.SMTP_SECURE === 'true' || false),
      enabled: data?.smtp_enabled ?? (!!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD),
    }
  } catch (error) {
    console.error('Error fetching SMTP config from database:', error)
    // Fallback to environment variables
    return {
      host: process.env.SMTP_HOST || null,
      port: parseInt(process.env.SMTP_PORT || '587') || null,
      user: process.env.SMTP_USER || null,
      password: process.env.SMTP_PASSWORD || null,
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.FROM_EMAIL || null,
      secure: process.env.SMTP_SECURE === 'true' || false,
      enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    }
  }
}

/**
 * Get notification recipient email from database or environment variables
 */
async function getNotificationRecipientEmail(): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin
      .from('integration_config')
      .select('notification_recipient_email')
      .limit(1)
      .maybeSingle()

    return data?.notification_recipient_email || process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL || null
  } catch (error) {
    console.error('Error fetching notification recipient email from database:', error)
    return process.env.ADMIN_EMAIL || process.env.NOTIFICATION_EMAIL || null
  }
}

/**
 * Send email notification to admin/notification recipient
 * Priority: Resend > SendGrid > SMTP (database) > SMTP (env vars) > Log
 */
export async function sendEmailNotification(notification: EmailNotification): Promise<{ success: boolean; error?: string }> {
  if (!notification.to) {
    console.warn('No recipient email provided, logging notification instead:', notification)
    console.log('Email notification:', notification)
    return { success: false, error: 'No recipient email provided' }
  }

  try {
    // Option 1: Use Resend (if configured)
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'noreply@livinginparadise.nl',
          to: notification.to,
          subject: notification.subject,
          html: notification.body.replace(/\n/g, '<br>'),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send email')
      }

      return { success: true }
    }

    // Option 2: Use SendGrid (if configured)
    if (process.env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: notification.to }],
            subject: notification.subject,
          }],
          from: { email: process.env.FROM_EMAIL || 'noreply@livinginparadise.nl' },
          content: [{
            type: 'text/html',
            value: notification.body.replace(/\n/g, '<br>'),
          }],
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to send email')
      }

      return { success: true }
    }

    // Option 3: Use SMTP (from database or environment variables)
    const smtpConfig = await getSMTPConfig()
    
    if (smtpConfig.enabled && smtpConfig.host && smtpConfig.user && smtpConfig.password) {
      try {
        const smtpPort = smtpConfig.port || 587
        const isSecure = smtpConfig.secure || smtpPort === 465
        
        const transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpPort,
          secure: isSecure, // true for 465, false for other ports
          auth: {
            user: smtpConfig.user,
            pass: smtpConfig.password,
          },
          // For TLS on port 587
          ...(smtpPort === 587 && !isSecure && {
            requireTLS: true,
            tls: {
              rejectUnauthorized: false, // Allow self-signed certificates if needed
            },
          }),
        })

        const fromEmail = smtpConfig.fromEmail || smtpConfig.user

        const mailOptions = {
          from: fromEmail,
          to: notification.to,
          subject: notification.subject,
          html: notification.body.replace(/\n/g, '<br>'),
        }

        await transporter.sendMail(mailOptions)
        return { success: true }
      } catch (smtpError: any) {
        console.error('SMTP error:', smtpError.message)
        // Don't throw, fall through to logging
      }
    }

    // Fallback: Log the notification (can be extended with other services)
    console.log('Email notification (no service configured):', {
      to: notification.to,
      subject: notification.subject,
      body: notification.body,
    })

    return { success: false, error: 'No email service configured' }
  } catch (error: any) {
    console.error('Error sending email notification:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Send form submission by email to configured recipients (e.g. external business/person).
 * Used when a form is completed and email_automation_enabled is true.
 */
export async function sendFormSubmissionEmail(
  formName: string,
  answers: Record<string, unknown>,
  recipientEmails: string,
  leadInfo?: { name?: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
  const toAddresses = recipientEmails.split(',').map(e => e.trim()).filter(Boolean)
  if (toAddresses.length === 0) {
    console.warn('No valid recipient emails for form submission:', formName)
    return { success: false, error: 'No recipient emails' }
  }

  const subject = `New form submission: ${formName}`
  const answersList = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
  const body = `
    <h2>Form: ${formName}</h2>
    <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
    ${leadInfo?.name || leadInfo?.email ? `<p><strong>From:</strong> ${[leadInfo.name, leadInfo.email].filter(Boolean).join(' / ')}</p>` : ''}
    <h3>Answers</h3>
    <pre>${answersList}</pre>
  `

  let lastError: string | undefined
  for (const to of toAddresses) {
    const result = await sendEmailNotification({ to, subject, body })
    if (!result.success) lastError = result.error
  }
  return lastError ? { success: false, error: lastError } : { success: true }
}

/**
 * Send a notification-only email when form is submitted (no form data included).
 * Used for alerting admins/internal staff without sharing sensitive data.
 */
export async function sendFormNotificationEmail(
  formName: string,
  recipientEmails: string,
  leadInfo?: { name?: string; email?: string },
  submittedAt?: Date
): Promise<{ success: boolean; error?: string }> {
  const toAddresses = recipientEmails.split(',').map(e => e.trim()).filter(Boolean)
  if (toAddresses.length === 0) {
    console.warn('No valid recipient emails for form notification:', formName)
    return { success: false, error: 'No recipient emails' }
  }

  const submitterInfo = leadInfo?.name 
    ? `${leadInfo.name}${leadInfo.email ? ` (${leadInfo.email})` : ''}`
    : leadInfo?.email || 'Unknown user'

  const subject = `New Form Submission - ${formName}`
  const body = `
    <h2>New Form Submission</h2>
    <p>A new submission was received for "<strong>${formName}</strong>".</p>
    <p><strong>Submitted by:</strong> ${submitterInfo}</p>
    <p><strong>Date:</strong> ${(submittedAt || new Date()).toLocaleString()}</p>
    <hr>
    <p><em>View details in your dashboard.</em></p>
  `

  let lastError: string | undefined
  for (const to of toAddresses) {
    const result = await sendEmailNotification({ to, subject, body })
    if (!result.success) lastError = result.error
  }
  return lastError ? { success: false, error: lastError } : { success: true }
}

/**
 * Send notification when a lead requests human contact
 */
export async function notifyHumanContactRequest(
  leadName: string,
  leadEmail: string,
  leadPhone: string | null,
  conversationContext: string,
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  const subject = `🔥 HOT LEAD: ${leadName} Requested Human Contact`
  
  const body = `
    <h2>New Human Contact Request</h2>
    <p><strong>Lead Name:</strong> ${leadName}</p>
    <p><strong>Email:</strong> ${leadEmail}</p>
    ${leadPhone ? `<p><strong>Phone:</strong> ${leadPhone}</p>` : ''}
    <p><strong>Lead ID:</strong> ${leadId}</p>
    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
    
    <h3>Conversation Context:</h3>
    <p>${conversationContext}</p>
    
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://astute-ai-assistant.vercel.app'}/dashboard/leads/${leadId}">View Lead Details</a></p>
    
    <p><em>This lead has been automatically marked as HOT and requires immediate attention.</em></p>
  `

  const recipientEmail = await getNotificationRecipientEmail()
  
  if (!recipientEmail) {
    console.error('No notification recipient email configured')
    return { success: false, error: 'No notification recipient email configured' }
  }

  return sendEmailNotification({
    to: recipientEmail,
    subject,
    body,
  })
}
