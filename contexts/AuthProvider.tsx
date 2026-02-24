// contexts/AuthProvider.tsx
"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type AuthUser = {
    accessToken: string;
    idToken: string;
};

type AuthContextType = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (tokens: AuthUser) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const accessToken = localStorage.getItem("accessToken");
        const idToken = localStorage.getItem("idToken");
        if (accessToken && idToken) {
            setUser({ accessToken, idToken });
        }
    }, []);

    const login = (tokens: AuthUser) => {
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("idToken", tokens.idToken);
        // ← Also set a cookie so middleware can read it
        document.cookie = `accessToken=${tokens.accessToken}; path=/; max-age=2592000; samesite=lax`;
        setUser(tokens);
    };

    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("idToken");
        // ← Clear the cookie too
        document.cookie = "accessToken=; path=/; max-age=0";
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}