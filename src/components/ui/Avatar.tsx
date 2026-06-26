interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE: Record<string, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-16 h-16 text-xl',
}

export default function Avatar({ name, photoUrl, size = 'md', className = '' }: AvatarProps) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const sz = SIZE[size]

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sz} rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <div className={`${sz} rounded-full bg-primary-600 text-white flex items-center justify-center font-bold shrink-0 ${className}`}>
      {initials}
    </div>
  )
}
