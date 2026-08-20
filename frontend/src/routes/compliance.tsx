import { createFileRoute, redirect } from '@tanstack/react-router'

// This route was deprecated in DeadMind v2 (Continuity Intelligence Platform).
// QHS Manager regulatory compliance mapping has been superseded by the Continuity Vault's
// unresolved-items checklist and sensitivity-scoped artifact access.
// The backend /api/compliance-gaps endpoint remains available for programmatic access.
export const Route = createFileRoute('/compliance')({
  beforeLoad: () => {
    throw redirect({ to: '/vault' })
  },
  component: () => null,
})
