import { enniaTheme } from '@/lib/demo-themes/ennia'

interface EnniaLogoProps {
  variant?: 'light' | 'dark'
  className?: string
}

/** Official ENNIA logos from ennia.com */
export default function EnniaLogo({ variant = 'light', className = '' }: EnniaLogoProps) {
  const isLightBg = variant === 'dark'
  const src = isLightBg ? enniaTheme.logo.green : enniaTheme.logo.white
  const width = isLightBg ? enniaTheme.logo.greenWidth : enniaTheme.logo.whiteWidth
  const height = isLightBg ? enniaTheme.logo.greenHeight : enniaTheme.logo.whiteHeight

  return (
    <img
      src={src}
      alt="ENNIA"
      width={width}
      height={height}
      className={`h-8 w-auto ${className}`}
      loading="eager"
    />
  )
}
