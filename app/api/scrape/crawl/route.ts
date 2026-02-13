import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'
import { getTenantFromRequest } from '@/lib/tenant'
import * as cheerio from 'cheerio'

// Simple language detection for scraped content
function detectLanguage(text: string): 'EN' | 'NL' | 'ES' | 'PA' {
  const lower = text.toLowerCase()
  // Papiamentu markers
  const paPatterns = [/bon dia/, /kon ta/, /mi ta /, /bo ta /, /danki/, /por fabor/, /kiko/, /bisa/]
  if (paPatterns.some(p => p.test(lower))) return 'PA'
  // Dutch markers
  const nlPatterns = [/verzekering/, /premie/, /dekking/, /schade/, /aanvraag/, /\b(het|een|van|voor|met|bij|aan|ook|als|maar)\b/g]
  const nlHits = nlPatterns.reduce((n, p) => n + (lower.match(p)?.length || 0), 0)
  if (nlHits >= 4) return 'NL'
  // Spanish markers
  const esPatterns = [/seguro/, /\bel\b/, /\bla\b/, /\blos\b/, /\blas\b/, /ñ/, /ción/]
  if (esPatterns.some(p => p.test(lower))) return 'ES'
  return 'EN'
}

// Chunk text into smaller pieces
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = []
  const cleanText = text.replace(/\s+/g, ' ').trim()
  const paragraphs = cleanText.split(/\n\n+/)

  let currentChunk = ''
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim())
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim())
  return chunks.filter(c => c.length > 50)
}

// Normalize URL: remove fragment, trailing slash, sort query params
function normalizeUrl(raw: string, baseOrigin: string): string | null {
  try {
    const u = new URL(raw, baseOrigin)
    // Only same origin
    if (u.origin !== baseOrigin) return null
    // Skip non-HTML resources
    const ext = u.pathname.split('.').pop()?.toLowerCase() || ''
    const skipExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'pdf', 'zip', 'mp4', 'mp3', 'css', 'js', 'woff', 'woff2', 'ttf', 'eot']
    if (skipExts.includes(ext)) return null
    // Remove fragment
    u.hash = ''
    // Normalize trailing slash
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return null
  }
}

// Extract text content from a cheerio-loaded page
function extractContent($: cheerio.CheerioAPI): string {
  $('script, style, nav, footer, header, aside, noscript, iframe, svg').remove()
  const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.entry']
  let content = ''
  for (const sel of mainSelectors) {
    if ($(sel).length > 0) {
      content = $(sel).text()
      break
    }
  }
  if (!content) content = $('body').text()
  return content.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

// Extract page title
function extractTitle($: cheerio.CheerioAPI): string {
  return $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    'Untitled'
}

// Extract internal links from a page
function extractLinks($: cheerio.CheerioAPI, baseOrigin: string): string[] {
  const links: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const normalized = normalizeUrl(href, baseOrigin)
    if (normalized) links.push(normalized)
  })
  return links
}

// Small delay between requests
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const tenantId = (await getTenantFromRequest(request)).tenantId
    const body = await request.json()
    const { url, maxPages = 25, maxDepth = 3 } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    let startUrl: URL
    try {
      startUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const baseOrigin = startUrl.origin
    const visited = new Set<string>()
    const queue: { url: string; depth: number }[] = [{ url: startUrl.toString(), depth: 0 }]
    const results: { url: string; title: string; chunks: number; error?: string }[] = []
    let totalChunks = 0

    while (queue.length > 0 && visited.size < maxPages) {
      const item = queue.shift()!
      const normalizedUrl = normalizeUrl(item.url, baseOrigin)
      if (!normalizedUrl || visited.has(normalizedUrl)) continue
      visited.add(normalizedUrl)

      try {
        // Polite delay
        if (visited.size > 1) await delay(300)

        const response = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AstuteWebBot/1.0; +https://astuteweb.agency)',
          },
          signal: AbortSignal.timeout(10000),
        })

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('text/html')) {
          results.push({ url: normalizedUrl, title: '', chunks: 0, error: 'Not HTML' })
          continue
        }

        if (!response.ok) {
          results.push({ url: normalizedUrl, title: '', chunks: 0, error: `HTTP ${response.status}` })
          continue
        }

        const html = await response.text()
        const $ = cheerio.load(html)
        const pageTitle = extractTitle($)

        // Discover links if we haven't hit max depth
        if (item.depth < maxDepth) {
          const links = extractLinks($, baseOrigin)
          for (const link of links) {
            if (!visited.has(link) && !queue.some(q => normalizeUrl(q.url, baseOrigin) === link)) {
              queue.push({ url: link, depth: item.depth + 1 })
            }
          }
        }

        // Extract and process content
        const content = extractContent($)
        if (!content || content.length < 50) {
          results.push({ url: normalizedUrl, title: pageTitle, chunks: 0, error: 'No meaningful content' })
          continue
        }

        // Create document record
        const { data: document, error: docError } = await supabaseAdmin
          .from('documents')
          .insert({
            filename: normalizedUrl,
            file_type: 'url',
            file_size: content.length,
            status: 'processing',
            tenant_id: tenantId,
          })
          .select()
          .single()

        if (docError) {
          results.push({ url: normalizedUrl, title: pageTitle, chunks: 0, error: 'DB error' })
          continue
        }

        // Chunk and embed
        const chunks = chunkText(content)
        let chunkCount = 0

        for (let i = 0; i < chunks.length; i++) {
          try {
            const embedding = await generateEmbedding(chunks[i])
            const language = detectLanguage(chunks[i])

            const { error: kbError } = await supabaseAdmin
              .from('knowledge_base')
              .insert({
                title: `${pageTitle} - Part ${i + 1}`,
                content: chunks[i],
                category: 'Service',
                language,
                tags: [startUrl.hostname, 'crawled'],
                embedding,
                source_document_id: document.id,
                chunk_index: i,
                tenant_id: tenantId,
              })

            if (!kbError) chunkCount++
          } catch (chunkErr) {
            console.error(`Chunk ${i} error for ${normalizedUrl}:`, chunkErr)
          }
        }

        // Update document
        await supabaseAdmin
          .from('documents')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            chunk_count: chunkCount,
            content_text: content.substring(0, 5000),
          })
          .eq('id', document.id)

        totalChunks += chunkCount
        results.push({ url: normalizedUrl, title: pageTitle, chunks: chunkCount })
      } catch (pageError: any) {
        results.push({
          url: normalizedUrl,
          title: '',
          chunks: 0,
          error: pageError.message?.substring(0, 100) || 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      pagesFound: visited.size + queue.length,
      pagesScraped: visited.size,
      totalChunks,
      results,
      message: `Crawled ${visited.size} pages, created ${totalChunks} knowledge base entries`,
    })
  } catch (error: any) {
    console.error('Crawl error:', error)
    return NextResponse.json(
      { error: error.message || 'Crawl failed' },
      { status: 500 }
    )
  }
}
