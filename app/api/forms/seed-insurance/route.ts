import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'
import { INSURANCE_FORM_TEMPLATES } from '@/lib/insurance-form-templates'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const tenantId = body.tenantId || DEFAULT_TENANT_ID

    const created: string[] = []
    const skipped: string[] = []

    for (const template of INSURANCE_FORM_TEMPLATES) {
      const { data: existing } = await supabaseAdmin
        .from('form_definitions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', template.name)
        .maybeSingle()

      if (existing) {
        skipped.push(template.name)
        continue
      }

      const { error } = await supabaseAdmin.from('form_definitions').insert({
        tenant_id: tenantId,
        name: template.name,
        description: template.description,
        fields: template.fields,
        is_active: true,
        form_mode: template.form_mode,
        use_mode: template.use_mode,
        enable_ai_response: false,
      })

      if (error) throw error
      created.push(template.name)
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `Created ${created.length} form(s), skipped ${skipped.length} existing.`,
    })
  } catch (error: unknown) {
    console.error('Error seeding insurance forms:', error)
    const message = error instanceof Error ? error.message : 'Failed to seed insurance forms'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
