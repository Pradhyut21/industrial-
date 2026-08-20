import { createFileRoute, redirect } from '@tanstack/react-router'

// This route was deprecated in DeadMind v2 (Continuity Intelligence Platform).
// Reliability Engineer Lessons Learned Engine functionality is now superseded by
// the Continuity Vault's Task Explainer gap analysis (Section 2.9) and unresolved-items list.
// The backend /api/lessons-learned endpoint remains available for programmatic access.
export const Route = createFileRoute('/lessons')({
  beforeLoad: () => {
    throw redirect({ to: '/vault' })
  },
  component: () => null,
})
