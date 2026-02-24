// app/(main)/layout.tsx (or wherever MainLayout lives)
"use client";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "@/components/SideBar";
import { STAGE_COOKIE_NAME } from "@/lib/edtr-stage-constants";
import { getStoredUser, StoredUser } from "@/lib/auth-storage";

const pages = [
    { label: "OCR Template", href: "/", requiresAuth: true },
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
    const { user, logout } = useAuth();
    const router = useRouter();
    const [environment, setEnvironment] = useState<"qa" | "dev" | "uat" | "prod">("qa");
    const [storedUser, setStoredUser] = useState<StoredUser | null>(null); // ← add this

    useEffect(() => {
        setEnvironment(getStageFromCookie());
        setStoredUser(getStoredUser()); // ← decode displayName from stored idToken
    }, []);

    // Keep storedUser in sync when auth state changes (login/logout)
    useEffect(() => {
        setStoredUser(user ? getStoredUser() : null);
    }, [user]);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } finally {
            logout();
            router.push("/login");
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar
                items={pages}
                user={storedUser}
                environment={environment}
                setShowLogin={() => router.push("/login")}
                onLogout={handleLogout}
            />
            <main className="flex-1 flex items-center justify-center overflow-auto bg-gray-200">
                {children}
            </main>
        </div>
    );
}