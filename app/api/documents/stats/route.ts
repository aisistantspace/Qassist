import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: stats, error } = await supabaseAdmin
      .from('document_stats')
      .select('*')
      .single()

    if (error) {
      // If view doesn't exist, calculate manually
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')

      const manualStats = {
        total_documents: documents?.length || 0,
        completed_documents: documents?.filter((d: any) => d.status === 'completed').length || 0,
        processing_documents: documents?.filter((d: any) => d.status === 'processing').length || 0,
        failed_documents: documents?.filter((d: any) => d.status === 'failed').length || 0,
        total_size_bytes: documents?.reduce((sum: number, d: any) => sum + (d.file_size || 0), 0) || 0,
        total_chunks: documents?.reduce((sum: number, d: any) => sum + (d.chunk_count || 0), 0) || 0,
      }

      return NextResponse.json({ stats: manualStats })
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Error fetching document stats:', error)
    let errorMessage = 'Failed to fetch stats'
    
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


