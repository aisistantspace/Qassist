import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { processDocument } from '@/lib/file-processing'
import { generateEmbedding } from '@/lib/openai'
import { validateUploadedFile } from '@/lib/security'

// Simple language detection
function detectLanguage(text: string): 'EN' | 'ES' {
  const lowerText = text.toLowerCase()
  
  // Spanish indicators
  const spanishPatterns = [
    /hola/i, /gracias/i, /por favor/i,
    /el /, /la /, /los /, /las /,
    /qué/, /cómo/, /cuándo/, /dónde/,
    /ñ/, /á/, /é/, /í/, /ó/, /ú/,
  ]
  
  const isSpanish = spanishPatterns.some(pattern => pattern.test(lowerText))
  return isSpanish ? 'ES' : 'EN'
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validate file: extension, size, and magic bytes
    const validation = validateUploadedFile(file.name, file.size, bytes)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Create document record
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .insert({
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        status: 'processing',
      })
      .select()
      .single()

    if (error) throw error

    // Process the file - extract text and chunk it
    try {
      const processed = await processDocument(buffer, file.type, file.name)
      
      // Create knowledge base entries for each chunk
      let chunkCount = 0
      for (let i = 0; i < processed.chunks.length; i++) {
        const chunk = processed.chunks[i]
        
        try {
          // Generate embedding
          const embedding = await generateEmbedding(chunk)
          const language = detectLanguage(chunk)

          // Insert into knowledge base
          const { error: kbError } = await supabaseAdmin
            .from('knowledge_base')
            .insert({
              title: `${file.name} - Part ${i + 1}`,
              content: chunk,
              category: 'Service',
              language,
              tags: [file.name.replace(/\.[^/.]+$/, '')], // filename without extension
              embedding,
              source_document_id: document.id,
              chunk_index: i,
            })

          if (!kbError) chunkCount++
        } catch (chunkError) {
          console.error(`Error processing chunk ${i}:`, chunkError)
        }
      }

      // Update document status
      await supabaseAdmin
        .from('documents')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          chunk_count: chunkCount,
          content_text: processed.text.substring(0, 5000), // Store first 5000 chars
        })
        .eq('id', document.id)

      return NextResponse.json({ 
        success: true, 
        document: { ...document, chunk_count: chunkCount, status: 'completed' },
        message: `File processed: ${chunkCount} chunks created from ${processed.chunks.length} total.`
      })
    } catch (processError: any) {
      // Mark as failed
      await supabaseAdmin
        .from('documents')
        .update({
          status: 'failed',
          error_message: processError.message,
        })
        .eq('id', document.id)

      throw processError
    }
  } catch (error: any) {
    console.error('Error uploading document:', error)
    let errorMessage = 'Failed to upload document'
    
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


