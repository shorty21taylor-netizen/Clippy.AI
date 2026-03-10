"use client";

import React, { useState, useCallback, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
} from "lucide-react";

interface ImportCSVModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const values: string[] = [];
    let current = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    return headers.reduce(
      (obj, header, i) => {
        obj[header] = values[i] ?? "";
        return obj;
      },
      {} as Record<string, string>
    );
  });
}

const CSV_TEMPLATE = `platform,username,displayName,accessToken,status,tags,proxyConfig
INSTAGRAM,myhandle,My Account,,ACTIVE,"niche-a,campaign-1",
TIKTOK,tiktokuser,TikTok User,,PENDING,,http://user:pass@host:3128
YOUTUBE,ytchannel,YouTube Channel,,ACTIVE,"youtube,tier-1",`;

export function ImportCSVModal({
  open,
  onClose,
  onSuccess,
}: ImportCSVModalProps) {
  const { workspace } = useWorkspace();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    setError("");
    setResult(null);
    setFile(f);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      setPreview(rows.slice(0, 5)); // show first 5 as preview
    };
    reader.readAsText(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!file || !workspace) return;
    setLoading(true);
    setError("");

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      const res = await fetch("/api/social-accounts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id, rows }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
        return;
      }

      setResult(data.result);
      if (data.result.success > 0) {
        onSuccess();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clippy-accounts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Bulk import accounts"
      description="Upload a CSV to add multiple accounts at once."
      size="lg"
    >
      <div className="space-y-5">
        {/* Template download */}
        <button
          onClick={downloadTemplate}
          className="w-full flex items-center gap-3 rounded-[--radius-md] border border-dashed border-[--border-default] px-4 py-3 hover:border-[--accent]/40 hover:bg-[--accent-muted] transition-all duration-150 text-left"
        >
          <Download size={15} className="text-[--accent] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[--text-primary]">
              Download CSV template
            </p>
            <p className="text-xs text-[--text-secondary]">
              platform, username, displayName, accessToken, status, tags, proxyConfig
            </p>
          </div>
        </button>

        {/* Drop zone */}
        {!file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3 rounded-[--radius-lg] border-2 border-dashed
              px-6 py-10 cursor-pointer transition-all duration-150
              ${dragging
                ? "border-[--accent] bg-[--accent-muted]"
                : "border-[--border-default] hover:border-[--border-strong] hover:bg-[rgba(255,255,255,0.02)]"
              }
            `}
          >
            <Upload
              size={28}
              className={dragging ? "text-[--accent]" : "text-[--text-tertiary]"}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-[--text-primary]">
                Drop your CSV here, or{" "}
                <span className="text-[--accent]">click to browse</span>
              </p>
              <p className="mt-1 text-xs text-[--text-secondary]">
                Supports .csv files only
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {/* File selected — preview */}
        {file && !result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <FileText size={16} className="text-[--accent]" />
                <div>
                  <p className="text-sm font-medium text-[--text-primary]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[--text-secondary]">
                    {preview.length}+ rows detected
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
              >
                Remove
              </button>
            </div>

            {/* Mini preview table */}
            {preview.length > 0 && (
              <div className="rounded-[--radius-md] border border-[--border-subtle] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[--border-subtle] bg-[--bg-elevated]">
                        {Object.keys(preview[0]).map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-[--text-secondary] font-medium whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-[--border-subtle] last:border-0"
                        >
                          {Object.values(row).map((val, j) => (
                            <td
                              key={j}
                              className="px-3 py-2 text-[--text-secondary] max-w-[120px] truncate"
                            >
                              {val || <span className="text-[--text-tertiary]">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-3 py-2 text-[10px] text-[--text-tertiary] border-t border-[--border-subtle]">
                  Showing first {preview.length} rows — all rows will be imported
                </p>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[--radius-md] bg-[--status-success-muted] border border-[--status-success]/20 p-4 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[--status-success] shrink-0" />
                <div>
                  <p className="text-lg font-bold text-[--text-primary]">
                    {result.success}
                  </p>
                  <p className="text-xs text-[--text-secondary]">Imported</p>
                </div>
              </div>
              <div className="rounded-[--radius-md] bg-[--status-error-muted] border border-[--status-error]/20 p-4 flex items-center gap-3">
                <XCircle size={18} className="text-[--status-error] shrink-0" />
                <div>
                  <p className="text-lg font-bold text-[--text-primary]">
                    {result.failed}
                  </p>
                  <p className="text-xs text-[--text-secondary]">Failed</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-[--radius-md] bg-[--bg-elevated] border border-[--border-subtle] overflow-hidden max-h-40 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 border-b border-[--border-subtle] last:border-0"
                  >
                    <AlertTriangle
                      size={12}
                      className="text-[--status-warning] shrink-0 mt-0.5"
                    />
                    <span className="text-xs text-[--text-secondary]">
                      <span className="text-[--text-tertiary]">Row {err.row}:</span>{" "}
                      {err.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-[--status-error]">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              reset();
              onClose();
            }}
            className="flex-1"
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && file && (
            <Button
              size="lg"
              loading={loading}
              onClick={handleImport}
              className="flex-1"
            >
              Import {preview.length > 0 ? `(${preview.length}+ rows)` : ""}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
