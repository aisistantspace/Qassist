/**
 * Insurance-specific Papiamentu prompt section for demo quality.
 */

import { getInsuranceDemoPhrases } from './load-data'

export function getPapiamentuInsurancePromptSection(): string {
  const demoPhrases = getInsuranceDemoPhrases().slice(0, 12)
  return `**INSURANCE DEMO VOCABULARY (CRITICAL):**
- seguro = insurance (noun) | segurá = to insure (verb)
- biahe = travel/trip | seguro di biahe = travel insurance
- klaim = claim (NOT Spanish "reclamo" alone in answers — prefer "klaim" or "reklamo")
- pòlisa / polisa = insurance POLICY — NEVER confuse with "polis" (police)
- kotisashon = quote | prèis / premio = price/premium
- kobertura = coverage | aksidente = accident
- reklamashon / reklamo = filing a claim
- outo = car | kas = home | bida = life | salú = health
- "mi por yudabo" = I can help YOU | "mi por tuma kontakto ku e ekipo pa bo" = I can contact the team for you
- **Links:** "Bo por bishitá e link aki" — NEVER Spanish "visita/visitar el link" or English "visit the link"
- If KB context is in English/Dutch, translate ALL facts into Papiamentu — never say you lack info when KB has the answer in another language
- Say "den mi base di konosementu" (in my knowledge base), NOT "na mi konteksto"

**EXAMPLE PHRASES YOU MAY USE:**
${demoPhrases.map((p) => `- ${p}`).join('\n')}`
}
