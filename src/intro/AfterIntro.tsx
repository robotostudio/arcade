'use client'

import { useIntro } from './store'

// Fades hub chrome in once the intro has landed.
export function AfterIntro({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const done = useIntro((s) => s.phase === 'done')
  return <div className={`${className} transition-opacity duration-700 ${done ? 'opacity-80' : 'opacity-0'}`}>{children}</div>
}
