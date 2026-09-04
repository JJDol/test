export const SAMPLE_PROJECT = {
  name: "Københavnsgade 88 Residential",
  shortName: "Københavnsgade 88",
  address: "Københavnsgade 88, 2100 København Ø",
  client: "Mågeskær Bolig ApS",
  clientCvr: "12 34 XX XX",
  architect: "Kridtstreg Arkitekter A/S",
  contractValue: "DKK 48,500,000",
  deadline: "15 March 2028",
  startDate: "1 September 2026",
  area: "3,240 m²",
  units: "18 apartments",
  storeys: "5 storeys + basement",
  cadastral: "88a, sample parcel · Østerbro",
  municipality: "Copenhagen",
  caseNumber: "DEMO-2026-088",
  contractFile: "Kobenhavnsgade-88-Enterprise-Agreement.pdf",
  contractSize: "2.4 MB",
} as const;

export type DemoStepId =
  | "upload"
  | "create"
  | "type-once"
  | "generate"
  | "ask";

export interface DemoStep {
  id: DemoStepId;
  number: number;
  label: string;
  caption: string;
  windowTitle: string;
  status: string;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: "upload",
    number: 1,
    label: "Upload contract",
    caption: "Drop a contract. AutoDoc reads the project facts in seconds.",
    windowTitle: "AUTODOC — NEW PROJECT",
    status: "CONTRACT PARSED · 8 FIELDS EXTRACTED",
  },
  {
    id: "create",
    number: 2,
    label: "Create project",
    caption: "The project appears as a card. Choose disciplines, then the documents for each.",
    windowTitle: "AUTODOC — PROJECTS",
    status: "PROJECT READY · KØBENHAVNSGADE 88",
  },
  {
    id: "type-once",
    number: 3,
    label: "Type once",
    caption: "Type a fact once. General fields fill every document; discipline fields fill only that scope.",
    windowTitle: `AUTODOC — ${SAMPLE_PROJECT.shortName.toUpperCase()}`,
    status: "GENERAL VARIABLES APPLIED · 4 DOCUMENTS MOVED",
  },
  {
    id: "generate",
    number: 4,
    label: "Generate",
    caption: "Open a generated file. The same facts repeat on every page.",
    windowTitle: `AUTODOC — ${SAMPLE_PROJECT.shortName.toUpperCase()}`,
    status: "4 DOCUMENTS GENERATED",
  },
  {
    id: "ask",
    number: 5,
    label: "Ask AutoDoc",
    caption:
      "Sample questions are for this demo. In AutoDoc, ask your own — answers draw on project data and BR18.",
    windowTitle: "AUTODOC — ASSISTANT",
    status: "ANSWERED FROM PROJECT + BR18",
  },
];

export interface ExtractedField {
  id: string;
  label: string;
  value: string;
}

export const EXTRACTED_FIELDS: ExtractedField[] = [
  { id: "name", label: "Project", value: SAMPLE_PROJECT.name },
  { id: "client", label: "Client", value: SAMPLE_PROJECT.client },
  { id: "cvr", label: "CVR", value: SAMPLE_PROJECT.clientCvr },
  { id: "address", label: "Site", value: SAMPLE_PROJECT.address },
  { id: "cadastral", label: "Cadastral", value: SAMPLE_PROJECT.cadastral },
  { id: "value", label: "Contract sum", value: SAMPLE_PROJECT.contractValue },
  { id: "deadline", label: "Completion", value: SAMPLE_PROJECT.deadline },
  { id: "architect", label: "Architect", value: SAMPLE_PROJECT.architect },
];

export const DEMO_DOCUMENTS = [
  { id: "arch", name: "Architecture description", progressFromGeneral: 62, complete: 100 },
  { id: "fire", name: "Fire strategy", progressFromGeneral: 58, complete: 100 },
  { id: "energy", name: "Energy statement", progressFromGeneral: 55, complete: 100 },
  { id: "struct", name: "Structural brief", progressFromGeneral: 60, complete: 100 },
] as const;

export const DEMO_DISCIPLINES = [
  {
    id: "architecture",
    label: "Architecture",
    documents: [
      { id: "arch-desc", name: "Architecture description" },
      { id: "facade", name: "Facade drawing set" },
      { id: "access", name: "Accessibility statement" },
    ],
  },
  {
    id: "construction",
    label: "Construction",
    documents: [
      { id: "struct", name: "Structural brief" },
      { id: "foundation", name: "Foundation plan" },
      { id: "loads", name: "Load-bearing calculations" },
    ],
  },
  {
    id: "fire",
    label: "Fire safety",
    documents: [
      { id: "fire-strategy", name: "Fire strategy" },
      { id: "escape", name: "Escape route plan" },
      { id: "class", name: "Fire classification report" },
    ],
  },
] as const;

export type DemoDisciplineId = (typeof DEMO_DISCIPLINES)[number]["id"];

