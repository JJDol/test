/**
 * MilestoneBar — chevron-style phase navigation for the project detail page.
 *
 * Visual: a horizontal row of arrow-shaped chevrons (one per canonical phase)
 * with a "CURRENT PHASE" callout sitting above the active slot and deadline
 * labels rendered beneath each slot. Heavily inspired by progress-bar
 * illustrations: the shape itself communicates forward motion, the colours
 * communicate status.
 *
 * Interaction rules (unchanged from the previous iteration):
 *   - Hover any chevron to see the full phase name.
 *   - Click a real phase to select it (URL `?phase=<id>`).
 *   - Leader / admin clicking an irrelevant chevron opens an "Add to project"
 *     popover with an optional deadline picker.
 */

"use client";

import * as React from "react";
import { Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  MilestoneSlot,
  MilestoneVisualState,
  PhaseDefinition,
} from "@/lib/phases/types";

// Visual constants — kept in one place so the chevron geometry stays
// self-consistent.
//   NOTCH: depth of the arrow-point / back-notch (controls the "sharpness"
//          of each chevron).
//   GAP  : tiny air space between adjacent chevrons. Achieved by pulling
//          the arrow tip inward by GAP px while keeping the back-notch at
//          its natural position — the result is a uniform diagonal sliver
//          of background visible between every pair of slots, regardless
//          of whether they are both filled, both outlined, or mixed.
//   CHEVRON_HEIGHT: overall vertical footprint of a chevron.
const NOTCH = 10;
const GAP = 2;
const CHEVRON_HEIGHT = 30;

export interface MilestoneBarProps {
  slots: MilestoneSlot[];
  activePhaseId: string | null;
  onSelectPhase: (phaseId: string) => void;
  /** Invoked when leader/admin confirms "add phase" on an irrelevant slot. */
  onAddPhase?: (
    definitionId: string,
    deadline: string | null
  ) => Promise<unknown> | void;
  canManagePhases?: boolean;
  className?: string;
}

