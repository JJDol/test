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
    caption: "The project form fills itself from the contract. No blank start.",
    windowTitle: "AUTODOC — CREATE PROJECT",
    status: "PROJECT READY · KØBENHAVNSGADE 88",
  },
  {
    id: "type-once",
    number: 3,
    label: "Type once",
    caption: "Shared facts update every document. Specific facts finish one.",
    windowTitle: `AUTODOC — ${SAMPLE_PROJECT.shortName.toUpperCase()}`,
    status: "GENERAL VARIABLES APPLIED · 4 DOCUMENTS MOVED",
  },
  {
    id: "generate",
    number: 4,
    label: "Generate",
    caption: "One click. Finished documents download to your computer.",
    windowTitle: `AUTODOC — ${SAMPLE_PROJECT.shortName.toUpperCase()}`,
    status: "4 DOCUMENTS GENERATED · ZIP READY",
  },
  {
    id: "ask",
    number: 5,
    label: "Ask AutoDoc",
    caption: "Ask about this project, BR18, or building-industry standards.",
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
