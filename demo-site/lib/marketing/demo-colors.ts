/** Demo section colors from Figma Homepage — Desktop 1920 (DemoAppFrame + Steps Menu). */
export const demoColors = {
  autoDocBlack: "#202306",
  autoDocWhite: "#f2efe8",
  autoDocLight: "#f7f5f0",
  solidBlack25: "#bdbcb8",

  shellBg: "#202326",
  shellBorder: "#f2efe8",
  shellDot: "#20230640",
  shellLabel: "rgba(255,255,255,0.75)",
  shellMeta: "rgba(255,255,255,0.5)",

  stepActiveBg: "#f7f5f0",
  stepActiveBorder: "#20230680",
  stepInactiveDot: "#20230680",
  stepActiveText: "#202306",
  stepInactiveText: "#202306bf",
  stepConnector: "#bdbcb8",

  /** Step menu on the dark demo shell background. */
  stepDarkActiveText: "#ffffff",
  stepDarkInactiveText: "rgba(255,255,255,0.75)",
  stepDarkInactiveDot: "#909193",
  stepDarkActiveBorder: "rgba(255,255,255,0.5)",

  sceneBorder: "#ffffff",
  sceneTitle: "rgba(255,255,255,0.5)",
  dropZoneBg: "#f0f9ff",
  extractedRowBorder: "#ffffff",
  extractedLabel: "#d2d3d4",
  extractedValue: "#ffffff",
  pdfBadge: "#dc2626",

  /** User message bubble in the Ask Autodoc demo. */
  chatUserBubble: "#71717a",
} as const;

/** Shared shell for white demo panels (article/section cards). */
export const demoPanelClass =
  "rounded-xl border border-[#202326]/10 bg-white px-5 py-4 md:px-6 md:py-5";
