"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import axios from "axios";
import {
  UploadCloud,
  Eye,
  PlayCircle,
  ArrowLeft,
  Loader2,
  LogOut,
} from "lucide-react";

/* ✅ API BASE */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type OverlayType =
  | "none"
  | "home"
  | "logout"
  | "analyze"
  | "file"
  | "preview";

export default function UploadPage() {
  const router = useRouter();

  /* =========================
     상태
  ========================= */
  const [checking, setChecking] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [overlay, setOverlay] = useState<OverlayType>("none");

  /* =========================
     로그인 가드
  ========================= */
  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!cancelled && !data.logged_in) {
          router.replace("/login");
          return;
        }
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    checkLogin();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /* =========================
     로그아웃
  ========================= */
  const handleLogout = async () => {
    setOverlay("logout");
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setTimeout(() => router.replace("/login"), 600);
    }
  };

  /* =========================
     메인 이동
  ========================= */
  const handleGoHome = () => {
    setOverlay("home");
    setTimeout(() => router.push("/"), 600);
  };

  /* =========================
     파일 업로드 & 파싱 (로딩 포함)
  ========================= */
  const handleFile = async (f: File) => {
    setOverlay("file");

    setFile(f);
    setShowPreview(false);
    setPreviewData([]);
    setTotalRows(0);

    try {
      if (f.name.endsWith(".csv")) {
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            setPreviewData(result.data.slice(0, 5));
            setTotalRows(result.data.length);
            setOverlay("none");
          },
        });
      } else {
        const buffer = await f.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        setPreviewData(json.slice(0, 5));
        setTotalRows(json.length);
        setOverlay("none");
      }
    } catch {
      alert("파일을 읽는 중 오류가 발생했습니다.");
      setOverlay("none");
    }
  };

  /* =========================
     미리보기 토글 (로딩 포함)
  ========================= */
  const handlePreviewToggle = () => {
    if (previewData.length === 0) return;

    setOverlay("preview");
    setTimeout(() => {
      setShowPreview((prev) => !prev);
      setOverlay("none");
    }, 400);
  };

  /* =========================
     AI 분석 실행
  ========================= */
  const handleAnalyze = async () => {
    if (!file || totalRows === 0) return;

    setOverlay("analyze");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${API_BASE}/analysis/file`,
        formData,
        { withCredentials: true }
      );

      sessionStorage.setItem(
        "analysisResult",
        JSON.stringify(res.data)
      );

      router.push("/dashboard");
    } catch {
      alert("AI 분석 중 오류가 발생했습니다.");
      setOverlay("none");
    }
  };

  /* =========================
     초기 로딩
  ========================= */
  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100
                       flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-9 h-9 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-600">
            상태 확인 중…
          </p>
        </div>
      </main>
    );
  }

  const overlayMessage =
    overlay === "none"
      ? ""
      : {
          home: "메인 화면으로 이동 중…",
          logout: "로그아웃 중…",
          analyze: "AI가 리뷰를 분석 중입니다…",
          file: "파일을 불러오는 중…",
          preview: "미리보기 준비 중…",
        }[overlay];

  /* =========================
     UI
  ========================= */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 relative">
      {/* 공통 로딩 오버레이 */}
      {overlay !== "none" && (
        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur
                        flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-semibold text-gray-700">
            {overlayMessage}
          </p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            메인으로
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-red-500"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-20">
        {/* Title */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold mb-4">
            리뷰 데이터 업로드
          </h1>
          <p className="text-gray-600">
            설문(CSV/XLSX) 데이터를 업로드하면
            <br />
            AI가 자동으로 고객 인사이트를 도출합니다.
          </p>
        </div>

        {/* Upload Box */}
        <label className="block bg-white rounded-3xl border-2 border-dashed border-blue-200 p-16 text-center cursor-pointer transition hover:border-blue-400 hover:shadow-md">
          <UploadCloud className="mx-auto w-14 h-14 text-blue-600 mb-5" />
          <p className="text-lg font-semibold mb-2">
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-gray-500">
            CSV / XLSX 파일 지원 · 리뷰 컬럼 포함
          </p>

          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) =>
              e.target.files && handleFile(e.target.files[0])
            }
          />
        </label>

        {/* File Summary */}
        {file && (
          <div className="mt-12 bg-white rounded-3xl p-10 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xl font-bold">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  총{" "}
                  <span className="font-bold text-blue-600">
                    {totalRows.toLocaleString()}
                  </span>
                  건의 리뷰
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handlePreviewToggle}
                  className="px-5 py-3 rounded-xl border font-semibold hover:bg-gray-50"
                >
                  <Eye className="inline w-4 h-4 mr-1" />
                  미리보기
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={overlay !== "none" || totalRows === 0}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg disabled:opacity-50"
                >
                  <PlayCircle className="inline w-5 h-5 mr-1" />
                  AI 분석 실행
                </button>
              </div>
            </div>

            {/* Preview Table */}
            {showPreview && previewData.length > 0 && (
              <div className="mt-10 overflow-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left font-semibold"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-4 py-3">
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}