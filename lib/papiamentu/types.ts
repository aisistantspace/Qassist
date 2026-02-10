/**
 * Papiamentu correction layer – types.
 * No app-specific dependencies; reusable.
 */

export type PapiamentuLocale = 'pap-CW' | 'pap-AW'

export type CorrectionChangeType = 'spelling' | 'orthography' | 'variant'

export interface CorrectionChange {
  from: string
  to: string
  type: CorrectionChangeType
}

export interface CorrectPapiamentuOptions {
  locale?: PapiamentuLocale
  strict?: boolean
}

export interface CorrectPapiamentuResult {
  corrected: string
  changes?: CorrectionChange[]
}
