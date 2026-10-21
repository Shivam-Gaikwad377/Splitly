import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

import {
    login,
    type AuthUser,
    type LoginCredentials,
} from "@/features/auth/auth-api";

interface AuthContextValue {
    accessToken: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;
    signIn: (credentials: LoginCredentials) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);

    async function signIn(credentials: LoginCredentials): Promise<void> {
        const result = await login(credentials);

        setAccessToken(result.accessToken);
        setUser(result.user);
    }

    const value: AuthContextValue = {
        accessToken,
        user,
        isAuthenticated: accessToken !== null && user !== null,
        signIn,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (context === null) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
