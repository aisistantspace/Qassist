/** ENNIA design tokens — from ennia.com styles.css (Signika, green-dark #307E57) */
export const enniaTheme = {
  colors: {
    greenDark: '#307E57',
    greenDarker: '#183D2B',
    greenBg: '#EEF6E5',
    greenAccent: '#B9D994',
    greenLight: '#CCEAD8',
    greenBorder: '#CBDED5',
    grayGreen: '#B1BAAE',
    text: '#3D3C4A',
    textMuted: '#6B7280',
    white: '#FFFFFF',
  },
  logo: {
    white: '/ennia/logo-white.webp',
    green: '/ennia/logo-green.webp',
    whiteWidth: 77,
    whiteHeight: 32,
    greenWidth: 130,
    greenHeight: 30,
  },
  tagline: 'Feel Secure',
  website: 'https://www.ennia.com',
  branding: {
    primaryColor: '#307E57',
    agentName: 'ENNIA Assistant',
    widgetTitle: 'ENNIA Chat',
    welcomeMessage: 'Welcome to ENNIA! How can we help you today?',
    defaultLanguage: 'EN',
    logoUrl: '/ennia/logo-green.webp',
    faviconUrl: '/ennia/favicon-32x32.png',
  },
} as const

export function isEnniaBrand(companyName?: string | null, primaryColor?: string | null): boolean {
  const name = (companyName || '').toLowerCase()
  const color = (primaryColor || '').toLowerCase()
  return name.includes('ennia') || color === enniaTheme.branding.primaryColor.toLowerCase()
}
