import {
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    getCurrentUser,
    login,
    refreshAccessToken,
    type AuthUser,
    type LoginCredentials,
} from "@/features/auth/auth-api";
import {
    AuthContext,
    type AuthContextValue,
} from "./auth-context";



export function AuthProvider({ children }: { children: ReactNode }) {
    const [isInitializing, setIsInitializing] = useState(true);

    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    useEffect(() => {
        let cancelled = false;
        
        async function restoreSession(): Promise<void> {
            try {
                const token = await refreshAccessToken();

                if (cancelled) return;

                const currentUser = await getCurrentUser(token);

                if (cancelled) return;

                setAccessToken(token);
                setUser(currentUser);
            } catch {
                if (!cancelled) {
                    setAccessToken(null);
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setIsInitializing(false);
                }
            }
        }

        void restoreSession();

        return () => {
            cancelled = true;
        };
    }, []);

    async function signIn(credentials: LoginCredentials): Promise<void> {
        const result = await login(credentials);

        setAccessToken(result.accessToken);
        setUser(result.user);
        setIsInitializing(false);
    }

    const value: AuthContextValue = {
        accessToken,
        user,
        isAuthenticated: accessToken !== null && user !== null,
        isInitializing,
        signIn,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

