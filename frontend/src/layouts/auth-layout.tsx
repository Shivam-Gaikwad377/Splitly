import { Outlet } from "react-router";

import { AppLogo } from "@/components/shared/app-logo";

export function AuthLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="border-b bg-card">
                <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
                    <AppLogo />
                </div>
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </main>

            <footer className="border-t px-4 py-5 text-center text-sm text-muted-foreground">
                Shared expenses. Clear balances.
            </footer>
        </div>
    );
}