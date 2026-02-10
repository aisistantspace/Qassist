import OpenAI from 'openai'
import { getAgentSettings } from './openai'

// Lazy-initialized to avoid crashing during build when env vars aren't set
let _openai: OpenAI | null = null
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
  }
  return _openai
}

export interface EligibilityResult {
  eligible: boolean
  confidence: number // 0-1
  reasoning: string
  recommendations: string[]
  nextSteps: string[]
  rulesMatched: string[]
}

export interface EligibilityFormAnswers {
  [key: string]: any
}

export interface AIResponseConfig {
  thresholds?: {
    minAge?: number
    maxAge?: number
    minIncome?: number
    restrictedCountries?: string[]
  }
  rules?: Array<{
    field: string
    operator: string
    value: any
    message: string
  }>
  instructions?: string // Optional custom instructions for AI response
}

/**
 * Check eligibility rules using form-specific criteria or defaults
 */
export function checkEligibilityRules(
  answers: EligibilityFormAnswers,
  criteria?: AIResponseConfig | null
): {
  passed: boolean
  rulesMatched: string[]
  issues: string[]
} {
  const rulesMatched: string[] = []
  const issues: string[] = []

  const thresholds = criteria?.thresholds || {}
  const customRules = criteria?.rules || []

  // Use form-specific thresholds or defaults
  const minAge = thresholds.minAge ?? 18
  const maxAge = thresholds.maxAge ?? 65
  const minIncome = thresholds.minIncome ?? 2000
  const restrictedCountries = thresholds.restrictedCountries || ['iran', 'north korea', 'syria']

  // Rule 1: Age requirement
  const age = parseInt(answers.age || answers.date_of_birth || '0')
  if (age > 0) {
    if (age >= minAge && age <= maxAge) {
      rulesMatched.push(`Age within acceptable range (${minAge}-${maxAge})`)
    } else {
      issues.push(`Age ${age} is outside acceptable range (${minAge}-${maxAge})`)
    }
  }

  // Rule 2: Income/Financial stability
  const income = parseFloat(answers.income || answers.monthly_income || answers.annual_income || '0')
  if (income > 0) {
    if (income >= minIncome) {
      rulesMatched.push(`Income meets minimum requirements (${minIncome} per month)`)
    } else {
      issues.push(`Income may be below minimum threshold (${minIncome} per month)`)
    }
  }

  // Rule 3: Nationality/Country of origin
  const nationality = (answers.nationality || answers.country_of_origin || '').toLowerCase()
  if (nationality && restrictedCountries.some(country => nationality.includes(country))) {
    issues.push('Nationality may face additional restrictions')
  } else if (nationality) {
    rulesMatched.push('Nationality not in restricted list')
  }

  // Rule 4: Education level (default rule, can be overridden by custom rules)
  const education = (answers.education || answers.education_level || '').toLowerCase()
  if (education && (education.includes('university') || education.includes('degree') || education.includes('bachelor') || education.includes('master'))) {
    rulesMatched.push('Education level may qualify for skilled worker programs')
  }

  // Rule 5: Work experience (default rule)
  const workExperience = parseInt(answers.work_experience || answers.years_of_experience || '0')
  if (workExperience >= 2) {
    rulesMatched.push('Sufficient work experience')
  } else if (workExperience > 0) {
    issues.push('Limited work experience may affect eligibility')
  }

  // Rule 6: Language proficiency (default rule)
  const language = (answers.language || answers.language_proficiency || '').toLowerCase()
  if (language && (language.includes('english') || language.includes('dutch') || language.includes('spanish'))) {
    rulesMatched.push('Language proficiency indicated')
  }

  // Apply custom rules
  customRules.forEach(rule => {
    const fieldValue = answers[rule.field]
    if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
      let rulePassed = false
      switch (rule.operator) {
        case '>=':
          rulePassed = Number(fieldValue) >= Number(rule.value)
          break
        case '<=':
          rulePassed = Number(fieldValue) <= Number(rule.value)
          break
        case '>':
          rulePassed = Number(fieldValue) > Number(rule.value)
          break
        case '<':
          rulePassed = Number(fieldValue) < Number(rule.value)
          break
        case '===':
        case '=':
          rulePassed = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase()
          break
        case '!==':
        case '!=':
          rulePassed = String(fieldValue).toLowerCase() !== String(rule.value).toLowerCase()
          break
        case 'includes':
          rulePassed = String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase())
          break
        default:
          rulePassed = true
      }
      if (rulePassed) {
        rulesMatched.push(rule.message || `Rule passed: ${rule.field}`)
      } else {
        issues.push(rule.message || `Rule failed: ${rule.field}`)
      }
    }
  })

  const passed = issues.length === 0 || (rulesMatched.length > issues.length)

  return { passed, rulesMatched, issues }
}

/**
 * Generate AI-powered eligibility assessment
 */
