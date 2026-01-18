"use client";

import { useRouter } from "next/navigation";
import { Home, ArrowLeft, LogOut } from "lucide-react";

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
    <header className="sticky top-0 z-40 bg-white border-b print-hidden">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ================= LEFT ================= */}
        {variant === "home" ? (
          <span className="text-lg font-extrabold text-blue-600">
            Review Insight
          </span>
        ) : (
          <div className="flex items-center gap-4">
            {/* 🔙 뒤로가기 */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로가기
            </button>

            {/* 🏠 메인으로 */}
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-blue-600"
            >
              <Home className="w-4 h-4" />
              메인으로
            </button>
          </div>
        )}

        {/* ================= RIGHT ================= */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-500"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </header>
  );
}
