import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardTenantId } from '@/lib/dashboard-tenant'
import { generateEmbedding } from '@/lib/openai'

// GET all knowledge base entries
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDashboardTenantId(request)
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('id, title, content, category, language, tags, created_at, source_document_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Count entries from uploads vs manual
    const entries = data || []
    const fromUploads = entries.filter((e: any) => e.source_document_id).length
    const manual = entries.filter((e: any) => !e.source_document_id).length

    return NextResponse.json({ 
      entries,
      stats: {
        total: entries.length,
        fromUploads,
        manual,
      }
    })
  } catch (error: any) {
    console.error('Error fetching knowledge base:', error)
    let errorMessage = 'Failed to fetch entries'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const body = await request.json()
    const { title, content, category, language, tags } = body

    // Validate required fields
    if (!title || !content || !category || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate embedding for the content
    const embedding = await generateEmbedding(`${title} ${content}`)

    // Insert into database
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert({
        tenant_id: tenantId,
        title,
        content,
        category,
        language,
        tags: tags || [],
        embedding,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error creating knowledge base entry:', error)
    let errorMessage = 'Failed to create entry'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const body = await request.json()
    const { id, title, content, category, language, tags } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    // Generate new embedding
    const embedding = await generateEmbedding(`${title} ${content}`)

    // Update database
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .update({
        title,
        content,
        category,
        language,
        tags: tags || [],
        embedding,
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating knowledge base entry:', error)
    let errorMessage = 'Failed to update entry'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE a knowledge base entry
export async function DELETE(request: NextRequest) {
    const tenantId = await getDashboardTenantId(request)
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('knowledge_base')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting knowledge base entry:', error)
    let errorMessage = 'Failed to delete entry'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