export async function analyzeEligibility(
  formName: string,
  formDescription: string,
  answers: EligibilityFormAnswers,
  criteria?: AIResponseConfig | null
): Promise<EligibilityResult> {
  // First, check rules using form-specific criteria or defaults
  const rulesCheck = checkEligibilityRules(answers, criteria)

  // Build prompt for AI analysis
  const answersSummary = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')

  const systemPrompt = `You are an immigration eligibility assessment expert. Analyze the provided information and determine if the person is likely eligible for immigration to the Caribbean (Aruba/Curacao/Bonaire).

Form: ${formName}
Description: ${formDescription}

Applicant Information:
${answersSummary}

Rules Check Results:
- Rules Matched: ${rulesCheck.rulesMatched.join(', ') || 'None'}
- Issues Found: ${rulesCheck.issues.join(', ') || 'None'}

Provide a comprehensive eligibility assessment. Consider:
1. Age requirements
2. Financial stability/income
3. Education and skills
4. Work experience
5. Language proficiency
6. Nationality/country of origin
7. Family situation
8. Any other relevant factors

Respond in JSON format:
{
  "eligible": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of eligibility assessment",
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "nextSteps": ["Next step 1", "Next step 2"]
}

Be honest and realistic. If eligibility is uncertain, set confidence lower and explain why.`

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please analyze this eligibility case and provide your assessment.' },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const aiResult = JSON.parse(responseText) as {
      eligible: boolean
      confidence: number
      reasoning: string
      recommendations: string[]
      nextSteps: string[]
    }

    // Combine AI analysis with rules check
    const finalEligible = aiResult.eligible && rulesCheck.passed
    const confidence = Math.min(aiResult.confidence, rulesCheck.passed ? 1.0 : 0.7)

    return {
      eligible: finalEligible,
      confidence,
      reasoning: aiResult.reasoning || 'Assessment completed based on provided information.',
      recommendations: aiResult.recommendations || [],
      nextSteps: aiResult.nextSteps || [
        'Schedule a consultation with an immigration expert',
        'Gather required documentation',
        'Review specific visa requirements',
      ],
      rulesMatched: rulesCheck.rulesMatched,
    }
  } catch (error) {
    console.error('Error in AI eligibility analysis:', error)
    
    // Fallback to rules-based assessment if AI fails
    return {
      eligible: rulesCheck.passed,
      confidence: rulesCheck.passed ? 0.6 : 0.4,
      reasoning: rulesCheck.issues.length > 0
        ? `Based on initial screening: ${rulesCheck.issues.join('. ')}`
        : `Initial screening passed: ${rulesCheck.rulesMatched.join('. ')}`,
      recommendations: rulesCheck.issues.length > 0
        ? ['Consult with an immigration expert for detailed assessment', 'Review specific visa requirements']
        : ['Proceed with detailed application process', 'Gather required documentation'],
      nextSteps: ['Schedule a consultation', 'Review documentation requirements'],
      rulesMatched: rulesCheck.rulesMatched,
    }
  }
}

/**
 * Format eligibility results for user display
 */
export function formatEligibilityResults(
  result: EligibilityResult,
  language: 'EN' | 'NL' | 'ES' | 'PA' = 'EN'
): string {
  const translations = {
    EN: {
      eligible: 'Eligible',
      notEligible: 'Not Eligible',
      possiblyEligible: 'Possibly Eligible',
      reasoning: 'Assessment',
      recommendations: 'Recommendations',
      nextSteps: 'Next Steps',
      confidence: 'Confidence Level',
    },
    NL: {
      eligible: 'Geschikt',
      notEligible: 'Niet Geschikt',
      possiblyEligible: 'Mogelijk Geschikt',
      reasoning: 'Beoordeling',
      recommendations: 'Aanbevelingen',
      nextSteps: 'Volgende Stappen',
      confidence: 'Betrouwbaarheidsniveau',
    },
    ES: {
      eligible: 'Elegible',
      notEligible: 'No Elegible',
      possiblyEligible: 'Posiblemente Elegible',
      reasoning: 'Evaluación',
      recommendations: 'Recomendaciones',
      nextSteps: 'Próximos Pasos',
      confidence: 'Nivel de Confianza',
    },
    PA: {
      eligible: 'Elegibel',
      notEligible: 'No Elegibel',
      possiblyEligible: 'Posibelmente Elegibel',
      reasoning: 'Evaluashon',
      recommendations: 'Recomendashonnan',
      nextSteps: 'Siguiente Pasonan',
      confidence: 'Nivel di Konfiansa',
    },
  }

  const t = translations[language]

  let statusText = ''
  if (result.confidence >= 0.8 && result.eligible) {
    statusText = `✅ ${t.eligible}`
  } else if (result.confidence >= 0.5) {
    statusText = `⚠️ ${t.possiblyEligible}`
  } else {
    statusText = `❌ ${t.notEligible}`
  }

  let output = `${statusText}\n\n`
  output += `**${t.reasoning}:**\n${result.reasoning}\n\n`

  if (result.recommendations.length > 0) {
    output += `**${t.recommendations}:**\n`
    result.recommendations.forEach((rec, i) => {
      output += `${i + 1}. ${rec}\n`
    })
    output += '\n'
  }

  if (result.nextSteps.length > 0) {
    output += `**${t.nextSteps}:**\n`
    result.nextSteps.forEach((step, i) => {
      output += `${i + 1}. ${step}\n`
    })
  }

  return output
}
