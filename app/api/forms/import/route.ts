import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    let { url } = await request.json()

    if (!url || !url.includes('docs.google.com/forms')) {
      return NextResponse.json({ error: 'Please provide a valid Google Form URL' }, { status: 400 })
    }

    // Convert edit URLs to viewform URLs
    if (url.includes('/edit')) {
      url = url.split('/edit')[0] + '/viewform'
    }

    const response = await fetch(url)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Could not access the form. Please make sure it is public.' }, { status: 404 })
    }

    const html = await response.text()

    // 1. Fetch Agent Context (Instructions & Branding)
    const supabaseAdmin = getSupabaseAdmin()
    const [settingsRes, brandingRes] = await Promise.all([
      supabaseAdmin.from('agent_settings').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('branding_config').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
    ])

    const agentInstructions = settingsRes.data?.instructions || ''
    const companyName = brandingRes.data?.company_name || 'the company'
    const companyDesc = brandingRes.data?.company_description || ''

    // 2. Try to find JSON data in FB_PUBLIC_LOAD_DATA_
    const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);/)
    let fields: Array<{ key: string; label: string; question: string; type: 'text' | 'number' | 'email' | 'select' | 'date'; options?: string[] }> = []
    let title = 'Imported Form'
    let description = ''

    const JUNK_LABELS = [
      'submit', 'clear form', 'report abuse', 'google forms', 
      'this content is neither created nor endorsed', 'terms of service', 
      'privacy policy', 'edit this form', 'never submit passwords', 
      'sign in', 'next', 'back', 'page 1 of 1', 'roboto', 'eligibility_form',
      'accept', 'required', 'choose', 'your answer', 'your email'
    ]

    const isJunk = (text: string): boolean => {
      if (!text || typeof text !== 'string') return true
      const lower = text.toLowerCase().trim()
      // Remove HTML tags
      const cleanText = lower.replace(/<[^>]*>/g, '')
      if (cleanText.length < 2) return true
      if (JUNK_LABELS.some(junk => cleanText.includes(junk))) return true
      // Filter out system strings
      if (cleanText.match(/^(roboto|arial|helvetica|times)$/i)) return true
      if (cleanText.match(/^[0-9]+$/)) return true // Just numbers
      return false
    }

    const cleanText = (text: string): string => {
      if (!text) return ''
      return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    }

    const generateKey = (label: string, index: number): string => {
      return label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 30) || `field_${index}`
    }

    if (match && match[1]) {
      try {
        const data = JSON.parse(match[1])
        const formInfo = data[1]
        title = cleanText(formInfo[0] || title)
        description = cleanText(formInfo[1] || description)

        // Parse questions from formInfo[10]
        const rawQuestions = formInfo[10] || []
        if (Array.isArray(rawQuestions)) {
          rawQuestions.forEach((q: any, index: number) => {
            if (!Array.isArray(q) || q.length < 2) return

            // Extract question title (usually at index 1)
            const questionTitle = cleanText(q[1] || '')
            if (!questionTitle || isJunk(questionTitle)) return

            // Extract question type (usually at index 3 or 4)
            // Google Forms types: 0=multiple choice, 1=checkbox, 2=dropdown, 3=linear scale, 4=email, 5=short text, 9=date
            const questionType = q[3] || q[4] || 5
            let fieldType: 'text' | 'number' | 'email' | 'select' | 'date' = 'text'
            let options: string[] | undefined = undefined

            // Determine field type
            if (questionType === 4 || questionTitle.toLowerCase().includes('email')) {
              fieldType = 'email'
            } else if (questionType === 9 || questionTitle.toLowerCase().includes('date') || questionTitle.toLowerCase().includes('birth')) {
              fieldType = 'date'
            } else if (questionType === 0 || questionType === 1 || questionType === 2) {
              // Multiple choice, checkbox, or dropdown
              fieldType = 'select'
              // Extract options from question data
              // Options are usually in q[4][0] or q[4][1] arrays
              const optionsData = q[4] || []
              if (Array.isArray(optionsData)) {
                const extractedOptions: string[] = []
                // Try different structures
                if (Array.isArray(optionsData[0])) {
                  // Nested array structure
                  optionsData[0].forEach((opt: any) => {
                    if (Array.isArray(opt) && opt[0]) {
                      const optText = cleanText(String(opt[0]))
                      if (optText && !isJunk(optText) && optText.length > 1) {
                        extractedOptions.push(optText)
                      }
                    } else if (typeof opt === 'string') {
                      const optText = cleanText(opt)
                      if (optText && !isJunk(optText) && optText.length > 1) {
                        extractedOptions.push(optText)
                      }
                    }
                  })
                } else {
                  // Flat array structure
                  optionsData.forEach((opt: any) => {
                    if (Array.isArray(opt) && opt[0]) {
                      const optText = cleanText(String(opt[0]))
                      if (optText && !isJunk(optText) && optText.length > 1) {
                        extractedOptions.push(optText)
                      }
                    } else if (typeof opt === 'string') {
                      const optText = cleanText(opt)
                      if (optText && !isJunk(optText) && optText.length > 1) {
                        extractedOptions.push(optText)
                      }
                    }
                  })
                }
                // Remove duplicates and empty options
                const uniqueOptions = Array.from(new Set(extractedOptions.filter(opt => opt.length > 0)))
                // If no valid options found, treat as text
                if (uniqueOptions.length === 0) {
                  fieldType = 'text'
                  options = undefined
                } else {
                  options = uniqueOptions
                }
              }
            } else if (questionType === 5) {
              // Short text
              fieldType = 'text'
            }

            // Skip if it's just an option (too short or matches option patterns)
            if (questionTitle.length < 3) return

            const key = generateKey(questionTitle, index)
            
            fields.push({
              key,
              label: questionTitle.length > 50 ? questionTitle.substring(0, 47) + '...' : questionTitle,
              question: questionTitle,
              type: fieldType,
              options
            })
          })
        }
      } catch (e) {
        console.error('Error parsing form JSON:', e)
      }
    }

    // 3. Fallback to HTML if JSON results are poor
    if (fields.length < 2) {
      const titleMatch = html.match(/<div[^>]*role="heading"[^>]*>(.*?)<\/div>/)
      if (titleMatch) title = cleanText(titleMatch[1])

      const labelMatches = html.matchAll(/<div[^>]*class="[^"]*?freebirdFormviewerComponentsQuestionBaseHeaderTitle[^"]*?"[^>]*>(.*?)<\/div>/g)
      let fallbackIndex = 0
      for (const m of labelMatches) {
        const label = cleanText(m[1])
        if (label && !isJunk(label) && label.length > 3) {
          fields.push({
            key: generateKey(label, fallbackIndex++),
            label: label.length > 50 ? label.substring(0, 47) + '...' : label,
            question: label,
            type: 'text'
          })
        }
      }
    }

    // Remove duplicates based on key
    const seenKeys = new Set<string>()
    fields = fields.filter(field => {
      if (seenKeys.has(field.key)) return false
      seenKeys.add(field.key)
      return true
    })

    if (fields.length === 0) {
      if (html.includes('Sign in') || html.includes('permission')) {
        return NextResponse.json({ error: 'This form is private. Please make it public.' }, { status: 403 })
      }
      return NextResponse.json({ error: 'No questions found. Try making the form public or checking the URL.' }, { status: 404 })
    }

    // 4. Context-Aware AI Enhancement
    let finalTitle = title
    let finalDescription = description

    try {
      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at AI intent matching for "${companyName}".
            
            ### AGENT CONTEXT:
            ${companyDesc ? `Company Description: ${companyDesc}` : ''}
            Agent Instructions: ${agentInstructions || 'Generic AI Assistant'}
            
            ### GOAL:
            Analyze the following form questions and provide a "Form Name" and "Trigger Description" that aligns with this specific agent.
            The Trigger Description should be optimized for an AI to know when to start this interview naturally.
            
            ### RULES:
            1. Ensure the trigger is specific to "${companyName}" services.
            2. Make sure the trigger does not conflict with the agent's general knowledge base info.
            3. Use the agent's persona (if defined in instructions) to frame the trigger.
            
            Format your response as a JSON object: {"form_name": "...", "trigger_description": "..."}`
          },
          {
            role: 'user',
            content: `Form Questions: ${fields.map(f => f.question).join(', ')}`
          }
        ],
        response_format: { type: 'json_object' }
      })

      const aiData = JSON.parse(aiResponse.choices[0].message.content || '{}')
      if (aiData.form_name) finalTitle = aiData.form_name
      if (aiData.trigger_description) finalDescription = aiData.trigger_description
    } catch (e) {
      console.error('Failed to enhance form with AI:', e)
      if (!finalDescription) {
        finalDescription = `Conversational interview based on the form "${finalTitle}"`
      }
    }

    return NextResponse.json({
      title: finalTitle,
      description: finalDescription,
      fields
    })
  } catch (error: any) {
    console.error('Error importing form:', error)
    let errorMessage = 'Failed to process form'
    
    if (error.message?.includes('Supabase admin client is not initialized') || error.message?.includes('Missing environment variables')) {
      errorMessage = 'Database connection error. Please check your Supabase configuration in Vercel environment variables.'
    } else if (error.message?.includes('fetch failed') || error.name === 'TypeError') {
      errorMessage = 'Database connection error. Unable to connect to Supabase. Please check your network connection and Supabase configuration.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
