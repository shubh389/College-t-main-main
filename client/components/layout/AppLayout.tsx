import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarCheck2, LogOut } from "lucide-react";

const nav = [
  { to: "/attendance", label: "My Attendance", icon: CalendarCheck2 },
];

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 h-screen shrink-0 flex-col bg-white text-red-700 border-r">
      <div className="h-20 px-4 flex items-center gap-3 border-b bg-white">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F7fd684fc34014f22bf6238a7a5e8d88d%2F2c924fbeda524e1eb6595135ac252333?format=webp&width=160"
          alt="Techno India Group"
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="font-semibold text-base leading-tight">
          Techno India Group
        </div>
      </div>
      <nav className="p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                active ? "bg-red-50 text-red-700" : "hover:bg-red-50",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-red-700")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 border-t">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-red-50">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground overflow-x-hidden",
      )}
    >
      <header className="sticky top-0 z-40 w-full bg-primary text-primary-foreground md:ml-64 h-14">
        <div className="container flex items-center justify-between h-14 overflow-x-hidden">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20" />
            <div>
              <p className="text-sm leading-none opacity-80">Attendance</p>
              <h1 className="text-lg font-semibold tracking-tight">
                My Attendance
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Realtime attendance synced
          </div>
        </div>
      </header>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 container py-6 md:ml-64">{children}</main>
      </div>
      <footer className="container md:ml-64 py-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} CampusTrack • All rights reserved
      </footer>
    </div>
  );
}
