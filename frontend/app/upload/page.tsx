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
} from "lucide-react";

export default function UploadPage() {
  const router = useRouter();

  // ✅ 환경변수 기반 API URL (로컬 / 배포 자동 분기)
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  /* =========================
     모든 상태는 최상단
  ========================= */
  const [checking, setChecking] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  /* =========================
     로그인 가드
  ========================= */
  useEffect(() => {
    let cancelled = false;

    const checkLogin = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/status`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!cancelled && !data.logged_in) {
          router.replace("/login");
          return;
        }
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    checkLogin();

    return () => {
      cancelled = true;
    };
  }, [router, API_URL]);

  /* =========================
     파일 업로드 & 미리보기
  ========================= */
  const handleFile = async (f: File) => {
    setFile(f);
    setShowPreview(false);
    setPreviewData([]);
    setTotalRows(0);

    if (f.name.endsWith(".csv")) {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setPreviewData(result.data.slice(0, 5));
          setTotalRows(result.data.length);
        },
      });
    } else {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setPreviewData(json.slice(0, 5));
      setTotalRows(json.length);
    }
  };

  /* =========================
     AI 분석 실행
  ========================= */
  const handleAnalyze = async () => {
    if (!file || totalRows === 0) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${API_URL}/analysis/file`,
        formData,
        { withCredentials: true }
      );

      sessionStorage.setItem(
        "analysisResult",
        JSON.stringify(res.data)
      );

      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      alert("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     로딩 화면 (return은 Hook 아래!)
  ========================= */
  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">로그인 상태 확인 중...</p>
      </main>
    );
  }

  /* =========================
     UI
  ========================= */
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16 relative">
      {/* 로딩 오버레이 */}
      {loading && (
        <div
          className="absolute inset-0 z-50 bg-white/80
                     flex flex-col items-center justify-center"
        >
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-700 font-semibold">
            AI가 리뷰를 분석 중입니다…
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-extrabold">
            📂 리뷰 데이터 업로드
          </h1>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-sm
                       text-gray-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" />
            메인으로
          </button>
        </div>

        {/* 업로드 박스 */}
        <label
          className="block bg-white border-2 border-dashed border-blue-200
                     rounded-3xl p-14 text-center cursor-pointer
                     hover:border-blue-400 transition"
        >
          <UploadCloud className="mx-auto w-12 h-12 text-blue-600 mb-4" />
          <p className="text-lg font-semibold mb-1">
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

        {/* 파일 요약 카드 */}
        {file && (
          <div className="mt-10 bg-white rounded-3xl p-8 shadow-sm">
            <div
              className="flex flex-col md:flex-row
                         md:items-center md:justify-between gap-6"
            >
              <div>
                <p className="text-lg font-semibold">{file.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  총{" "}
                  <span className="font-bold text-blue-600">
                    {totalRows.toLocaleString()}
                  </span>
                  건의 리뷰가 확인되었습니다
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl
                             border border-gray-200 text-gray-700
                             hover:bg-gray-50 font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? "미리보기 닫기" : "미리보기 보기"}
                </button>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || totalRows === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl
                             bg-blue-600 text-white font-semibold
                             hover:bg-blue-700 transition shadow-md
                             disabled:opacity-50"
                >
                  <PlayCircle className="w-5 h-5" />
                  AI 분석 실행
                </button>
              </div>
            </div>

            {/* 미리보기 */}
            {showPreview && previewData.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex justify-between text-sm text-gray-600">
                  <span className="font-semibold">
                    데이터 미리보기 (상위 5행)
                  </span>
                  <span>
                    컬럼 {Object.keys(previewData[0]).length}개
                  </span>
                </div>

                <div className="overflow-auto rounded-2xl border bg-gray-50">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left
                                       font-semibold text-gray-700"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr
                          key={i}
                          className="border-t hover:bg-white transition"
                        >
                          {Object.values(row).map((v, j) => (
                            <td
                              key={j}
                              className="px-4 py-3 text-gray-700
                                         whitespace-nowrap"
                            >
                              {String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}