"use client";

import "./AppHeader.css";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type AppHeaderProps = {
  variant: "home" | "app";
};

export default function AppHeader({ variant }: AppHeaderProps) {
  const router = useRouter();

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
              onClick={() => router.push("/")}
            >
              <ArrowLeft size={14} />
              뒤로가기
            </button>
          )}
        </div>
      </div>
    </header>
  );
}