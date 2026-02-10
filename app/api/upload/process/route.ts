import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { documentId, content, chunks } = body

    if (!documentId || (!content && !chunks)) {
      return NextResponse.json(
        { error: 'documentId and content/chunks required' },
        { status: 400 }
      )
    }

    // Get document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Process chunks (either provided or use content)
    const textChunks = chunks || [content]
    const processedChunks: any[] = []

    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i]
      
      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk)

        // Determine language (simple heuristic)
        const language = detectLanguage(chunk)

        // Insert into knowledge base
        const { data: kbEntry, error: kbError } = await supabaseAdmin
          .from('knowledge_base')
          .insert({
            title: `${document.filename} - Part ${i + 1}`,
            content: chunk,
            category: 'Service', // Can be customized
            language,
            tags: [document.filename],
            embedding,
            source_document_id: documentId,
            chunk_index: i,
          })
          .select()
          .single()

        if (!kbError) {
          processedChunks.push(kbEntry)
        }
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error)
      }
    }

    // Update document status
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        chunk_count: processedChunks.length,
      })
      .eq('id', documentId)

    return NextResponse.json({
      success: true,
      chunks: processedChunks.length,
      message: `Document processed: ${processedChunks.length} chunks created`,
    })
  } catch (error: any) {
    console.error('Error processing document:', error)
    
    // Note: If we got here, body might or might not be defined depending on where it failed
    try {
      // Re-read or use existing variables if possible to mark failure
      // Since we can't easily re-read the request body, we rely on having documentId from scope
    } catch (e) {
      // Ignore
    }

    let errorMessage = 'Failed to process document'
    
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

// Simple language detection
function detectLanguage(text: string): 'EN' | 'NL' | 'ES' | 'PA' {
  const lowerText = text.toLowerCase()
  
  // Dutch indicators
  if (lowerText.includes('het ') || lowerText.includes('de ') || lowerText.includes('een ')) {
    return 'NL'
  }
  
  // Spanish indicators
  if (lowerText.includes('el ') || lowerText.includes('la ') || lowerText.includes('los ')) {
    return 'ES'
  }
  
  // Papiamento indicators
  if (lowerText.includes('e ') || lowerText.includes('ta ') || lowerText.includes('ku ')) {
    return 'PA'
  }
  
  // Default to English
  return 'EN'
}


