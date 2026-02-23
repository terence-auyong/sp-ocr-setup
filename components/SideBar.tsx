"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  label: string;
  href: string;
};

type SidebarProps = {
  items: SidebarItem[];
  accountName: string;
  environment: "qa" | "dev" | "prod";
  setShowLogin: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Sidebar({ items, accountName, environment, setShowLogin }: SidebarProps) {
  const pathname = usePathname();

  const envColors = {
    qa: "bg-yellow-100 text-yellow-800",
    dev: "bg-blue-100 text-blue-800",
    prod: "bg-green-100 text-green-800",
  };

  return (
    <aside className="w-64 h-screen bg-[#FAFAFA] text-black flex flex-col p-4">

      {/* Account Section */}
      <div 
        className="pb-4 border-b border-gray-200 mb-4 cursor-pointer rounded transition-colors duration-200 hover:bg-gray-200"
        onClick={() => setShowLogin(prev => !prev)}
      >
        <div className="font-semibold text-lg">{accountName}</div>
        <div
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full uppercase ${envColors[environment]}`}
        >
          {environment}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
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