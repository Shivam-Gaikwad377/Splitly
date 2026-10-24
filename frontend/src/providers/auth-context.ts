import { createContext } from "react";

import type {
    AuthUser,
    LoginCredentials,
} from "@/features/auth/auth-api";

export interface AuthContextValue {
    accessToken: string | null;
    user: AuthUser | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    signIn: (credentials: LoginCredentials) => Promise<void>;
    signOut: () => Promise<void>;
}

export const AuthContext =
    createContext<AuthContextValue | null>(null);