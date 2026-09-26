import { useCallback, useRef } from 'react'

// The Shell's prompt contract (issue 12): a Machine reports one "Key: verb" line per phase. This sends it
// once per change, so a Machine may call it from useFrame.
export function usePrompt(onPrompt?: (prompt: string) => void): (prompt: string) => void {
  const last = useRef<string | null>(null)
  const handler = useRef(onPrompt)
  handler.current = onPrompt
  return useCallback((prompt: string) => {
    if (prompt === last.current) return
    last.current = prompt
    handler.current?.(prompt)
  }, [])
}
