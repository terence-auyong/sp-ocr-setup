"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StoredUser } from "@/lib/auth-storage";

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
    <aside className="w-64 h-screen bg-[#FAFAFA] text-black flex flex-col p-4">

      {/* Account Section: logged-in name + env + Logout, or Login */}
      <div className="pb-4 border-b border-gray-200 mb-4 rounded">
        {user ? (
          <>
            <div className="font-semibold text-lg">{user.displayName}</div>
            {user.schemaName && (
              <div className="text-sm text-gray-600 mt-0.5">Schema: {user.schemaName}</div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={`inline-block px-3 py-1 text-xs font-semibold rounded-full uppercase ${envColors[environment]}`}
              >
                {environment}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="w-full text-left font-semibold text-lg text-blue-600 hover:text-blue-800 hover:underline"
          >
            Login
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const disabled = item.requiresAuth && !user;
          if (disabled) {
            return (
              <span
                key={item.href}
                className="p-4 rounded text-gray-400 cursor-not-allowed"
                title="Log in to access"
              >
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-4 rounded transition ${
                isActive
                  ? "bg-blue-500 font-bold text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}