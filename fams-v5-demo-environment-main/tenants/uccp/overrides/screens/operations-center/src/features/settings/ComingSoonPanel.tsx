import type { LucideIcon } from 'lucide-react'
import { ComingSoonState } from '../../components/ComingSoonState'

/** Placeholder for the settings modules not built yet — everything except Notifications Configuration. */
export function ComingSoonPanel({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return <ComingSoonState label={label} icon={Icon} description="This settings module hasn't been built yet." />
}
