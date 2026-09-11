import { useSyncExternalStore } from 'react'
import type { Persona, PersonaAuth } from './persona'

/**
 * Subscribe a React component to a {@link PersonaAuth} shim. Re-renders on every
 * login / logout and returns the live persona view. React is an OPTIONAL peer —
 * this hook is exported only from `@fams/demo-kit/react`, so the core entry
 * stays React-free.
 */
export function usePersona(auth: PersonaAuth): {
  persona: Persona | null
  privileges: string[]
  userType: string
} {
  const persona = useSyncExternalStore(
    auth.subscribe,
    () => auth.current(),
    () => auth.current(),
  )
  return {
    persona,
    privileges: auth.privileges(),
    userType: auth.userType(),
  }
}

export type { PersonaAuth, Persona } from './persona'
