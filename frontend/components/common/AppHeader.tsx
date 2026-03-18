"use client";

import "./AppHeader.css";

import { useRouter } from "next/navigation";
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
    <header className="cx-nav">
      <div className="nav-inner">
        <button
          type="button"
          className="nav-logo app-nav-logo-btn"
         onClick={() => router.push("/")} 
        >
          <div className="nav-logo-mark">CX</div>
          <div>
            <div className="nav-logo-text">CXNexus</div>
            <div className="nav-logo-sub">by JKAX</div>
          </div>
        </button>

        <div className="nav-actions">
          {variant === "app" && (
            <button
              type="button"
              className="nav-pill nav-pill-outline"
              onClick={() => {
              window.location.href = "/landing/index.html#/";
            }}
            >
              <ArrowLeft size={14} />
              뒤로가기
            </button>
          )}

          <button
            type="button"
            className="nav-pill nav-pill-ghost"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}