import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { getTenantFromRequest } from '@/lib/tenant'
import { chunkText, cleanWebContent, detectLanguageForKbContent } from '@/lib/kb-ingest'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const tenantId = (await getTenantFromRequest(request)).tenantId
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        filename: parsedUrl.hostname + parsedUrl.pathname,
        file_type: 'url',
        file_size: 0,
        status: 'processing',
        tenant_id: tenantId,
      })
      .select()
      .single()

    if (docError) throw docError

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AstuteWebBot/1.0; +https://astuteweb.agency)',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      $('script, style, nav, footer, header, aside, noscript, iframe, svg').remove()

      let content = ''
      const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.entry']
      for (const selector of mainSelectors) {
        if ($(selector).length > 0) {
          content = $(selector).text()
          break
        }
      }
      if (!content) {
        content = $('body').text()
      }

      content = cleanWebContent(content)

      if (!content || content.length < 50) {
        throw new Error('Could not extract meaningful content from the page')
      }

      const pageLanguage = detectLanguageForKbContent(content, url)
      const chunks = chunkText(content)

      let chunkCount = 0
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        try {
          const embedding = await generateEmbedding(chunk)

          const { error: kbError } = await supabaseAdmin
            .from('knowledge_base')
            .insert({
              title: `${parsedUrl.hostname} - Part ${i + 1}`,
              content: chunk,
              category: 'Service',
              language: pageLanguage,
              tags: [parsedUrl.hostname, 'scraped'],
              embedding,
              source_document_id: document.id,
              chunk_index: i,
              tenant_id: tenantId,
            })

          if (!kbError) chunkCount++
        } catch (chunkError) {
          console.error(`Error processing chunk ${i}:`, chunkError)
        }
      }

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
        message: `Website scraped: ${chunkCount} chunks created (${pageLanguage})`,
        language: pageLanguage,
      })
    } catch (scrapeError: unknown) {
      const message = scrapeError instanceof Error ? scrapeError.message : 'Scrape failed'
      await supabaseAdmin
        .from('documents')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', document.id)

      throw scrapeError
    }
  } catch (error: unknown) {
    console.error('Error scraping website:', error)
    const message = error instanceof Error ? error.message : 'Failed to scrape website'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
