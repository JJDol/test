import type { ReactNode } from "react";
import {
  DEMO_CATEGORY_FIELDS,
  DEMO_DISCIPLINES,
  DEMO_GENERAL_FIELDS,
  SAMPLE_PROJECT,
  typedFieldDisplay,
  type DemoDisciplineId,
  type DemoTypedValues,
} from "@/lib/marketing/havnegade-demo";
import { cn } from "@/lib/utils";

function generalValue(id: string, values: DemoTypedValues) {
  const field = DEMO_GENERAL_FIELDS.find((item) => item.id === id);
  return field ? typedFieldDisplay(field, values.general) : null;
}

function categoryValue(disciplineId: DemoDisciplineId, id: string, values: DemoTypedValues) {
  const field = DEMO_CATEGORY_FIELDS[disciplineId].find((item) => item.id === id);
  return field ? typedFieldDisplay(field, values.category[disciplineId]) : null;
}

type VariableTone = "general" | "discipline" | "contract";

function FactValue({
  value,
  tone = "general",
}: {
  value: string | null;
  tone?: VariableTone;
}) {
  if (!value) {
    return (
      <span className="inline-block min-w-[3.5rem] border-b border-dotted border-zinc-400 text-transparent">
        blank
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-[12px] px-0.5 text-zinc-900",
        tone === "discipline" && "bg-sky-200 shadow-[inset_0_-1px_0_rgba(14,165,233,0.35)]",
        tone === "general" && "bg-violet-300 shadow-[inset_0_-1px_0_rgba(109,40,217,0.35)]",
        tone === "contract" && "bg-amber-200 shadow-[inset_0_-1px_0_rgba(217,119,6,0.35)]"
      )}
    >
      {value}
    </span>
  );
}

function TitleStat({
  label,
  value,
  tone = "general",
}: {
  label: string;
  value: string | null;
  tone?: VariableTone;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold leading-tight text-zinc-900">
        <FactValue value={value} tone={tone} />
      </p>
    </div>
  );
}

type Facts = {
  title: string;
  disciplineId: DemoDisciplineId;
  projectNumber: string | null;
  gfa: string | null;
  basement: string | null;
  geo: string | null;
  responsible: string | null;
  height: string | null;
  storeys: string | null;
  parking: string | null;
  storeysCount: number;
  cc: string | null;
  kk: string | null;
  complexity: string | null;
  bk: string | null;
  rk: string | null;
  sleeping: string | null;
};

export function collectFacts(
  title: string,
  disciplineId: DemoDisciplineId,
  typedValues: DemoTypedValues
): Facts {
  const storeysRaw = (typedValues.category.architecture.storeys ?? "").trim();
  const storeysCount = Number.parseInt(storeysRaw, 10);
  return {
    title,
    disciplineId,
    projectNumber: generalValue("projectNumber", typedValues),
    gfa: generalValue("gfa", typedValues),
    basement: generalValue("basement", typedValues),
    geo: generalValue("geo", typedValues),
    responsible: categoryValue(disciplineId, "responsible", typedValues),
    height: categoryValue("architecture", "height", typedValues),
    storeys: categoryValue("architecture", "storeys", typedValues),
    parking: categoryValue("architecture", "parking", typedValues),
    storeysCount: Number.isFinite(storeysCount) ? storeysCount : 5,
    cc: categoryValue("construction", "cc", typedValues),
    kk: categoryValue("construction", "kk", typedValues),
    complexity: categoryValue("construction", "complexity", typedValues),
    bk: categoryValue("fire", "bk", typedValues),
    rk: categoryValue("fire", "rk", typedValues),
    sleeping: categoryValue("fire", "sleeping", typedValues),
  };
}

function ElevationWindow({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const mid = x + w / 2;
  const transom = y + h * 0.3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#e8f2f8" stroke="#27272a" strokeWidth="0.7" />
      <line x1={x} y1={transom} x2={x + w} y2={transom} stroke="#52525b" strokeWidth="0.45" />
      <line x1={mid} y1={transom} x2={mid} y2={y + h} stroke="#52525b" strokeWidth="0.45" />
      <rect x={x - 0.8} y={y + h} width={w + 1.6} height={1.1} fill="#3f3f46" />
    </g>
  );
}

function ElevationDoor({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const transom = y + h * 0.22;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#f4f4f5" stroke="#18181b" strokeWidth="0.8" />
      <line x1={x} y1={transom} x2={x + w} y2={transom} stroke="#18181b" strokeWidth="0.5" />
      <rect
        x={x + 1.1}
        y={transom + 1.2}
        width={w - 2.2}
        height={h - (transom - y) - 2.4}
        fill="#d4d4d8"
        stroke="#27272a"
        strokeWidth="0.45"
      />
      <circle cx={x + w - 2.2} cy={y + h * 0.62} r="0.7" fill="#18181b" />
    </g>
  );
}