export function MilestoneBar({
  slots,
  activePhaseId,
  onSelectPhase,
  onAddPhase,
  canManagePhases = false,
  className,
}: MilestoneBarProps) {
  if (slots.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted/30 px-4 py-3 text-xs text-muted-foreground",
          className
        )}
      >
        Phase catalog not available for this company.
      </div>
    );
  }

  return (
    <div
      className={cn("w-full px-1 pb-1.5 pt-4", className)}
      role="navigation"
      aria-label="Project phase milestones"
    >
      {/* Each chevron column is given `flex-1` so the whole bar naturally
          spans the available horizontal space — matching the width of
          surrounding sections. */}
      <div className="flex w-full items-start">
        {slots.map((slot, index) => (
          <ChevronColumn
            key={slot.definition.id}
            slot={slot}
            isFirst={index === 0}
            isActive={
              !!slot.projectPhase && slot.projectPhase.id === activePhaseId
            }
            onSelectPhase={onSelectPhase}
            onAddPhase={onAddPhase}
            canManagePhases={canManagePhases}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column (CURRENT badge + chevron + deadline stacked vertically)
// ---------------------------------------------------------------------------

interface ChevronColumnProps {
  slot: MilestoneSlot;
  isFirst: boolean;
  isActive: boolean;
  onSelectPhase: (phaseId: string) => void;
  onAddPhase?: (
    definitionId: string,
    deadline: string | null
  ) => Promise<unknown> | void;
  canManagePhases: boolean;
}

function ChevronColumn({
  slot,
  isFirst,
  isActive,
  onSelectPhase,
  onAddPhase,
  canManagePhases,
}: ChevronColumnProps) {
  const [addOpen, setAddOpen] = React.useState(false);
  const { definition, projectPhase, state, isLocked } = slot;

  const isCurrent = state === "current";
  const isIrrelevant = state === "irrelevant";
  const canOpenAdd = isIrrelevant && canManagePhases;

  const deadlineLabel = projectPhase?.deadline
    ? formatDeadline(projectPhase.deadline)
    : null;

  const handleClick = () => {
    if (projectPhase) {
      onSelectPhase(projectPhase.id);
      return;
    }
    if (canOpenAdd) {
      setAddOpen(true);
    }
  };

  // Chevron geometry:
  //   - first slot: flat left edge (no back-notch) so the very start of the
  //     bar reads as a clean rectangular cap;
  //   - every other slot: back-notch on the left + arrow point on the right,
  //     offset by `-NOTCH` so the notch swallows the previous slot's point.
  const clipPath = isFirst ? FIRST_CHEVRON_CLIP : UNIFORM_CHEVRON_CLIP;
  const horizontalPadding = isFirst
    ? FIRST_CHEVRON_PADDING
    : UNIFORM_CHEVRON_PADDING;

  // Display label — we render "Phase N" in the bar rather than the raw
  // short code (P1/P2/…) stored on the definition. Keeps the UI readable at
  // a glance without touching the DB schema.
  const displayLabel = `Phase ${definition.display_order}`;

  // Irrelevant slots get a *different* render path: instead of a filled,
  // CSS-clipped chevron we draw the chevron outline as dashed SVG strokes
  // with strike-through text. CSS `border` would be clipped by clip-path
  // so SVG gives us reliable dashed strokes at the exact pixel geometry.
  const chevronButton = isIrrelevant ? (
    <IrrelevantChevronButton
      label={displayLabel}
      isFirst={isFirst}
      canOpen={canManagePhases}
      onClick={handleClick}
      aria={definition.name}
    />
  ) : (
    <button
      type="button"
      onClick={handleClick}
      aria-label={definition.name}
      aria-current={isCurrent ? "step" : undefined}
      className={cn(
        "relative flex w-full items-center justify-center text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        chevronStateClasses(state),
        isCurrent && "text-sm font-bold"
      )}
      style={{
        clipPath,
        height: CHEVRON_HEIGHT,
        paddingLeft: horizontalPadding.left,
        paddingRight: horizontalPadding.right,
        marginLeft: isFirst ? 0 : -NOTCH,
        ...chevronStateStyle(state),
      }}
    >
      {displayLabel}
    </button>
  );

  // "CURRENT PHASE" pill + connector line sit above the active chevron. The
  // vertical bar borrows the visual language from timeline-style diagrams so
  // it's clear where the project is "right now".
  const currentBadge = isCurrent ? (
    <div className="pointer-events-none absolute left-1/2 -top-4 flex -translate-x-1/2 flex-col items-center">
      <span className="whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
        Current phase
      </span>
      <span className="h-1.5 w-px bg-primary/70" />
    </div>
  ) : null;

  // Lock badge: small circle in the chevron's top-right corner. Positioned
  // relative to the column so the badge doesn't get clipped by the chevron's
  // clip-path.
  const lockBadge = isLocked ? (
    <span
      title="Locked"
      className="absolute right-1 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border"
      style={{ zIndex: 2 }}
    >
      <Lock className="h-2.5 w-2.5" />
    </span>
  ) : null;

  // Hover tooltip with the full name. Lives on the column (not the chevron)
  // so it isn't clipped away by `clip-path`. Floats above the chevron — for
  // the current slot it simply overlays the "CURRENT PHASE" pill.
  const tooltip = (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-md group-hover:block"
    >
      {definition.name}
      {isIrrelevant && (
        <span className="ml-1 opacity-70">· not in project</span>
      )}
    </span>
  );

  const column = (
    <div
      className={cn(
        "group relative flex min-w-0 flex-1 flex-col items-stretch",
        isCurrent && "z-10"
      )}
      // Give the current slot a little more weight so the CURRENT PHASE pill
      // and full-name tooltip never collide with neighbours on narrow widths.
      style={isCurrent ? { flexGrow: 1.35 } : undefined}
    >
      {currentBadge}
      {lockBadge}
      {chevronButton}

      {/* Row 2: deadline label, centered under the chevron */}
      <div
        className={cn(
          "mt-1.5 text-center text-[10px] font-medium leading-tight",
          isCurrent ? "text-foreground" : "text-muted-foreground/80",
          !deadlineLabel && "invisible"
        )}
        // Match the chevron's horizontal offset so the label hangs beneath
        // the visible shape, not beneath the hidden notch area.
        style={{ marginLeft: isFirst ? 0 : -NOTCH }}
      >
        {deadlineLabel ?? "—"}
      </div>

      {/* Active-but-not-current indicator: subtle underline below the
          deadline to show "you are viewing this phase" without stealing
          attention from the CURRENT PHASE callout. */}
      {isActive && !isCurrent && (
        <div
          className="mx-auto mt-0.5 h-0.5 w-8 rounded-full bg-primary"
          style={{ marginLeft: isFirst ? undefined : -NOTCH / 2 }}
        />
      )}

      {tooltip}
    </div>
  );

  if (canOpenAdd) {
    return (
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>{column}</PopoverTrigger>
        <PopoverContent align="center" className="w-80">
          <AddPhaseForm
            definition={definition}
            onCancel={() => setAddOpen(false)}
            onConfirm={async (deadline) => {
              if (onAddPhase) {
                await onAddPhase(definition.id, deadline);
              }
              setAddOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return column;
}

// ---------------------------------------------------------------------------
// Irrelevant chevron: SVG dashed outline + strike-through label
// ---------------------------------------------------------------------------
//
// We render this as a plain <button> wrapping an inline <svg>. The SVG
// polygon uses the same NOTCH geometry as the CSS clip-path siblings, but
// in pure pixel coordinates based on the measured width — so the dashed
// stroke never stretches / distorts and aligns perfectly with adjacent
// filled chevrons.

interface IrrelevantChevronButtonProps {
  label: string;
  isFirst: boolean;
  canOpen: boolean;
  aria: string;
  onClick: () => void;
}

function IrrelevantChevronButton({
  label,
  isFirst,
  canOpen,
  aria,
  onClick,
}: IrrelevantChevronButtonProps) {
  const wrapperRef = React.useRef<HTMLButtonElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Polygon points in pixel space — mirrors the CSS clip-path used by
  // filled siblings (tip inset by GAP) so the dashed outline keeps the
  // same uniform sliver of air between neighbouring slots.
  const h = CHEVRON_HEIGHT;
  const points = React.useMemo(() => {
    if (width <= 0) return "";
    const tipX = width - GAP;
    const baseX = width - NOTCH - GAP;
    if (isFirst) {
      // Flat left, arrow right.
      return `0,0 ${baseX},0 ${tipX},${h / 2} ${baseX},${h} 0,${h}`;
    }
    // Back-notch + arrow.
    return `0,0 ${baseX},0 ${tipX},${h / 2} ${baseX},${h} 0,${h} ${NOTCH},${h / 2}`;
  }, [width, isFirst, h]);

  return (
    <button
      type="button"
      ref={wrapperRef}
      onClick={onClick}
      aria-label={aria}
      disabled={!canOpen}
      className={cn(
        "relative flex w-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-neutral-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        canOpen ? "hover:text-neutral-700" : "cursor-not-allowed"
      )}
      style={{
        height: CHEVRON_HEIGHT,
        paddingLeft: isFirst ? 12 : 12 + NOTCH,
        paddingRight: 12 + NOTCH + GAP,
        marginLeft: isFirst ? 0 : -NOTCH,
      }}
    >
      {width > 0 && (
        <svg
          aria-hidden="true"
          width={width}
          height={h}
          className="pointer-events-none absolute left-0 top-0"
        >
          <polygon
            points={points}
            fill="transparent"
            stroke="currentColor"
            strokeOpacity={0.55}
            strokeWidth={1.25}
            strokeDasharray="5 3"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <span
        className="relative inline-flex items-center gap-1"
        style={{
          // Explicit strike-through so the "not in project" state is legible
          // without relying on colour alone.
          textDecorationLine: "line-through",
          textDecorationThickness: "1.25px",
          textDecorationSkipInk: "none",
        }}
      >
        {label}
        {canOpen && <Plus className="h-3 w-3 opacity-60" />}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Add-phase popover form (unchanged behaviour)
// ---------------------------------------------------------------------------

function AddPhaseForm({
  definition,
  onConfirm,
  onCancel,
}: {
  definition: PhaseDefinition;
  onConfirm: (deadline: string | null) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [deadline, setDeadline] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Add phase
        </div>
        <div className="mt-0.5 text-sm font-semibold leading-tight">
          {definition.name}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Phase {definition.display_order}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="milestone-add-deadline" className="text-xs">
          Deadline (optional)
        </Label>
        <Input
          id="milestone-add-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            setSubmitting(true);
            try {
              await onConfirm(deadline || null);
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add to project"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geometry + theming helpers
// ---------------------------------------------------------------------------

// Every non-leading chevron has a back-notch + arrow point. The tip is
// pulled inward by GAP px so adjacent slots leave a uniform diagonal
// sliver of background between them.
const UNIFORM_CHEVRON_CLIP = `polygon(0 0, calc(100% - ${NOTCH + GAP}px) 0, calc(100% - ${GAP}px) 50%, calc(100% - ${NOTCH + GAP}px) 100%, 0 100%, ${NOTCH}px 50%)`;
const UNIFORM_CHEVRON_PADDING = { left: 12 + NOTCH, right: 12 + NOTCH + GAP };

// First slot is special: its left edge is flat (rectangular) so the bar
// terminates cleanly on the left. Still has an arrow point on the right
// (also inset by GAP so the P1→P2 transition matches the rest of the bar).
const FIRST_CHEVRON_CLIP = `polygon(0 0, calc(100% - ${NOTCH + GAP}px) 0, calc(100% - ${GAP}px) 50%, calc(100% - ${NOTCH + GAP}px) 100%, 0 100%)`;
const FIRST_CHEVRON_PADDING = { left: 12, right: 12 + NOTCH + GAP };

function chevronStateClasses(state: MilestoneVisualState): string {
  switch (state) {
    case "completed":
      // Background + hatch are applied via inline style (see
      // chevronStateStyle). Here we only set the text colour.
      return "text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100";
    case "current":
      return "bg-primary text-primary-foreground shadow-sm";
    case "upcoming":
      // Pure neutral grey (no blue/cool undertone).
      return "bg-neutral-400 text-white hover:bg-neutral-500 dark:bg-neutral-500 dark:hover:bg-neutral-400";
    case "irrelevant":
      // Not actually used — irrelevant slots render via IrrelevantChevronButton
      // which uses an SVG dashed outline instead of a filled chevron.
      return "";
    case "locked":
      return "bg-neutral-300 text-neutral-600";
  }
}

// Inline style overrides — currently only `completed`, which paints a
// 45° diagonal hatch pattern on top of a pale neutral base. Pattern is
// expressed via a repeating linear gradient so it scales with the chevron
// regardless of the clip-path geometry.
function chevronStateStyle(state: MilestoneVisualState): React.CSSProperties {
  if (state !== "completed") return {};
  return {
    backgroundColor: "rgb(245 245 245)", // neutral-100 — pale base
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent 0 5px, rgba(115, 115, 115, 0.55) 5px 6px)",
  };
}

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
