"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  label: string;
  href: string;
};

type SidebarProps = {
  items: SidebarItem[];
};

export default function Sidebar({ items }: SidebarProps) {
    const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#FAFAFA] text-black flex flex-col p-4">
        <h2 className="text-2xl font-bold mb-6">OCR Setup</h2>

        <nav className="flex flex-col">
            {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`p-4 rounded ${
                            isActive ? "bg-blue-300 font-bold text-white" : "hover:bg-gray-200"
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
