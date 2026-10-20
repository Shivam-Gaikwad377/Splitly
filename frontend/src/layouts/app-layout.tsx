import { NavLink, Outlet } from "react-router";

import { AppLogo } from "@/components/shared/app-logo";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
    ].join(" ");

export function AppLayout() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <AppLogo />

                    <nav
                        aria-label="Main navigation"
                        className="flex flex-wrap items-center gap-2"
                    >
                        <NavLink to="/dashboard" className={navLinkClass}>
                            Dashboard
                        </NavLink>

                        <NavLink to="/design-system" className={navLinkClass}>
                            Design system
                        </NavLink>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}