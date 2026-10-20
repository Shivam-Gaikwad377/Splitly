import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";

import {
    ThemeContext,
    type ResolvedTheme,
    type Theme,
    type ThemeContextValue,
} from "@/providers/theme-context";

const STORAGE_KEY = "splitly-theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: string | null): value is Theme {
    return value === "light" || value === "dark" || value === "system";
}

function getInitialTheme(): Theme {
    if (typeof window === "undefined") {
        return "system";
    }

    try {
        const savedTheme = window.localStorage.getItem(STORAGE_KEY);
        return isTheme(savedTheme) ? savedTheme : "system";
    } catch {
        return "system";
    }
}

function subscribeToSystemTheme(onChange: () => void) {
    if (typeof window === "undefined" || !window.matchMedia) {
        return () => { };
    }

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    mediaQuery.addEventListener("change", onChange);

    return () => {
        mediaQuery.removeEventListener("change", onChange);
    };
}

function getSystemThemeSnapshot(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia(SYSTEM_THEME_QUERY).matches
    );
}

function getServerSnapshot(): boolean {
    return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    const systemPrefersDark = useSyncExternalStore(
        subscribeToSystemTheme,
        getSystemThemeSnapshot,
        getServerSnapshot,
    );

    const resolvedTheme: ResolvedTheme =
        theme === "system"
            ? systemPrefersDark
                ? "dark"
                : "light"
            : theme;

    useEffect(() => {
        const root = document.documentElement;

        root.classList.toggle("dark", resolvedTheme === "dark");
        root.style.colorScheme = resolvedTheme;
    }, [resolvedTheme]);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // Theme selection still works without persistent storage.
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((current) => {
            const activeTheme =
                current === "system" ? resolvedTheme : current;

            return activeTheme === "dark" ? "light" : "dark";
        });
    }, [resolvedTheme]);

    const value = useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
        [theme, resolvedTheme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}