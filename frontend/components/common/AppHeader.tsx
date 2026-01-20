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
      sessionStorage.setItem("just_logged_out", "1");
      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      {/* 🔑 헤더 높이를 기준으로 모든 걸 맞춘다 */}
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* LEFT */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center h-full"
        >
          {/* 🔑 로고는 height 기준 */}
          <div className="relative h-10 w-[339px]">
            <Image
              src="/img-header.png"
              alt="CX Nexus"
              fill
              priority
              className="object-contain"
            />
          </div>
        </button>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {variant === "app" && (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로가기
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-red-500"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
