import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const STORAGE_KEY = "splitly-theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue | null>(null);

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
        // Continue without persistence if browser storage is unavailable.
        return "system";
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    const [systemPrefersDark, setSystemPrefersDark] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia(SYSTEM_THEME_QUERY).matches,
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);

        const handleChange = (event: MediaQueryListEvent) => {
            setSystemPrefersDark(event.matches);
        };

        setSystemPrefersDark(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

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
            // The theme still works for the current session.
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((current) => {
            const activeTheme =
                current === "system" ? resolvedTheme : current;

            return activeTheme === "dark" ? "light" : "dark";
        });
    }, [resolvedTheme]);

    const value = useMemo(
        () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
        [theme, resolvedTheme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (context === null) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
}