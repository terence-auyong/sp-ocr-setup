"use client";
import { useAuth } from "@/contexts/AuthProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "@/components/common/SideBar";
import { STAGE_COOKIE_NAME } from "@/lib/edtr-stage-constants";
import { getStoredUser, StoredUser } from "@/lib/auth-storage";
import Spinner from "@/components/common/Spinner";

const pages = [
    { label: "OCR Template", href: "/", requiresAuth: true },
    { label: "Inventory Group", href: "/inventory-group", requiresAuth: true },
    { label: "Unit of Measure", href: "/uom", requiresAuth: true },
    { label: "OCR Mapping Upload", href: "/ocr-mapping-upload", requiresAuth: true },
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
    const [storedUser, setStoredUser] = useState<StoredUser | null>(null); 

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
        setEnvironment(getStageFromCookie());
        setStoredUser(getStoredUser()); // ← decode displayName from stored idToken
    }, []);

    // Keep storedUser in sync when auth state changes (login/logout)
    useEffect(() => {
        setStoredUser(user ? getStoredUser() : null);
    }, [user]);

    const handleLogout = async () => {
        setIsLoggingOut(true); 
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            logout();
            router.push("/login");
            setIsLoggingOut(false); 
            setShowLogoutConfirm(false);
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar
                items={pages}
                user={storedUser}
                environment={environment}
                setShowLogin={() => router.push("/login")}
                onLogout={() => setShowLogoutConfirm(true)}
            />
            <main className="flex-1 flex items-center justify-center overflow-auto bg-gray-200">
                {children}
            </main>
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white p-6 rounded shadow-xl w-80 flex flex-col gap-4">
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900">Confirm Logout</h3>
                            <p className="text-sm text-gray-600 mt-2">Are you sure you want to log out?</p>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button 
                                disabled={isLoggingOut}
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 w-40 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={isLoggingOut}
                                onClick={handleLogout}
                                className="flex-1 w-40 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoggingOut ? (
                                    "Logging out..."
                                ) : (
                                    "Log out"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}