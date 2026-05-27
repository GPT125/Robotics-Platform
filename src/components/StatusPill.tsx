import { CheckCircle2, CloudOff, Loader2, TriangleAlert } from 'lucide-react';
import type { SyncState } from '../types';

export function SyncPill({ state }: { state: SyncState }) {
  const config = {
    local_only: { label: 'Local only', icon: CloudOff, cls: 'border-slate-500/40 text-slate-300 bg-slate-500/10' },
    syncing: { label: 'Syncing', icon: Loader2, cls: 'border-primary/40 text-primary bg-primary/10' },
    synced: { label: 'Synced', icon: CheckCircle2, cls: 'border-good/40 text-good bg-good/10' },
    conflict: { label: 'Conflict', icon: TriangleAlert, cls: 'border-vex/40 text-vex bg-vex/10' },
    failed: { label: 'Failed', icon: TriangleAlert, cls: 'border-bad/40 text-bad bg-bad/10' },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${config.cls}`}>
      <config.icon className={state === 'syncing' ? 'animate-spin' : ''} size={13} />
      {config.label}
    </span>
  );
}