export type DemoPickedDocs = Partial<Record<DemoDisciplineId, string[]>>;

export type DemoTypedValues = {
  general: Record<string, string>;
  category: Record<DemoDisciplineId, Record<string, string>>;
};

export function emptyTypedValues(): DemoTypedValues {
  return {
    general: {},
    category: {
      architecture: {},
      construction: {},
      fire: {},
    },
  };
}

export type DemoInputField =
  | {
      id: string;
      label: string;
      type: "text" | "number";
      placeholder?: string;
      suffix?: string;
    }
  | {
      id: string;
      label: string;
      type: "select";
      options: readonly string[];
    };

export function typedFieldDisplay(
  field: DemoInputField,
  values: Record<string, string> | undefined
): string | null {
  const raw = (values?.[field.id] ?? "").trim();
  if (!raw) return null;
  return "suffix" in field && field.suffix ? `${raw} ${field.suffix}` : raw;
}

export const DEMO_GENERAL_FIELDS: readonly DemoInputField[] = [
  {
    id: "projectNumber",
    label: "Project number",
    type: "text",
    placeholder: SAMPLE_PROJECT.caseNumber,
  },
  {
    id: "gfa",
    label: "Gross floor area",
    type: "number",
    placeholder: "3240",
    suffix: "m²",
  },
  {
    id: "basement",
    label: "Basement area",
    type: "number",
    placeholder: "480",
    suffix: "m²",
  },
  {
    id: "geo",
    label: "Geotechnical category",
    type: "select",
    options: ["GK1", "GK2", "GK3"],
  },
] as const;

export const DEMO_CATEGORY_FIELDS: Record<DemoDisciplineId, readonly DemoInputField[]> = {
  architecture: [
    {
      id: "responsible",
      label: "Responsible person",
      type: "text",
      placeholder: "Mina Holm",
    },
    {
      id: "height",
      label: "Permitted building height",
      type: "number",
      placeholder: "18",
      suffix: "m",
    },
    {
      id: "storeys",
      label: "Permitted number of storeys",
      type: "number",
      placeholder: "5",
    },
    {
      id: "parking",
      label: "Required parking spaces",
      type: "number",
      placeholder: "12",
    },
  ],
  construction: [
    {
      id: "responsible",
      label: "Responsible person",
      type: "text",
      placeholder: "Jonas Vestergaard",
    },
    {
      id: "cc",
      label: "Consequence class",
      type: "select",
      options: ["CC1", "CC2", "CC3", "CC3+"],
    },
    {
      id: "kk",
      label: "Construction class",
      type: "select",
      options: ["KK1", "KK2", "KK3", "KK4"],
    },
    {
      id: "complexity",
      label: "Structural complexity",
      type: "select",
      options: ["Simple", "Complex"],
    },
  ],
  fire: [
    {
      id: "responsible",
      label: "Responsible person",
      type: "text",
      placeholder: "Sofie Lind",
    },
    {
      id: "bk",
      label: "Fire class",
      type: "select",
      options: ["BK1", "BK2", "BK3", "BK4"],
    },
    {
      id: "rk",
      label: "Risk class",
      type: "select",
      options: ["RK1", "RK2", "RK3", "RK4"],
    },
    {
      id: "sleeping",
      label: "Sleeping accommodation",
      type: "select",
      options: ["Yes", "No"],
    },
  ],
};

export const GENERAL_PROGRESS_WEIGHT = 50;
export const CATEGORY_PROGRESS_WEIGHT = 50;

export function defaultPickedDocs(): Record<DemoDisciplineId, string[]> {
  return {
    architecture: DEMO_DISCIPLINES[0].documents.map((doc) => doc.id),
    construction: DEMO_DISCIPLINES[1].documents.map((doc) => doc.id),
    fire: DEMO_DISCIPLINES[2].documents.map((doc) => doc.id),
  };
}

export function hasPickedDocuments(picked: DemoPickedDocs) {
  return DEMO_DISCIPLINES.some((item) => (picked[item.id] ?? []).length > 0);
}

export function resolvePickedDocs(picked: DemoPickedDocs) {
  return hasPickedDocuments(picked) ? picked : defaultPickedDocs();
}

export function selectedDemoDocuments(picked: DemoPickedDocs) {
  return DEMO_DISCIPLINES.flatMap((discipline) => {
    const ids = picked[discipline.id] ?? [];
    return discipline.documents
      .filter((doc) => ids.includes(doc.id))
      .map((doc) => ({
        ...doc,
        disciplineId: discipline.id,
        disciplineLabel: discipline.label,
      }));
  });
}

export const NEW_BOARD_PROJECT = {
  id: "kobenhavnsgade",
  name: SAMPLE_PROJECT.name,
  location: SAMPLE_PROJECT.address,
  progress: 0,
  deadline: "3/15/2028",
  deadlineTone: "ok" as const,
  leader: "Sofie Kragh",
} as const;
