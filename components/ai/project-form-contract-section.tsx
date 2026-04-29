"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Sparkles, CheckCircle2 } from "lucide-react";
import type { ContractData } from "@/lib/services/ai/contract-extractor";

export interface AppliedProjectFields {
  name: string;
  location: string;
  deadline: string;
}

interface ProjectFormContractSectionProps {
  disabled?: boolean;
  onApply: (fields: AppliedProjectFields) => void;
}

function normalizeDeadline(raw?: string | null): string {
  if (!raw?.trim()) return "";
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) {
    return new Date(t).toISOString().slice(0, 10);
  }
  const m = raw.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    const t2 = Date.parse(iso);
    if (!Number.isNaN(t2)) return iso;
  }
  return "";
}

export function ProjectFormContractSection({
  disabled,
  onApply,
}: ProjectFormContractSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ContractData | null>(null);

  const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB

  const runExtract = async () => {
    if (!file) {
      setError("Select a PDF, DOCX, or TXT file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setExtracted(null);
    try {
      let res: Response;

      if (file.size > FILE_SIZE_THRESHOLD) {
        const { upload } = await import("@vercel/blob/client");
        const customPath = `contract-uploads/${Date.now()}-${file.name}`;
        const blob = await upload(customPath, file, {
          access: "public",
          handleUploadUrl: "/api/ai/extract-contract-blob",
        });
        res = await fetch(
          `/api/ai/extract-contract?blobUrl=${encodeURIComponent(blob.url)}`,
          { method: "POST" }
        );
      } else {
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/ai/extract-contract", {
          method: "POST",
          body: fd,
        });
      }

      let body: Record<string, any>;
      const text = await res.text();
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(
          text.includes("Request Entity")
            ? "File too large for server. Please try a smaller file."
            : `Server error: ${text.slice(0, 100)}`
        );
      }

      if (!res.ok) {
        throw new Error(body.error || body.message || "Extraction failed");
      }
      const data = body.extraction?.contractData as ContractData | undefined;
      if (!data) throw new Error("No contract data in response");
      setExtracted(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const applyToForm = () => {
    if (!extracted) return;
    const name = extracted.projectName?.trim() || "";
    const location = (
      extracted.constructionAddress ||
      extracted.projectAddress ||
      ""
    ).trim();
    const deadline = normalizeDeadline(
      extracted.endDate || extracted.startDate
    );
    onApply({ name, location, deadline });
  };

  return (
    <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-semibold">Auto-fill from contract</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a contract (max 10 MB). Extract, then apply to project fields
            before continuing to Phase Planning.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          disabled={disabled || loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f ?? null);
            setExtracted(null);
            setError(null);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1" />
          Choose file
        </Button>
        {file && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {file.name}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          disabled={disabled || loading || !file}
          onClick={runExtract}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          Extract information
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {extracted && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">Preview</p>
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            <li>
              <span className="text-muted-foreground">Project name: </span>
              {extracted.projectName || "—"}
            </li>
            <li>
              <span className="text-muted-foreground">Address: </span>
              {extracted.constructionAddress || extracted.projectAddress || "—"}
            </li>
            <li>
              <span className="text-muted-foreground">Client: </span>
              {extracted.clientName || "—"}
            </li>
            <li>
              <span className="text-muted-foreground">Case no.: </span>
              {extracted.caseNumber || "—"}
            </li>
            <li>
              <span className="text-muted-foreground">Subject (Emne): </span>
              {extracted.subject || "—"}
            </li>
            <li>
              <span className="text-muted-foreground">Regarding: </span>
              {extracted.regarding || "—"}
            </li>
            <li>
              <span className="text-muted-foreground">Deadline hint: </span>
              {extracted.endDate || extracted.startDate || "—"}
            </li>
          </ul>
          <Button type="button" size="sm" className="mt-2" onClick={applyToForm}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Apply to project fields
          </Button>
        </div>
      )}
    </div>
  );
}