function FacadeSketch({ storeys }: { storeys: number }) {
  const floors = Math.min(Math.max(storeys, 3), 6);
  const floorH = 9;
  const groundH = 12;
  const bodyH = groundH + (floors - 1) * floorH;
  const yBase = 78;
  const yTop = yBase - bodyH;
  const x = 10;
  const w = 36;

  return (
    <svg
      viewBox="0 0 56 88"
      className="h-[88px] w-14 shrink-0"
      aria-hidden
    >
      <line x1="4" y1={yBase + 1} x2="52" y2={yBase + 1} stroke="#18181b" strokeWidth="1.1" />
      <rect x={x} y={yTop} width={w} height={bodyH} fill="#f3efe8" stroke="#18181b" strokeWidth="0.9" />
      <rect x={x} y={yTop - 2} width={w} height="2" fill="#e7e5e4" stroke="#18181b" strokeWidth="0.8" />
      {Array.from({ length: floors }, (_, i) => {
        const isGround = i === 0;
        const y = yBase - (isGround ? groundH : groundH + i * floorH);
        const h = isGround ? 7.2 : 5.2;
        const wy = y + (isGround ? 2.6 : 1.8);
        return (
          <g key={i}>
            {i > 0 && (
              <line
                x1={x}
                y1={yBase - groundH - (i - 1) * floorH}
                x2={x + w}
                y2={yBase - groundH - (i - 1) * floorH}
                stroke="#a1a1aa"
                strokeWidth="0.4"
              />
            )}
            {[8, 18, 28].map((wx) =>
              isGround && wx === 18 ? (
                <ElevationDoor key={wx} x={x + 13} y={y + 2.2} w={10} h={groundH - 2.4} />
              ) : (
                <ElevationWindow key={wx} x={x + wx - 4} y={wy} w={7} h={h} />
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}

function WideElevation({ storeys }: { storeys: number }) {
  const floors = Math.min(Math.max(storeys, 3), 6);
  const bays = 5;
  const x0 = 28;
  const bw = 184;
  const groundH = 28;
  const floorH = 18;
  const bodyH = groundH + (floors - 1) * floorH;
  const yBase = 138;
  const yTop = yBase - bodyH;
  const winW = 16;
  const gap = (bw - bays * winW) / (bays + 1);

  return (
    <svg viewBox="0 0 240 160" className="h-full w-full min-h-0" aria-hidden>
      <rect x="0" y={yBase + 1} width="240" height="22" fill="#f4f4f5" />
      {Array.from({ length: 18 }, (_, i) => (
        <line
          key={i}
          x1={8 + i * 13}
          y1={yBase + 1}
          x2={2 + i * 13}
          y2={yBase + 10}
          stroke="#d4d4d8"
          strokeWidth="0.6"
        />
      ))}
      <line x1="8" y1={yBase + 1} x2="232" y2={yBase + 1} stroke="#18181b" strokeWidth="1.4" />

      <rect x={x0} y={yTop} width={bw} height={bodyH} fill="#f3efe8" stroke="#18181b" strokeWidth="1.1" />
      <rect x={x0} y={yBase - 3} width={bw} height="3" fill="#d6d3d1" stroke="#18181b" strokeWidth="0.6" />
      <rect x={x0 - 1} y={yTop - 3.5} width={bw + 2} height="3.5" fill="#e7e5e4" stroke="#18181b" strokeWidth="1" />
      <line x1={x0 + 6} y1={yTop - 3.5} x2={x0 + bw - 6} y2={yTop - 3.5} stroke="#a8a29e" strokeWidth="0.5" />

      {Array.from({ length: floors }, (_, i) => {
        const isGround = i === 0;
        const yFloor = yBase - (isGround ? groundH : groundH + i * floorH);
        const winH = isGround ? 16 : 11;
        const wy = yFloor + (isGround ? 7 : 3.5);
        return (
          <g key={i}>
            {i > 0 && (
              <line
                x1={x0}
                y1={yFloor + floorH}
                x2={x0 + bw}
                y2={yFloor + floorH}
                stroke="#a8a29e"
                strokeWidth="0.7"
              />
            )}
            {Array.from({ length: bays }, (_, bay) => {
              const wx = x0 + gap + bay * (winW + gap);
              if (isGround && bay === 2) {
                return <ElevationDoor key={bay} x={wx + 1} y={yFloor + 5} w={14} h={23} />;
              }
              return <ElevationWindow key={bay} x={wx} y={wy} w={winW} h={winH} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

function FloorPlan({
  mode = "typical",
}: {
  mode?: "typical" | "fire" | "escape" | "access" | "foundation";
}) {
  const ink = "#1c1917";
  const mute = "#78716c";
  const glass = "#7dd3fc";
  const wall = "#1c1917";
  const showFurniture = mode === "typical";
  const showFire = mode === "fire";
  const showEscape = mode === "escape";
  const showAccess = mode === "access";
  const showFound = mode === "foundation";

  return (
    <svg viewBox="0 0 320 196" className="h-full w-full min-h-0" aria-hidden>
      <defs>
        <pattern id={`stair-hatch-${mode}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#b91c1c" strokeWidth="0.6" />
        </pattern>
        <pattern id={`found-hatch-${mode}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#57534e" strokeWidth="0.55" />
        </pattern>
      </defs>

      <rect width="320" height="196" fill="#fafaf9" />

      {showAccess && (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={8}
                y={40 + i * 22}
                width="16"
                height="18"
                fill="#f4f4f5"
                stroke={ink}
                strokeWidth="0.6"
              />
              <text x="16" y={51 + i * 22} textAnchor="middle" fontSize="4.5" fill={mute} fontFamily="system-ui">
                P
              </text>
            </g>
          ))}
          <path
            d="M 24 138 H 48 V 158 H 150"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.6"
            strokeDasharray="3 2"
          />
        </g>
      )}

      {showFire && (
        <g>
          <rect x="34" y="28" width="104" height="112" fill="#fef2f2" />
          <rect x="182" y="28" width="104" height="112" fill="#fef2f2" />
          <rect x="138" y="68" width="44" height="74" fill={`url(#stair-hatch-${mode})`} />
        </g>
      )}

      {showFound && (
        <g>
          <rect x="24" y="18" width="272" height="160" fill="none" stroke={ink} strokeWidth="1.1" />
          <rect x="34" y="28" width="252" height="140" fill={`url(#found-hatch-${mode})`} stroke={ink} strokeWidth="0.6" strokeDasharray="3 2" />
          {[
            [22, 16],
            [282, 16],
            [22, 164],
            [282, 164],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="16" height="16" fill="#d6d3d1" stroke={ink} strokeWidth="0.8" />
          ))}
        </g>
      )}

      {!showFound && (
        <g>
          <rect x="30" y="24" width="260" height="4" fill={wall} />
          <rect x="30" y="172" width="260" height="4" fill={wall} />
          <rect x="30" y="24" width="4" height="152" fill={wall} />
          <rect x="286" y="24" width="4" height="152" fill={wall} />

          <rect x="138" y="28" width="2" height="112" fill={wall} />
          <rect x="180" y="28" width="2" height="112" fill={wall} />
          <rect x="138" y="66" width="44" height="2" fill={wall} />

          <rect x="34" y="140" width="38" height="2" fill={wall} />
          <rect x="86" y="140" width="52" height="2" fill={wall} />
          <rect x="140" y="140" width="8" height="2" fill={wall} />
          <rect x="162" y="140" width="20" height="2" fill={wall} />
          <rect x="182" y="140" width="52" height="2" fill={wall} />
          <rect x="248" y="140" width="38" height="2" fill={wall} />

          <rect x="34" y="100" width="28" height="2" fill={wall} />
          <rect x="60" y="100" width="2" height="42" fill={wall} />
          <rect x="258" y="100" width="28" height="2" fill={wall} />
          <rect x="258" y="100" width="2" height="42" fill={wall} />

          {[48, 86, 212, 250].map((x) => (
            <g key={x}>
              <rect x={x} y="23.2" width="18" height="5.6" fill="#fafaf9" />
              <line x1={x} y1="26" x2={x + 18} y2="26" stroke={glass} strokeWidth="1.3" />
              <line x1={x} y1="24.4" x2={x + 18} y2="24.4" stroke={ink} strokeWidth="0.45" />
              <line x1={x} y1="27.6" x2={x + 18} y2="27.6" stroke={ink} strokeWidth="0.45" />
            </g>
          ))}
          {[52, 108].map((y) => (
            <g key={y}>
              <rect x="29.2" y={y} width="5.6" height="16" fill="#fafaf9" />
              <line x1="32" y1={y} x2="32" y2={y + 16} stroke={glass} strokeWidth="1.3" />
              <rect x="285.2" y={y} width="5.6" height="16" fill="#fafaf9" />
              <line x1="288" y1={y} x2="288" y2={y + 16} stroke={glass} strokeWidth="1.3" />
            </g>
          ))}

          <path d="M 86 140 A 14 14 0 0 0 72 126" fill="none" stroke={ink} strokeWidth="0.7" />
          <line x1="72" y1="140" x2="72" y2="126" stroke={ink} strokeWidth="0.8" />
          <path d="M 234 140 A 14 14 0 0 1 248 126" fill="none" stroke={ink} strokeWidth="0.7" />
          <line x1="248" y1="140" x2="248" y2="126" stroke={ink} strokeWidth="0.8" />
          <path d="M 162 140 A 14 14 0 0 1 148 154" fill="none" stroke={ink} strokeWidth="0.7" />
          <line x1="148" y1="140" x2="148" y2="154" stroke={ink} strokeWidth="0.8" />

          <g>
            {Array.from({ length: 9 }, (_, i) => (
              <line
                key={i}
                x1="142"
                y1={72 + i * 7.2}
                x2="178"
                y2={72 + i * 7.2}
                stroke={ink}
                strokeWidth="0.55"
              />
            ))}
            <polygon points="160,76 163.2,84 156.8,84" fill={ink} />
            <line x1="160" y1="84" x2="160" y2="128" stroke={ink} strokeWidth="0.6" />
          </g>
        </g>
      )}

      {showFurniture && (
        <g fill="none" stroke="#57534e" strokeWidth="0.5">
          <rect x="42" y="40" width="28" height="16" />
          <rect x="42" y="40" width="28" height="4.5" fill="#e7e5e4" />
          <circle cx="108" cy="52" r="6.5" />
          <rect x="96" y="78" width="22" height="8" />
          <rect x="38" y="108" width="16" height="10" />
          <circle cx="50" cy="122" r="2.2" />

          <rect x="250" y="40" width="28" height="16" />
          <rect x="250" y="40" width="28" height="4.5" fill="#e7e5e4" />
          <circle cx="212" cy="52" r="6.5" />
          <rect x="202" y="78" width="22" height="8" />
          <rect x="266" y="108" width="16" height="10" />
          <circle cx="270" cy="122" r="2.2" />
        </g>
      )}

      {showEscape && (
        <g fill="none" stroke="#b91c1c" strokeWidth="1.3" strokeLinecap="round">
          <path d="M 78 118 L 78 152 L 154 152" markerEnd="" />
          <path d="M 242 118 L 242 152 L 166 152" />
          <polygon points="154,149.2 162,152 154,154.8" fill="#b91c1c" stroke="none" />
          <polygon points="166,149.2 158,152 166,154.8" fill="#b91c1c" stroke="none" />
        </g>
      )}

      {!showFound && (
        <g fontFamily="system-ui" fill={mute} fontSize="5.8" letterSpacing="0.4">
          <text x="86" y="64" textAnchor="middle">
            LIVING
          </text>
          <text x="234" y="64" textAnchor="middle">
            LIVING
          </text>
          <text x="48" y="96" textAnchor="middle" fontSize="5">
            BED
          </text>
          <text x="272" y="96" textAnchor="middle" fontSize="5">
            BED
          </text>
          {!showAccess && (
            <text x="110" y="160" textAnchor="middle">
              HALL
            </text>
          )}
          <text x="160" y="118" textAnchor="middle" fill={showFire ? "#991b1b" : mute} fontSize="5.2">
            {showFire ? "STAIR EI 60" : "STAIR"}
          </text>
          <text x="160" y="48" textAnchor="middle" fontSize="5">
            LIFT
          </text>
          {showAccess && (
            <text x="150" y="160" textAnchor="middle" fill="#0369a1">
              ACCESSIBLE ROUTE
            </text>
          )}
        </g>
      )}

      {showFound && (
        <text x="160" y="100" textAnchor="middle" fontFamily="system-ui" fontSize="7" fill={mute}>
          BASEMENT
        </text>
      )}

      <g transform="translate(300, 18)" fill={ink}>
        <polygon points="0,-8 3.4,4.5 -3.4,4.5" />
        <line x1="0" y1="4.5" x2="0" y2="9" stroke={ink} strokeWidth="0.8" />
        <text y="16" textAnchor="middle" fontSize="6" fontFamily="system-ui" fill={mute}>
          N
        </text>
      </g>

      {!showAccess && (
        <g transform="translate(36, 188)" stroke={ink} fill={mute}>
          <line x1="0" y1="0" x2="36" y2="0" strokeWidth="0.8" />
          <line x1="0" y1="-2.4" x2="0" y2="2.4" strokeWidth="0.8" />
          <line x1="36" y1="-2.4" x2="36" y2="2.4" strokeWidth="0.8" />
          <text x="40" y="2.5" fontSize="5.5" fontFamily="system-ui" stroke="none">
            5 m
          </text>
        </g>
      )}
    </svg>
  );
}

function TypicalPlan() {
  return <FloorPlan mode="typical" />;
}

function CoverPage({ f }: { f: Facts }) {
  const disciplineLabel =
    DEMO_DISCIPLINES.find((item) => item.id === f.disciplineId)?.label ?? "Architecture";
  const thirdStat: { label: string; value: string | null } =
    f.disciplineId === "architecture"
      ? { label: "HEIGHT", value: f.height }
      : f.disciplineId === "construction"
        ? { label: "CC / KK", value: [f.cc, f.kk].filter(Boolean).join(" · ") || null }
        : { label: "FIRE CLASS", value: f.bk };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold tracking-[0.22em] text-zinc-400">
          {disciplineLabel.toUpperCase()} · TITLE SHEET
        </p>
        <p className="text-[9px] tracking-[0.14em] text-zinc-400">
          {SAMPLE_PROJECT.municipality.toUpperCase()}
        </p>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.18em] text-zinc-400">
            {SAMPLE_PROJECT.units.toUpperCase()}
          </p>
          <h3 className="mt-1 text-[20px] font-semibold leading-[0.95] tracking-tight text-zinc-900">
            <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" />
          </h3>
          <p className="mt-1 text-[12px] font-medium leading-snug text-zinc-700">{f.title}</p>
          <p className="mt-1 text-[10px] leading-snug text-zinc-500">
            <FactValue value={SAMPLE_PROJECT.address} tone="contract" />
          </p>
        </div>
        <FacadeSketch storeys={f.storeysCount} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-900 pt-2">
        <TitleStat label="PROJECT NUMBER" value={f.projectNumber} tone="general" />
        <TitleStat label="GFA" value={f.gfa} tone="general" />
        <TitleStat label={thirdStat.label} value={thirdStat.value} tone="discipline" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-2">
        <div>
          <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">CLIENT</p>
          <p className="mt-0.5 truncate text-[10px]">
            <FactValue value={SAMPLE_PROJECT.client} tone="contract" />
          </p>
        </div>
        <div>
          <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">ARCHITECT</p>
          <p className="mt-0.5 truncate text-[10px]">
            <FactValue value={SAMPLE_PROJECT.architect} tone="contract" />
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[8px] font-semibold tracking-[0.16em] text-zinc-400">RESPONSIBLE</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold">
            <FactValue value={f.responsible} tone="discipline" />
          </p>
        </div>
      </div>
    </div>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-700">{children}</p>;
}

function H({ children }: { children: ReactNode }) {
  return (
    <p className="text-[9px] font-semibold tracking-[0.16em] text-zinc-400">{children}</p>
  );
}

function ArchDescContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <H>1. DESIGN INTENT</H>
        <P>
          This description records the architectural envelope for{" "}
          <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" />, prepared for{" "}
          <FactValue value={SAMPLE_PROJECT.client} tone="contract" /> at{" "}
          <FactValue value={SAMPLE_PROJECT.address} tone="contract" />. The building provides{" "}
          {SAMPLE_PROJECT.units.toLowerCase()} within a permitted height of{" "}
          <FactValue value={f.height} tone="discipline" /> over{" "}
          <FactValue value={f.storeys} tone="discipline" /> storeys, above a basement of{" "}
          <FactValue value={f.basement} tone="general" />.
        </P>
        <P>
          Gross floor area is <FactValue value={f.gfa} tone="general" />. Street parking is limited
          to <FactValue value={f.parking} tone="discipline" /> spaces so the south elevation can
          remain a continuous residential facade. Geotechnical category{" "}
          <FactValue value={f.geo} tone="general" /> informs the ground-floor datum.
        </P>
        <div className="mt-2 min-h-0 flex-1">
          <WideElevation storeys={f.storeysCount} />
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">Fig. 1 — South elevation, not to scale</p>
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <H>2. TYPICAL FLOOR</H>
      <P>
        Each upper floor repeats two dwelling clusters around a shared hall. Project{" "}
        <FactValue value={f.projectNumber} tone="general" /> is coordinated by{" "}
        <FactValue value={f.responsible} tone="discipline" /> with {SAMPLE_PROJECT.architect}.
      </P>
      <div className="mt-2 min-h-0 flex-1">
        <TypicalPlan />
      </div>
      <p className="mt-1 text-[9px] text-zinc-500">Fig. 2 — Typical residential floor</p>
    </div>
  );
}

function FacadeContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <H>SOUTH ELEVATION · 1:200</H>
        <P>
          Brick and precast bands express the <FactValue value={f.storeys} tone="discipline" />{" "}
          storey limit. Overall height <FactValue value={f.height} tone="discipline" />. Windows
          align on a 1.2 m module across the GFA of <FactValue value={f.gfa} tone="general" />.
        </P>
        <div className="mt-2 min-h-0 flex-1 border border-zinc-800 p-1">
          <WideElevation storeys={f.storeysCount} />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <H>MATERIALS AND OPENINGS</H>
      <P>
        The south wall is load-bearing masonry with punched openings. Ground floor stays clear of
        the <FactValue value={f.parking} tone="discipline" /> parking bays, which sit on the west
        flank. Drawn by <FactValue value={f.responsible} tone="discipline" /> for project{" "}
        <FactValue value={f.projectNumber} tone="general" />.
      </P>
      <div className="mt-2 border-y border-zinc-800 text-[10px]">
        <div className="grid grid-cols-3 py-0.5 font-semibold">
          <span>Mark</span>
          <span>Type</span>
          <span>Sill</span>
        </div>
        <div className="grid grid-cols-3 border-t border-zinc-200 py-0.5">
          <span>W1</span>
          <span>Fixed</span>
          <span>0.90 m</span>
        </div>
        <div className="grid grid-cols-3 border-t border-zinc-200 py-0.5">
          <span>W2</span>
          <span>Tilt-turn</span>
          <span>0.90 m</span>
        </div>
        <div className="grid grid-cols-3 border-t border-zinc-200 py-0.5">
          <span>D1</span>
          <span>Entrance</span>
          <span>—</span>
        </div>
      </div>
    </div>
  );
}

function AccessContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <H>STATEMENT</H>
        <P>
          This statement is issued for <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" />{" "}
          on behalf of <FactValue value={SAMPLE_PROJECT.client} tone="contract" />. The undersigned,{" "}
          <FactValue value={f.responsible} tone="discipline" />, confirms that the design provides
          step-free access from <FactValue value={SAMPLE_PROJECT.address} tone="contract" /> to every
          dwelling, via a lift serving <FactValue value={f.storeys} tone="discipline" /> storeys.
        </P>
        <P>
          Accessible parking is provided at <FactValue value={f.parking} tone="discipline" /> spaces
          adjoining the main entrance. Circulation widths are based on the GFA of{" "}
          <FactValue value={f.gfa} tone="general" /> and BR18 guidance for residential buildings.
        </P>
        <P>
          The basement of <FactValue value={f.basement} tone="general" /> is reached by lift and
          stair, with a refuge at the stair landing on each floor.
        </P>
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <H>ACCESS PLAN</H>
      <P>
        Level route from street to lift lobby. Parking bays{" "}
        <FactValue value={f.parking} tone="discipline" /> are marked at the west curb.
      </P>
      <div className="mt-2 min-h-0 flex-1">
        <FloorPlan mode="access" />
      </div>
    </div>
  );
}

function StructContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <H>1. DESIGN BASIS</H>
        <P>
          The structure for <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" /> is
          classified <FactValue value={f.cc} tone="discipline" /> /{" "}
          <FactValue value={f.kk} tone="discipline" />, complexity{" "}
          <FactValue value={f.complexity} tone="discipline" />. Geotechnical category{" "}
          <FactValue value={f.geo} tone="general" /> applies to the basement of{" "}
          <FactValue value={f.basement} tone="general" />.
        </P>
        <p className="mt-2 text-[9px] font-semibold tracking-[0.16em] text-zinc-400">
          2. COMBINATION (EN 1990)
        </p>
        <p className="mt-1 font-mono text-[10px] leading-6 text-zinc-800">
          E<sub>d</sub> = γ<sub>G</sub> G<sub>k</sub> + γ<sub>Q</sub> Q<sub>k</sub>
        </p>
        <p className="font-mono text-[10px] leading-6 text-zinc-800">
          γ<sub>G</sub> = 1.35 · γ<sub>Q</sub> = 1.50 · ψ<sub>0</sub> = 0.7
        </p>
        <P>
          Permanent load G<sub>k</sub> is taken from the GFA of{" "}
          <FactValue value={f.gfa} tone="general" /> with a residential imposed load of 2.0 kN/m².
          Author <FactValue value={f.responsible} tone="discipline" />.
        </P>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <H>3. MEMBER CHECKS</H>
      <p className="mt-1 font-mono text-[10px] leading-6 text-zinc-800">
        σ<sub>c</sub> = N<sub>Ed</sub> / (b · h) ≤ f<sub>cd</sub>
      </p>
      <p className="font-mono text-[10px] leading-6 text-zinc-800">
        M<sub>Ed</sub> ≤ M<sub>Rd</sub> = A<sub>s</sub> f<sub>yd</sub> z
      </p>
      <p className="font-mono text-[10px] leading-6 text-zinc-800">
        V<sub>Ed</sub> ≤ V<sub>Rd,c</sub> + V<sub>Rd,s</sub>
      </p>
      <P>
        Frame in construction class <FactValue value={f.kk} tone="discipline" />. Horizontal
        stability by stair cores. Concrete C30/37, reinforcement B500. Project{" "}
        <FactValue value={f.projectNumber} tone="general" />.
      </P>
    </div>
  );
}

function FoundationContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <H>FOUNDATION PLAN</H>
        <P>
          Strip and pad foundations under the residential block. Basement footprint{" "}
          <FactValue value={f.basement} tone="general" />. Soil class{" "}
          <FactValue value={f.geo} tone="general" />. Superstructure{" "}
          <FactValue value={f.cc} tone="discipline" />.
        </P>
        <div className="mt-2 min-h-0 flex-1">
          <FloorPlan mode="foundation" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <H>BEARING</H>
      <p className="mt-1 font-mono text-[10px] leading-6 text-zinc-800">
        q<sub>Ed</sub> = N<sub>Ed</sub> / A<sub>f</sub> ≤ q<sub>rd</sub>
      </p>
      <P>
        Characteristic bearing for <FactValue value={f.geo} tone="general" /> is taken from the
        desk study. Foundation reactions include the basement of{" "}
        <FactValue value={f.basement} tone="general" />. Complexity{" "}
        <FactValue value={f.complexity} tone="discipline" />. Drawn by{" "}
        <FactValue value={f.responsible} tone="discipline" />.
      </P>
    </div>
  );
}

function LoadsContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <H>LOAD-BEARING CALCULATIONS</H>
        <P>
          Job <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" /> ·{" "}
          <FactValue value={f.projectNumber} tone="general" />. Area A ={" "}
          <FactValue value={f.gfa} tone="general" />.
        </P>
        <p className="mt-1 font-mono text-[10px] leading-6 text-zinc-800">
          G<sub>k</sub> = 4.5 kN/m² · A
        </p>
        <p className="font-mono text-[10px] leading-6 text-zinc-800">
          Q<sub>k</sub> = 2.0 kN/m² · A
        </p>
        <p className="font-mono text-[10px] leading-6 text-zinc-800">
          E<sub>d</sub> = 1.35 G<sub>k</sub> + 1.50 Q<sub>k</sub>
        </p>
        <P>
          Consequence class <FactValue value={f.cc} tone="discipline" />. Construction class{" "}
          <FactValue value={f.kk} tone="discipline" />. By{" "}
          <FactValue value={f.responsible} tone="discipline" />.
        </P>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <H>SLAB AND WALL</H>
      <p className="mt-1 font-mono text-[10px] leading-6 text-zinc-800">
        m<sub>Ed</sub> = q<sub>Ed</sub> ℓ² / 8
      </p>
      <p className="font-mono text-[10px] leading-6 text-zinc-800">
        V<sub>Ed</sub> = q<sub>Ed</sub> ℓ / 2
      </p>
      <P>
        Basement walls retain <FactValue value={f.basement} tone="general" />. Soil{" "}
        <FactValue value={f.geo} tone="general" />. Complexity{" "}
        <FactValue value={f.complexity} tone="discipline" />.
      </P>
    </div>
  );
}

function FireStrategyContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <H>FIRE STRATEGY</H>
        <P>
          The building at <FactValue value={SAMPLE_PROJECT.address} tone="contract" /> is designed
          to fire class <FactValue value={f.bk} tone="discipline" /> and risk class{" "}
          <FactValue value={f.rk} tone="discipline" />. Sleeping accommodation:{" "}
          <FactValue value={f.sleeping} tone="discipline" />. The strategy covers the full GFA of{" "}
          <FactValue value={f.gfa} tone="general" /> over{" "}
          <FactValue value={f.storeys} tone="discipline" /> storeys.
        </P>
        <P>
          Compartmentation follows the stair cores. Alarm and smoke control are provided to every
          dwelling. Fire service access is from Københavnsgade. Prepared by{" "}
          <FactValue value={f.responsible} tone="discipline" /> for{" "}
          <FactValue value={SAMPLE_PROJECT.client} tone="contract" />.
        </P>
        <div className="mt-2 min-h-0 flex-1">
          <FloorPlan mode="fire" />
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">Fig. — Compartment plan, typical floor</p>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <H>FIRE DOOR SCHEDULE</H>
      <P>
        Doors protecting the escape stair are rated for class{" "}
        <FactValue value={f.bk} tone="discipline" />.
      </P>
      <div className="mt-2 border-y border-zinc-800 text-[10px]">
        <div className="grid grid-cols-4 py-0.5 font-semibold">
          <span>Mark</span>
          <span>Location</span>
          <span>Rating</span>
          <span>Width</span>
        </div>
        <div className="grid grid-cols-4 border-t border-zinc-200 py-0.5">
          <span>FD-01</span>
          <span>Stair</span>
          <span>EI 60-C</span>
          <span>900</span>
        </div>
        <div className="grid grid-cols-4 border-t border-zinc-200 py-0.5">
          <span>FD-02</span>
          <span>Lobby</span>
          <span>EI 30-C</span>
          <span>900</span>
        </div>
        <div className="grid grid-cols-4 border-t border-zinc-200 py-0.5">
          <span>FD-03</span>
          <span>Basement</span>
          <span>EI 60-C</span>
          <span>900</span>
        </div>
      </div>
    </div>
  );
}

function EscapeContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <H>ESCAPE PLAN · TYPICAL FLOOR</H>
        <P>
          Two independent routes on every storey. Occupancy assumes sleeping{" "}
          <FactValue value={f.sleeping} tone="discipline" />. Travel distances checked for{" "}
          <FactValue value={f.rk} tone="discipline" />.
        </P>
        <div className="mt-2 min-h-0 flex-1">
          <FloorPlan mode="escape" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <H>TRAVEL DISTANCE</H>
      <P>
        Maximum single-direction travel is 15 m in the dwellings and 25 m in the corridor, within
        the height of <FactValue value={f.height} tone="discipline" /> and{" "}
        <FactValue value={f.storeys} tone="discipline" /> storeys. Fire class{" "}
        <FactValue value={f.bk} tone="discipline" />. Plan by{" "}
        <FactValue value={f.responsible} tone="discipline" /> for project{" "}
        <FactValue value={f.projectNumber} tone="general" />.
      </P>
      <P>
        Stair width 1.20 m, discharging to Københavnsgade. Basement{" "}
        <FactValue value={f.basement} tone="general" /> has a separate protected stair.
      </P>
    </div>
  );
}

function ClassContent({ page, f }: { page: 1 | 2; f: Facts }) {
  if (page === 1) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <H>CLASSIFICATION</H>
        <P>
          This report classifies <FactValue value={SAMPLE_PROJECT.shortName} tone="contract" /> as
          fire class <FactValue value={f.bk} tone="discipline" /> and risk class{" "}
          <FactValue value={f.rk} tone="discipline" />, with sleeping accommodation{" "}
          <FactValue value={f.sleeping} tone="discipline" />. The assessment covers GFA{" "}
          <FactValue value={f.gfa} tone="general" />.
        </P>
        <div className="mt-2 border border-zinc-800 text-[10px]">
          {[
            ["Fire class", f.bk, "discipline"],
            ["Risk class", f.rk, "discipline"],
            ["Sleeping", f.sleeping, "discipline"],
            ["GFA", f.gfa, "general"],
            ["Storeys", f.storeys, "discipline"],
          ].map(([label, value, tone]) => (
            <div key={label} className="grid grid-cols-2 border-t border-zinc-200 px-2 py-0.5 first:border-t-0">
              <span className="text-zinc-500">{label}</span>
              <FactValue value={value} tone={tone as VariableTone} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <H>COMPARTMENTATION</H>
      <P>
        Stair walls EI 60, dwelling doors EI 30-C, basement hatch EI 60. These ratings support
        class <FactValue value={f.bk} tone="discipline" />. Each dwelling is a separate fire cell;
        the basement of <FactValue value={f.basement} tone="general" /> is a further cell with an
        independent stair.
      </P>
      <P>
        Issued by <FactValue value={f.responsible} tone="discipline" /> for{" "}
        <FactValue value={SAMPLE_PROJECT.client} tone="contract" />, case{" "}
        <FactValue value={f.projectNumber} tone="general" />. The classification is valid for the
        GFA of <FactValue value={f.gfa} tone="general" /> as drawn.
      </P>
    </div>
  );
}

function InnerPages({ docId, page, f }: { docId: string; page: 1 | 2; f: Facts }) {
  switch (docId) {
    case "facade":
      return <FacadeContent page={page} f={f} />;
    case "access":
      return <AccessContent page={page} f={f} />;
    case "struct":
      return <StructContent page={page} f={f} />;
    case "foundation":
      return <FoundationContent page={page} f={f} />;
    case "loads":
      return <LoadsContent page={page} f={f} />;
    case "fire-strategy":
      return <FireStrategyContent page={page} f={f} />;
    case "escape":
      return <EscapeContent page={page} f={f} />;
    case "class":
      return <ClassContent page={page} f={f} />;
    default:
      return <ArchDescContent page={page} f={f} />;
  }
}

export function DocumentBody({
  docId,
  page,
  facts,
}: {
  docId: string;
  page: number;
  facts: Facts;
}) {
  if (page === 0) return <CoverPage f={facts} />;
  return <InnerPages docId={docId} page={page === 1 ? 1 : 2} f={facts} />;
}
