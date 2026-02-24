"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StoredUser } from "@/lib/auth-storage";
import { LogOut } from 'lucide-react';

type SidebarItem = {
  label: string;
  href: string;
  requiresAuth?: boolean;
};

type SidebarProps = {
  items: SidebarItem[];
  user: StoredUser | null;
  environment: "qa" | "dev" | "uat" | "prod";
  setShowLogin: React.Dispatch<React.SetStateAction<boolean>>;
  onLogout: () => void;
};

export default function Sidebar({ items, user, environment, setShowLogin, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const envColors = {
    qa: "bg-yellow-100 text-yellow-800",
    dev: "bg-blue-100 text-blue-800",
    uat: "bg-orange-100 text-orange-800",
    prod: "bg-green-100 text-green-800",
  };

  return (
    <aside className="w-64 h-screen bg-[#FAFAFA] text-black flex flex-col p-4 border-r border-gray-200">
      
      {/* TOP SECTION: User Info */}
      <div className="pb-4 border-b border-gray-200 mb-4">
        {user ? (
          <>
            <div className="font-semibold text-lg truncate" title={user.displayName}>
                {user.displayName}
            </div>
            {user.schemaName && (
              <div className="text-sm text-gray-600 mt-0.5">Schema: {user.schemaName}</div>
            )}
            <div className="mt-2">
              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full uppercase ${envColors[environment]}`}>
                {environment}
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500 italic">Not logged in</div>
        )}
      </div>

      {/* MIDDLE SECTION: Navigation (Grows to fill space) */}
      <nav className="flex flex-col space-y-1 flex-grow">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const disabled = item.requiresAuth && !user;
          
          if (disabled) {
            return (
              <span key={item.href} className="p-3 rounded text-gray-400 cursor-not-allowed">
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-3 rounded transition ${
                isActive ? "bg-blue-500 font-bold text-white" : "hover:bg-gray-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      {user && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition"
          >
            <LogOut size={18}/>
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}