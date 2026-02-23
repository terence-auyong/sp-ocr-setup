"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/SideBar";
import LoginPopup from "@/components/LoginPopup";
import { getStoredUser, setStoredTokens, clearStoredAuth, type StoredUser } from "@/lib/auth-storage";
import { STAGE_COOKIE_NAME } from "@/lib/edtr-stage-constants";

const pages = [
  { label: "OCR Template", href: "/", requiresAuth: false },
  { label: "Inventory Group", href: "/inventory-group", requiresAuth: true },
  { label: "Unit of Measure", href: "/uom", requiresAuth: true },
];

function getStageFromCookie(): "qa" | "dev" | "uat" | "prod" {
  if (typeof document === "undefined") return "qa";
  const match = document.cookie.match(new RegExp(`${STAGE_COOKIE_NAME}=([^;]+)`));
  const value = match?.[1]?.trim();
  if (value === "dev" || value === "qa" || value === "uat" || value === "prod") return value;
  return "qa";
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [environment, setEnvironment] = useState<"qa" | "dev" | "uat" | "prod">("qa");

  useEffect(() => {
    setUser(getStoredUser());
    setEnvironment(getStageFromCookie());
  }, []);

  const handleLoginSuccess = (tokens: { accessToken: string; idToken: string }) => {
    const u = setStoredTokens(tokens.idToken, tokens.accessToken);
    if (u) setUser(u);
    setShowLogin(false);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      clearStoredAuth();
      setUser(null);
    }
  };

  return (
    <div className="flex h-screen">
      {showLogin && (
        <LoginPopup
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      <Sidebar
        items={pages}
        user={user}
        environment={environment}
        setShowLogin={setShowLogin}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex items-center justify-center overflow-auto bg-gray-200">
        {children}
      </main>
    </div>
  );
}