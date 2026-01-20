"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, LogOut } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AppHeaderProps = {
  variant: "home" | "app";
};

export default function AppHeader({ variant }: AppHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      // 🔒 로그아웃 직후 자동 재로그인 방지
      sessionStorage.setItem("just_logged_out", "1");
      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b print-hidden">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* ================= LEFT ================= */}
        <div className="flex items-center gap-6">
          {/* 🔷 브랜드 (로고 클릭 → 메인) */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <div className="relative h-9 w-9 rounded-xl bg-blue-50 overflow-hidden">
              <Image
                src="/icon.png"
                alt="CX Nexus Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <span
              className="text-lg font-semibold tracking-tight"
              style={{ color: "#0F172A" }}
            >
              CX Nexus
            </span>
          </button>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="flex items-center gap-5">
          {/* 🔙 뒤로가기 (app 화면에서만, 로그아웃 왼쪽) */}
          {variant === "app" && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm font-semibold
                         text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로가기
            </button>
          )}

          {/* 🚪 로그아웃 */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold
                       text-slate-600 hover:text-red-500 transition"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
