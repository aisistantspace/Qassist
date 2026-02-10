import { NextRequest, NextResponse } from 'next/server'
import { calculateLeadScore, updateLeadScore } from '@/lib/lead-scoring'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    const result = await updateLeadScore(leadId)

    return NextResponse.json({ success: true, score: result })
  } catch (error: any) {
    console.error('Error calculating lead score:', error)
    let errorMessage = 'Failed to calculate score'
    
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


