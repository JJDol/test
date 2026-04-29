"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Search,
  Users,
  UserCircle2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import {
  ALL_DISCIPLINE_FILTERS,
  DISCIPLINES,
  Discipline,
  DisciplineOrUnassigned,
} from "@/lib/team/disciplines";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface TemplateAssignment {
  templateName: string;
  category: DocumentCategory | null;
  isAssignee: boolean;
  isSupervisor: boolean;
}

interface ProjectAssignment {
  projectId: string;
  projectName: string;
  isLeader: boolean;
  isWorker: boolean;
  templates: TemplateAssignment[];
}

interface RawMember {
  id: string;
  name: string;
  email: string;
  role: string;
  discipline: Discipline | null;
  assignments: ProjectAssignment[];
}

interface DerivedMember extends RawMember {
  projectCount: number;
  documentCount: number;
}


export default function TeamPage() {
  const { isCompanyAdmin } = useAuth();
  const [members, setMembers] = useState<RawMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<
    Set<DisciplineOrUnassigned>
  >(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Called by the discipline editor — mutates the local cache so the UI
  // updates immediately without a full refetch.
  const updateMemberDiscipline = (
    userId: string,
    discipline: Discipline | null
  ) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, discipline } : m))
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/team/members");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Failed to load team members");
        }
        setMembers(data.members || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load team members"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const derived: DerivedMember[] = useMemo(() => {
    return members.map((m) => {
      const documentCount = m.assignments.reduce(
        (acc, a) => acc + a.templates.length,
        0
      );
      return {
        ...m,
        projectCount: m.assignments.length,
        documentCount,
      };
    });
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return derived.filter((m) => {
      if (q) {
        const hit =
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (disciplineFilter.size > 0) {
        const key: DisciplineOrUnassigned = m.discipline ?? "Unassigned";
        if (!disciplineFilter.has(key)) return false;
      }
      return true;
    });
  }, [derived, search, disciplineFilter]);

  // Auto-select the first visible member the first time the list becomes
  // populated, or whenever the current selection is filtered out.
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillVisible = filtered.some((m) => m.id === selectedId);
    if (!stillVisible) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => derived.find((m) => m.id === selectedId) || null,
    [derived, selectedId]
  );

  const toggleDiscipline = (d: DisciplineOrUnassigned) => {
    setDisciplineFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const activeFilterCount = disciplineFilter.size;

  // Aggregate counts for the filter chips (ignores the discipline filter
  // itself so counts stay stable while toggling; respects the search filter
  // so counts reflect what's visible).
  const disciplineCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q
      ? derived.filter(
          (m) =>
            m.name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q)
        )
      : derived;
    const counts: Record<DisciplineOrUnassigned, number> = {
      Architect: 0,
      Engineer: 0,
      Fire: 0,
      Constructor: 0,
      Unassigned: 0,
    };
    for (const m of pool) {
      const key: DisciplineOrUnassigned = m.discipline ?? "Unassigned";
      counts[key]++;
    }
    return counts;
  }, [derived, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every company member and what they&apos;re working on. Click a
            member to see their projects and document assignments.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="space-y-3 border-b pb-4">
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Discipline
          </span>
          {ALL_DISCIPLINE_FILTERS.map((d) => {
            const active = disciplineFilter.has(d);
            const count = disciplineCounts[d];
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDiscipline(d)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                  active
                    ? "border-foreground text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                )}
              >
                {d}
                <span
                  className={cn(
                    "inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setDisciplineFilter(new Set())}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Master-detail */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No team members match the current filters.
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground px-1 -mb-2">
            Showing <span className="font-medium">{filtered.length}</span> of{" "}
            <span className="font-medium">{derived.length}</span> members
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
            {/* Left: list */}
            <div className="space-y-1.5">
              {filtered.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  selected={m.id === selectedId}
                  onSelect={() => setSelectedId(m.id)}
                />
              ))}
            </div>

            {/* Right: details */}
            <div className="lg:sticky lg:top-4">
              {selected ? (
                <MemberDetailPanel
                  member={selected}
                  canEditDiscipline={isCompanyAdmin}
                  onDisciplineChange={(d) =>
                    updateMemberDiscipline(selected.id, d)
                  }
                />
              ) : (
                <EmptyDetail />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MemberRow({
  member,
  selected,
  onSelect,
}: {
  member: DerivedMember;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border bg-background px-3 py-2.5 transition-colors",
        "hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        selected
          ? "border-primary ring-2 ring-primary/30 bg-accent/30"
          : "border-border"
      )}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-4 min-w-0">
        <UserAvatar
          user={{ id: member.id, name: member.name, email: member.email }}
          size="md"
        />
        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate text-sm">
            {member.name || member.email}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {member.email}
          </div>
        </div>

        {/* Discipline chip — centered between the info and the counts */}
        <div className="flex justify-center shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-border bg-transparent font-medium text-sm px-2.5 py-1",
              member.discipline ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {member.discipline ?? "Unassigned"}
          </span>
        </div>

        {/* Stats — two lines, right-aligned */}
        <div className="text-[11px] text-muted-foreground shrink-0 tabular-nums text-right leading-tight">
          <div>
            {member.projectCount} project
            {member.projectCount !== 1 ? "s" : ""}
          </div>
          <div>
            {member.documentCount} document
            {member.documentCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyDetail() {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
      <UserCircle2 className="h-8 w-8 text-muted-foreground/50" />
      Select a team member to see their projects and document assignments.
    </div>
  );
}

function MemberDetailPanel({
  member,
  canEditDiscipline,
  onDisciplineChange,
}: {
  member: DerivedMember;
  canEditDiscipline: boolean;
  onDisciplineChange: (d: Discipline | null) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 border-b bg-muted/60">
        <UserAvatar
          user={{ id: member.id, name: member.name, email: member.email }}
          size="lg"
        />
        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold truncate">
            {member.name || member.email}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {member.email}
          </div>
        </div>
        {/* Discipline editor — sits halfway between info and stats */}
        <div className="shrink-0 ml-12">
          <DisciplineEditor
            userId={member.id}
            discipline={member.discipline}
            canEdit={canEditDiscipline}
            onChange={onDisciplineChange}
          />
        </div>
        {/* Equal-weight spacer so the chip lands in the middle of the
            remaining space between the info and the stats */}
        <div className="flex-1" aria-hidden />
        {/* Stats */}
        <div className="text-right text-xs text-muted-foreground shrink-0 tabular-nums">
          <div>
            <span className="font-medium text-foreground text-sm">
              {member.projectCount}
            </span>{" "}
            project{member.projectCount !== 1 ? "s" : ""}
          </div>
          <div>
            <span className="font-medium text-foreground text-sm">
              {member.documentCount}
            </span>{" "}
            document{member.documentCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Projects + assignments */}
      <div className="p-5">
        {member.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Not assigned to any active project.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {member.assignments.map((a) => (
              <li
                key={a.projectId}
                className="rounded-md border bg-background p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <Link
                    href={`/protected/dashboard/project/${a.projectId}`}
                    className="text-sm font-medium hover:underline truncate"
                  >
                    {a.projectName}
                  </Link>
                  <div className="flex flex-wrap gap-1">
                    {a.isLeader && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Leader
                      </span>
                    )}
                    {a.isWorker && !a.isLeader && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Worker
                      </span>
                    )}
                  </div>
                </div>

                <AssignmentDocumentsToggle assignment={a} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DisciplineEditor({
  userId,
  discipline,
  canEdit,
  onChange,
}: {
  userId: string;
  discipline: Discipline | null;
  canEdit: boolean;
  onChange: (d: Discipline | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const save = async (next: Discipline | null) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update discipline");
      }
      onChange(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-start gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border border-border bg-transparent font-medium text-base px-3 py-1.5",
            discipline ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {discipline ?? "Unassigned"}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>
    );
  }

  const selectorChipClass = (active: boolean) =>
    cn(
      "inline-flex items-center rounded-full border px-3 py-1.5 text-base font-medium transition-colors cursor-pointer",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
      saving && "opacity-60 cursor-wait"
    );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-start gap-1.5">
        {DISCIPLINES.map((d) => {
          const active = d === discipline;
          return (
            <button
              key={d}
              type="button"
              disabled={saving}
              onClick={() => save(d)}
              className={selectorChipClass(active)}
            >
              {d}
            </button>
          );
        })}
        <button
          type="button"
          disabled={saving}
          onClick={() => save(null)}
          className={selectorChipClass(discipline === null)}
        >
          Unassigned
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={cancelEdit}
          disabled={saving}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
        {saving && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
      </div>
      {error && (
        <div className="text-xs text-destructive">{error}</div>
      )}
    </div>
  );
}

function AssignmentDocumentsToggle({
  assignment,
}: {
  assignment: ProjectAssignment;
}) {
  const [open, setOpen] = useState(false);
  const count = assignment.templates.length;

  if (count === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No documents assigned on this project.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span>View assigned documents</span>
        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
          {count}
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1 mt-2">
          {assignment.templates.map((t) => (
            <li
              key={t.templateName}
              className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs"
              title={
                t.category
                  ? `${getCategoryDisplayName(t.category)}${
                      t.isSupervisor ? " · supervisor" : ""
                    }`
                  : t.isSupervisor
                  ? "Supervisor"
                  : undefined
              }
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{t.templateName}</span>
              {t.category && (
                <span className="rounded bg-muted px-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
                  {getCategoryDisplayName(t.category)}
                </span>
              )}
              {t.isSupervisor && (
                <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
                  supv.
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
