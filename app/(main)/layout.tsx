"use client";
import { useState } from "react";
import Sidebar from "@/components/SideBar";
import LoginPopup from "@/components/LoginPopup";

const pages = [
  { label: "OCR Template", href: "/" },
  { label: "Inventory Group", href: "/inventory-group" },
  { label: "Unit of Measure", href: "/uom" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="flex h-screen">
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
      <Sidebar items={pages} accountName={"Terence Auyong"} environment={"qa"} setShowLogin={setShowLogin} />
      <main className="flex-1 flex items-center justify-center overflow-auto bg-gray-200">
        {children}
      </main>
    </div>
  );
}