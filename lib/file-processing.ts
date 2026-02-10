import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import Papa from 'papaparse'

export interface ProcessedDocument {
  text: string
  chunks: string[]
  metadata: {
    pageCount?: number
    wordCount: number
    characterCount: number
  }
}

// Maximum chunk size in characters
const MAX_CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

/**
 * Extract text from PDF buffer
 */
export async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer)
    return data.text
  } catch (error) {
    console.error('Error extracting PDF:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

/**
 * Extract text from Word document buffer
 */
export async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    console.error('Error extracting DOCX:', error)
    throw new Error('Failed to extract text from Word document')
  }
}

/**
 * Extract text from CSV buffer
 */
export function extractFromCSV(buffer: Buffer): string {
  try {
    const text = buffer.toString('utf-8')
    const parsed = Papa.parse(text, { header: true })
    
    // Convert CSV to readable text format
    const rows = parsed.data as any[]
    return rows.map(row => {
      return Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    }).join('\n')
  } catch (error) {
    console.error('Error extracting CSV:', error)
    throw new Error('Failed to extract text from CSV')
  }
}

/**
 * Extract text from plain text buffer
 */
export function extractFromTXT(buffer: Buffer): string {
  return buffer.toString('utf-8')
}

/**
 * Process file based on type
 */
export async function processFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const lowerType = fileType.toLowerCase()

  if (lowerType.includes('pdf')) {
    return await extractFromPDF(buffer)
  } else if (lowerType.includes('word') || lowerType.includes('docx')) {
    return await extractFromDOCX(buffer)
  } else if (lowerType.includes('csv')) {
    return extractFromCSV(buffer)
  } else if (lowerType.includes('text') || lowerType.includes('txt')) {
    return extractFromTXT(buffer)
  } else {
    throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Intelligently chunk text into smaller pieces
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = []
  
  // Clean up text
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Split by paragraphs first
  const paragraphs = cleanText.split(/\n\n+/)
  
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + paragraph.length > MAX_CHUNK_SIZE) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      
      // If paragraph itself is too long, split it by sentences
      if (paragraph.length > MAX_CHUNK_SIZE) {
        const sentences = paragraph.split(/[.!?]+/)
        currentChunk = ''
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > MAX_CHUNK_SIZE) {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim())
            }
            currentChunk = sentence + '. '
          } else {
            currentChunk += sentence + '. '
          }
        }
      } else {
        // Add overlap from previous chunk
        const words = currentChunk.split(' ')
        const overlapWords = words.slice(-20).join(' ')
        currentChunk = overlapWords + '\n\n' + paragraph
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 50) // Filter out tiny chunks
}

/**
 * Process and chunk document
 */
export async function processDocument(
  buffer: Buffer,
  fileType: string,
  filename: string
): Promise<ProcessedDocument> {
  try {
    // Extract text
    const text = await processFile(buffer, fileType)
    
    // Chunk text
    const chunks = chunkText(text)
    
    // Calculate metadata
    const wordCount = text.split(/\s+/).length
    const characterCount = text.length

    return {
      text,
      chunks,
      metadata: {
        wordCount,
        characterCount,
      },
    }
  } catch (error) {
    console.error(`Error processing ${filename}:`, error)
    throw error
  }
}


