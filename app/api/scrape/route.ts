import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import * as cheerio from 'cheerio'

// Simple language detection
function detectLanguage(text: string): 'EN' | 'ES' {
  const lowerText = text.toLowerCase()
  const spanishPatterns = [
    /hola/i, /gracias/i, /por favor/i,
    /el /, /la /, /los /, /las /,
    /qué/, /cómo/, /cuándo/, /dónde/,
    /ñ/, /á/, /é/, /í/, /ó/, /ú/,
  ]
  const isSpanish = spanishPatterns.some(pattern => pattern.test(lowerText))
  return isSpanish ? 'ES' : 'EN'
}

// Chunk text into smaller pieces
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = []
  const cleanText = text.replace(/\s+/g, ' ').trim()
  const paragraphs = cleanText.split(/\n\n+/)
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 50)
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        filename: parsedUrl.hostname + parsedUrl.pathname,
        file_type: 'url',
        file_size: 0,
        status: 'processing',
      })
      .select()
      .single()

    if (docError) throw docError

    try {
      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AstuteWebBot/1.0; +https://astuteweb.agency)',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`)
      }

      const html = await response.text()

      // Parse HTML and extract text
      const $ = cheerio.load(html)
      
      // Remove script, style, and other non-content elements
      $('script, style, nav, footer, header, aside, noscript, iframe').remove()
      
      // Get main content
      let content = ''
      
      // Try to find main content areas
      const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.entry']
      for (const selector of mainSelectors) {
        if ($(selector).length > 0) {
          content = $(selector).text()
          break
        }
      }
      
      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text()
      }

      // Clean up the text
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      if (!content || content.length < 50) {
        throw new Error('Could not extract meaningful content from the page')
      }

      // Chunk the content
      const chunks = chunkText(content)
      
      // Create knowledge base entries for each chunk
      let chunkCount = 0
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        try {
          const embedding = await generateEmbedding(chunk)
          const language = detectLanguage(chunk)

          const { error: kbError } = await supabaseAdmin
            .from('knowledge_base')
            .insert({
              title: `${parsedUrl.hostname} - Part ${i + 1}`,
              content: chunk,
              category: 'Service',
              language,
              tags: [parsedUrl.hostname, 'scraped'],
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
          file_size: content.length,
          content_text: content.substring(0, 5000),
        })
        .eq('id', document.id)

      return NextResponse.json({
        success: true,
        document: { ...document, chunk_count: chunkCount, status: 'completed' },
        message: `Website scraped: ${chunkCount} chunks created`,
      })
    } catch (scrapeError: any) {
      // Mark document as failed
      await supabaseAdmin
        .from('documents')
        .update({
          status: 'failed',
          error_message: scrapeError.message,
        })
        .eq('id', document.id)

      throw scrapeError
    }
  } catch (error: any) {
    console.error('Error scraping website:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scrape website' },
      { status: 500 }
    )
  }
}











