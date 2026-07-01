/**
 * Default insurance form templates for tenant onboarding.
 */

export interface FormField {
  key: string
  label: string
  question: string
  type: 'text' | 'email' | 'phone' | 'date' | 'textarea' | 'select'
  options?: string[]
}

export interface InsuranceFormTemplate {
  name: string
  description: string
  fields: FormField[]
  form_mode: 'inline' | 'conversational'
  use_mode: 'inline' | 'link' | 'disabled'
}

export const INSURANCE_FORM_TEMPLATES: InsuranceFormTemplate[] = [
  {
    name: 'Claim Intake',
    description: 'Report an insurance claim, accident, or damage incident',
    form_mode: 'conversational',
    use_mode: 'inline',
    fields: [
      { key: 'name', label: 'Full Name', question: 'What is your full name?', type: 'text' },
      { key: 'email', label: 'Email', question: 'What is your email address?', type: 'email' },
      { key: 'phone', label: 'Phone', question: 'What is your phone number?', type: 'phone' },
      { key: 'policy_number', label: 'Policy Number', question: 'What is your policy number?', type: 'text' },
      { key: 'incident_date', label: 'Incident Date', question: 'When did the incident occur?', type: 'date' },
      { key: 'description', label: 'Description', question: 'Please describe what happened.', type: 'textarea' },
    ],
  },
  {
    name: 'New Policy Quote',
    description: 'Request a quote or register for a new insurance policy',
    form_mode: 'conversational',
    use_mode: 'inline',
    fields: [
      { key: 'name', label: 'Full Name', question: 'What is your full name?', type: 'text' },
      { key: 'email', label: 'Email', question: 'What is your email address?', type: 'email' },
      { key: 'product_type', label: 'Product Type', question: 'Which type of insurance are you interested in?', type: 'select', options: ['Auto', 'Home', 'Health', 'Life', 'Business', 'Other'] },
      { key: 'contact_preference', label: 'Contact Preference', question: 'How would you prefer to be contacted?', type: 'select', options: ['Email', 'Phone', 'WhatsApp'] },
    ],
  },
  {
    name: 'Policy Change Request',
    description: 'Request a change to an existing policy',
    form_mode: 'conversational',
    use_mode: 'inline',
    fields: [
      { key: 'name', label: 'Full Name', question: 'What is your full name?', type: 'text' },
      { key: 'email', label: 'Email', question: 'What is your email address?', type: 'email' },
      { key: 'policy_number', label: 'Policy Number', question: 'What is your policy number?', type: 'text' },
      { key: 'change_type', label: 'Change Type', question: 'What type of change do you need?', type: 'select', options: ['Coverage update', 'Beneficiary change', 'Address change', 'Cancel policy', 'Other'] },
      { key: 'details', label: 'Details', question: 'Please describe the change you need.', type: 'textarea' },
    ],
  },
]

export function inferDepartmentFromFormName(formName: string): 'claims' | 'sales' | 'billing' | 'support' {
  const lower = formName.toLowerCase()
  if (lower.includes('claim') || lower.includes('accident') || lower.includes('damage')) return 'claims'
  if (lower.includes('quote') || lower.includes('register') || lower.includes('new policy') || lower.includes('buy')) return 'sales'
  if (lower.includes('billing') || lower.includes('payment')) return 'billing'
  return 'support'
}
