import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { DEFAULT_TENANT_ID } from '@/lib/tenant'
import { INSURANCE_PA_KB_ENTRIES } from '@/lib/papiamentu/insurance-glossary'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json().catch(() => ({}))
    const tenantId = body.tenantId || DEFAULT_TENANT_ID
    const replace = body.replace === true

    if (replace) {
      for (const entry of INSURANCE_PA_KB_ENTRIES) {
        await supabaseAdmin
          .from('knowledge_base')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('title', entry.title)
          .eq('language', 'PA')
      }
    }

    let created = 0
    let skipped = 0

    for (const entry of INSURANCE_PA_KB_ENTRIES) {
      const { data: existing } = await supabaseAdmin
        .from('knowledge_base')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('title', entry.title)
        .eq('language', 'PA')
        .maybeSingle()

      if (existing && !replace) {
        skipped++
        continue
      }

      if (existing && replace) {
        await supabaseAdmin.from('knowledge_base').delete().eq('id', existing.id)
      }

      const embedding = await generateEmbedding(`${entry.title}\n${entry.content}`)

      const { error } = await supabaseAdmin.from('knowledge_base').insert({
        tenant_id: tenantId,
        title: entry.title,
        content: entry.content,
        category: 'FAQ',
        language: 'PA',
        tags: [...entry.tags, 'pa-glossary', 'insurance-demo'],
        embedding,
      })

      if (!error) created++
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: INSURANCE_PA_KB_ENTRIES.length,
      message: `Seeded ${created} Papiamentu insurance glossary entries (${skipped} skipped)`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed'
    console.error('PA glossary seed error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
