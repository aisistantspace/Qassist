import { NextRequest, NextResponse } from 'next/server'
import { getHotLeads } from '@/lib/lead-scoring'

export async function GET() {
  try {
    const leads = await getHotLeads()

    return NextResponse.json({ leads })
  } catch (error: any) {
    console.error('Error fetching hot leads:', error)
    let errorMessage = 'Failed to fetch hot leads'
    
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


