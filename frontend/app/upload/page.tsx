"use client";

import "./upload.css";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../../components/common/AppHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type UploadState = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);



  const fileLabel = useMemo(() => {
    if (!selectedFile) return "선택된 파일 없음";
    return `${selectedFile.name} (${Math.ceil(selectedFile.size / 1024)} KB)`;
  }, [selectedFile]);

  const isValidFile = (file: File) => {
    const lower = file.name.toLowerCase();
    return (
      lower.endsWith(".csv") ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".xls")
    );
  };

  const applyFile = (file: File | null) => {
    if (!file) return;

    if (!isValidFile(file)) {
      setSelectedFile(null);
      setStatus("error");
      setMessage("CSV, XLSX, XLS 파일만 업로드할 수 있습니다.");
      return;
    }

    setSelectedFile(file);
    setStatus("idle");
    setMessage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    applyFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0] ?? null;
    applyFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

    const handleUpload = async () => {
      if (!selectedFile) {
        setStatus("error");
        setMessage("먼저 업로드할 파일을 선택해 주세요.");
        return;
      }

      const controller = new AbortController();
      const timeoutMs = 120000; // 120초
      const timeoutId = window.setTimeout(() => {
        console.warn("[upload] timeout reached, aborting request", {
          timeoutMs,
          at: new Date().toISOString(),
        });
        controller.abort();
      }, timeoutMs);

      try {
        setStatus("uploading");
        setMessage("파일을 분석 중입니다. 잠시만 기다려 주세요.");

        const formData = new FormData();
        formData.append("file", selectedFile);

        console.log("[upload] start", {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          api: `${API_BASE}/analysis/file`,
          startedAt: new Date().toISOString(),
        });

        const startedAt = Date.now();

        const res = await fetch(`${API_BASE}/analysis/file`, {
          method: "POST",
          body: formData,
          credentials: "include",
          signal: controller.signal,
        });

        console.log("[upload] response arrived", {
          ok: res.ok,
          status: res.status,
          elapsedMs: Date.now() - startedAt,
          contentType: res.headers.get("content-type"),
        });

        const data = await res.json().catch(() => null);

        console.log("[upload] response body", data);

        if (!res.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              `업로드 중 오류가 발생했습니다. (status: ${res.status})`
          );
        }

        sessionStorage.setItem("analysisResult", JSON.stringify(data));

        console.log("[upload] success, navigating to dashboard", {
          elapsedMs: Date.now() - startedAt,
        });

        setStatus("done");
        setMessage("업로드 및 분석이 완료되었습니다. 대시보드로 이동합니다.");

        setTimeout(() => {
          router.push("/dashboard");
        }, 700);
      } catch (error) {
        console.error("[upload] failed", error);

        const text =
          error instanceof DOMException && error.name === "AbortError"
            ? "분석 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요."
            : error instanceof Error
            ? error.message
            : "업로드 중 오류가 발생했습니다.";

        setStatus("error");
        setMessage(text);
      } finally {
        clearTimeout(timeoutId);
        console.log("[upload] finished", {
          at: new Date().toISOString(),
        });
      }
    };
  return (
    <div className="upload-page">
      <AppHeader variant="app" />

      <main className="upload-main">
        <section className="upload-hero">
          <div className="upload-badge">파일 업로드 분석</div>

          <h1 className="upload-title">리뷰 데이터 업로드</h1>

          <p className="upload-desc">
            설문(CSV/XLSX) 데이터를 업로드하면
            <br />
            AI가 자동으로 고객 인사이트를 도출합니다.
          </p>
        </section>

        <section className="upload-card">
          <div
            className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                inputRef.current?.click();
              }
            }}
          >
            <div className="upload-icon">⇪</div>

            <div className="upload-drop-title">
              파일을 드래그하거나 클릭하여 업로드
            </div>

            <div className="upload-drop-sub">
              CSV / XLSX / XLS 파일 지원 · 리뷰 컬럼 포함
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="upload-hidden-input"
              onChange={handleFileChange}
            />

            <button
              type="button"
              className="upload-select-btn"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              파일 선택
            </button>
          </div>

          <div className="upload-file-box">
            <div className="upload-file-label">선택된 파일</div>
            <div className="upload-file-name">{fileLabel}</div>
          </div>

          {message ? (
            <div
              className={`upload-message ${
                status === "error"
                  ? "error"
                  : status === "done"
                  ? "done"
                  : "info"
              }`}
            >
              {message}
            </div>
          ) : null}

          <div className="upload-actions">
            <button
              type="button"
              className="upload-primary-btn"
              onClick={handleUpload}
              disabled={status === "uploading"}
            >
              {status === "uploading" ? "분석 중..." : "업로드 후 분석 시작"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}