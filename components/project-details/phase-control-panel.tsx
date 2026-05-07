/**
 * PhaseControlPanel — companion UI that sits under the MilestoneBar.
 *
 * Responsibilities:
 *   1. Render a hold banner when the project is on hold, with a toggle for
 *      leader/admin users.
 *   2. Surface metadata for the currently-viewed phase (deadline, lock
 *      status) and expose lock + "mark as current" actions to leader/admin.
 *
 * The component is intentionally presentational — all mutations flow through
 * callbacks supplied by `useProjectPhases`. Keeps the phase surface area of
 * the project detail page easy to reason about.
 */

"use client";

import * as React from "react";
import {
  CalendarClock,
  Flag,
  Lock,
  PauseCircle,
  PlayCircle,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectPhaseFull } from "@/lib/phases/types";
import { formatDate } from "@/utils/project-utils";

export interface PhaseControlPanelProps {
  activePhase: ProjectPhaseFull | null;
  currentPhase: ProjectPhaseFull | null;
  hold: {
    is_on_hold: boolean;
    on_hold_by: string | null;
    on_hold_at: string | null;
    on_hold_note: string | null;
  };
  canManage: boolean;
  onUpdatePhase: (
    phaseId: string,
    patch: {
      deadline?: string | null;
      is_current?: boolean;
      is_locked?: boolean;
    }
  ) => Promise<void>;
  onSetHold: (input: {
    is_on_hold: boolean;
    note?: string;
  }) => Promise<void>;
}

export function PhaseControlPanel({
  activePhase,
  currentPhase,
  hold,
  canManage,
  onUpdatePhase,
  onSetHold,
}: PhaseControlPanelProps) {
  return (
    <div className="space-y-3">
      {/* Hold banner */}
      {hold.is_on_hold && (
        <HoldBanner
          hold={hold}
          canManage={canManage}
          onResume={() => onSetHold({ is_on_hold: false })}
        />
      )}

      {/* Selected-phase control row */}
      {activePhase && (
        <PhaseMetaRow
          activePhase={activePhase}
          currentPhase={currentPhase}
          canManage={canManage}
          onUpdatePhase={onUpdatePhase}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-pieces
// ---------------------------------------------------------------------------

function HoldBanner({
  hold,
  canManage,
  onResume,
}: {
  hold: PhaseControlPanelProps["hold"];
  canManage: boolean;
  onResume: () => Promise<void> | void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
      <PauseCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-[180px]">
        <div className="text-sm font-semibold">Project is on hold</div>
        {hold.on_hold_note && (
          <div className="mt-0.5 text-xs opacity-90">{hold.on_hold_note}</div>
        )}
        {hold.on_hold_at && (
          <div className="mt-0.5 text-[11px] opacity-70">
            Since {new Date(hold.on_hold_at).toLocaleString()}
          </div>
        )}
      </div>
      {canManage && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 bg-background"
          onClick={() => onResume()}
        >
          <PlayCircle className="h-3.5 w-3.5" />
          Resume
        </Button>
      )}
    </div>
  );
}

function PhaseMetaRow({
  activePhase,
  currentPhase,
  canManage,
  onUpdatePhase,
}: {
  activePhase: ProjectPhaseFull;
  currentPhase: ProjectPhaseFull | null;
  canManage: boolean;
  onUpdatePhase: (
    phaseId: string,
    patch: {
      deadline?: string | null;
      is_current?: boolean;
      is_locked?: boolean;
    }
  ) => Promise<void>;
}) {
  const isCurrent = activePhase.is_current;
  const isViewingPast =
    currentPhase != null &&
    activePhase.definition.display_order < currentPhase.definition.display_order;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background px-4 py-3">
      {/* Phase name — "Phase N" / "Current" info is already visible on the
          milestone bar above, so here we keep things deliberately sparse:
          just a prominent flag icon, the phase name, and an inline Locked
          chip when relevant. */}
      <div className="flex min-w-[200px] flex-1 items-center gap-3">
        <Flag
          className={cn(
            "h-6 w-6 shrink-0",
            isCurrent ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold leading-tight">
            {activePhase.definition.name}
          </div>
          {activePhase.is_locked && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
        </div>
      </div>

      {/* Deadline */}
      <DeadlineField
        phaseId={activePhase.id}
        value={activePhase.deadline}
        canEdit={canManage && !activePhase.is_locked}
        onSave={async (deadline) =>
          onUpdatePhase(activePhase.id, { deadline })
        }
      />

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-1.5">
          {!isCurrent && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onUpdatePhase(activePhase.id, { is_current: true })
              }
              title={
                isViewingPast
                  ? "Re-open this phase as the current one"
                  : "Advance project to this phase"
              }
            >
              Mark as current
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              onUpdatePhase(activePhase.id, {
                is_locked: !activePhase.is_locked,
              })
            }
          >
            {activePhase.is_locked ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                Unlock
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                Lock
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function DeadlineField({
  phaseId,
  value,
  canEdit,
  onSave,
}: {
  phaseId: string;
  value: string | null;
  canEdit: boolean;
  onSave: (deadline: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(value ?? "");
  const [saving, setSaving] = React.useState(false);

  // Reset draft whenever the phase/value changes (navigating between phases).
  React.useEffect(() => {
    setDraft(value ?? "");
    setEditing(false);
  }, [phaseId, value]);

  if (!canEdit) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {value ? (
          <span>Due {formatDate(value)}</span>
        ) : (
          <span>No deadline</span>
        )}
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-xs text-muted-foreground hover:border-border hover:text-foreground"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {value ? (
          <span>Due {formatDate(value)}</span>
        ) : (
          <span>Add deadline</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 w-[160px] text-xs"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(draft || null);
            setEditing(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={saving}
        onClick={() => {
          setDraft(value ?? "");
          setEditing(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
