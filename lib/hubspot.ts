import { getSupabaseAdmin } from './supabase'

const HUBSPOT_API_URL = 'https://api.hubapi.com'

async function getHubSpotConfig() {
  const supabaseAdmin = getSupabaseAdmin()
  const { data } = await supabaseAdmin
    .from('integration_config')
    .select('hubspot_access_token, hubspot_enabled')
    .limit(1)
    .maybeSingle()

  return {
    accessToken: data?.hubspot_access_token || process.env.HUBSPOT_ACCESS_TOKEN,
    enabled: data?.hubspot_enabled ?? true
  }
}

export interface HubSpotContact {
  email: string
  firstname?: string
  lastname?: string
  phone?: string
  lifecyclestage?: 'lead' | 'marketingqualifiedlead' | 'salesqualifiedlead'
  hs_lead_status?: string
}

export interface HubSpotDeal {
  dealname: string
  pipeline: string
  dealstage: string
  amount?: string
  closedate?: string
}

// Create or update contact in HubSpot
export async function createOrUpdateContact(contact: HubSpotContact) {
  const config = await getHubSpotConfig()
  
  if (!config.accessToken || !config.enabled) {
    console.log('HubSpot not configured or disabled, skipping sync')
    return { success: false, error: 'Not configured' }
  }

  try {
    const response = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        properties: contact,
      }),
    })

    if (!response.ok) {
      // If contact exists, update instead
      if (response.status === 409) {
        return await updateContactByEmail(contact, config.accessToken)
      }
      throw new Error(`HubSpot API error: ${response.statusText}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error creating contact in HubSpot:', error)
    return { success: false, error }
  }
}

// Update contact by email
async function updateContactByEmail(contact: HubSpotContact, token: string) {
  try {
    // First, search for contact by email
    const searchResponse = await fetch(
      `${HUBSPOT_API_URL}/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: contact.email,
                },
              ],
            },
          ],
        }),
      }
    )

    const searchData = await searchResponse.json()
    if (searchData.results && searchData.results.length > 0) {
      const contactId = searchData.results[0].id

      // Update the contact
      const updateResponse = await fetch(
        `${HUBSPOT_API_URL}/crm/v3/objects/contacts/${contactId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            properties: contact,
          }),
        }
      )

      const data = await updateResponse.json()
      return { success: true, data, updated: true }
    }

    return { success: false, error: 'Contact not found' }
  } catch (error) {
    console.error('Error updating contact in HubSpot:', error)
    return { success: false, error }
  }
}

// Create a deal in HubSpot (for booking requests)
export async function createDeal(deal: HubSpotDeal, contactEmail: string) {
  const config = await getHubSpotConfig()
  
  if (!config.accessToken || !config.enabled) {
    return { success: false, error: 'Not configured' }
  }

  try {
    // First get contact ID
    const searchResponse = await fetch(
      `${HUBSPOT_API_URL}/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: contactEmail,
                },
              ],
            },
          ],
        }),
      }
    )

    const searchData = await searchResponse.json()
    if (!searchData.results || searchData.results.length === 0) {
      throw new Error('Contact not found in HubSpot')
    }

    const contactId = searchData.results[0].id

    // Create deal
    const dealResponse = await fetch(`${HUBSPOT_API_URL}/crm/v3/objects/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        properties: deal,
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 3, // Deal to Contact association
              },
            ],
          },
        ],
      }),
    })

    const dealData = await dealResponse.json()
    return { success: true, data: dealData }
  } catch (error) {
    console.error('Error creating deal in HubSpot:', error)
    return { success: false, error }
  }
}



