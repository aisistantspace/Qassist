import { enniaTheme } from '@/lib/demo-themes/ennia'

interface EnniaLogoProps {
  variant?: 'light' | 'dark'
  className?: string
}

export default function EnniaLogo({ variant = 'light', className = '' }: EnniaLogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-[#0A2E4D]'

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} role="img" aria-label="ENNIA">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${enniaTheme.colors.cyan} 0%, ${enniaTheme.colors.cyanDark} 100%)`,
        }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor" aria-hidden>
          <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V6l-8-4zm0 2.18l6 3v4.82c0 4.12-2.62 7.97-6 9.05-3.38-1.08-6-4.93-6-9.05V7.18l6-3z" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`text-2xl font-black tracking-tight ${textColor}`}>ENNIA</span>
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 ${
            variant === 'light' ? 'text-white/60' : 'text-[#6BB4C5]'
          }`}
        >
          Feel Secure
        </span>
      </div>
    </div>
  )
}
