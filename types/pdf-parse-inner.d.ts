declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(
    data: Buffer,
    options?: Record<string, unknown>
  ): Promise<{ text: string; numpages?: number; numrender?: number; info?: unknown; metadata?: unknown }>;
  export default pdfParse;
}
