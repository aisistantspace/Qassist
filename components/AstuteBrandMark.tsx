interface AstuteBrandMarkProps {
  className?: string
  size?: 'sm' | 'md'
}

/** Astute logo mark — same icon as /favicon.png and astuteweb.agency */
export default function AstuteBrandMark({ className = '', size = 'md' }: AstuteBrandMarkProps) {
  const box = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10'

  return (
    <div
      className={`inline-flex items-center justify-center ${box} rounded bg-black border border-white/10 overflow-hidden shrink-0 ${className}`}
    >
      <img
        src="/favicon.png"
        alt="Astute"
        width={40}
        height={40}
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  )
}
