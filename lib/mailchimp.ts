import mailchimp from '@mailchimp/mailchimp_marketing'
import { getSupabaseAdmin } from './supabase'

async function getMailchimpConfig() {
  const supabaseAdmin = getSupabaseAdmin()
  const { data } = await supabaseAdmin
    .from('integration_config')
    .select('mailchimp_api_key, mailchimp_server_prefix, mailchimp_audience_id, mailchimp_enabled')
    .limit(1)
    .maybeSingle()

  return {
    apiKey: data?.mailchimp_api_key || process.env.MAILCHIMP_API_KEY,
    server: data?.mailchimp_server_prefix || process.env.MAILCHIMP_SERVER_PREFIX,
    audienceId: data?.mailchimp_audience_id || process.env.MAILCHIMP_AUDIENCE_ID,
    enabled: data?.mailchimp_enabled ?? true
  }
}

export interface MailchimpContact {
  email: string
  name?: string
  phone?: string
  tags?: string[]
  sourcePage?: string
  utmParams?: Record<string, string>
}

export async function addContactToMailchimp(contact: MailchimpContact) {
  const config = await getMailchimpConfig()
  
  if (!config.apiKey || !config.server || !config.audienceId || !config.enabled) {
    console.log('Mailchimp not configured or disabled, skipping sync')
    return { success: false, error: 'Not configured' }
  }

  mailchimp.setConfig({
    apiKey: config.apiKey,
    server: config.server,
  })

  try {
    const response = await mailchimp.lists.addListMember(config.audienceId, {
      email_address: contact.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: contact.name?.split(' ')[0] || '',
        LNAME: contact.name?.split(' ').slice(1).join(' ') || '',
        PHONE: contact.phone || '',
        SOURCE: contact.sourcePage || '',
        UTM_SOURCE: contact.utmParams?.utm_source || '',
        UTM_CAMPAIGN: contact.utmParams?.utm_campaign || '',
        UTM_MEDIUM: contact.utmParams?.utm_medium || '',
      },
      tags: contact.tags || [],
    })
    return { success: true, data: response }
  } catch (error: any) {
    // If contact already exists, update tags
    if (error.status === 400 && error.response?.body?.title === 'Member Exists') {
      try {
        const subscriberHash = require('crypto')
          .createHash('md5')
          .update(contact.email.toLowerCase())
          .digest('hex')

        if (contact.tags && contact.tags.length > 0) {
          await mailchimp.lists.updateListMemberTags(config.audienceId, subscriberHash, {
            tags: contact.tags.map(tag => ({ name: tag, status: 'active' })),
          })
        }
        return { success: true, existed: true }
      } catch (updateError) {
        console.error('Error updating existing contact:', updateError)
        return { success: false, error: updateError }
      }
    }
    console.error('Error adding contact to Mailchimp:', error)
    return { success: false, error }
  }
}

export default mailchimp



