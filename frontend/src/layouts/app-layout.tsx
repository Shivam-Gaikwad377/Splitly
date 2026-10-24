import { NavLink, Outlet } from "react-router";
import { useState } from "react";
import { useNavigate } from "react-router";
import { LogOut, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AppLogo } from "@/components/shared/app-logo";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
    ].join(" ");

export function AppLayout() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleSignOut(): Promise<void> {
        setIsSigningOut(true);

        try {
            await signOut();

            toast.success("Signed out successfully");

            navigate("/login", { replace: true });
        } catch {
            toast.error("Could not sign out. Please try again.");
        } finally {
            setIsSigningOut(false);
        }
    }
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
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSigningOut}
                            onClick={() => void handleSignOut()}
                        >
                            {isSigningOut ? (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <LogOut
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}

                            {isSigningOut ? "Signing out..." : "Sign out"}
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
}