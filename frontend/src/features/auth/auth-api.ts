import { apiClient } from "@/lib/api-client";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerified: boolean;
}

export interface LoginCredentials {
    identifier: string;
    password: string;
}

interface ApiSuccess<T> {
    success: true;
    message: string;
    data: T;
}

interface LoginResponseData {
    accessToken: string;
    user: AuthUser;
}

export async function login(
    credentials: LoginCredentials,
): Promise<LoginResponseData> {
    const response = await apiClient.post<
        ApiSuccess<LoginResponseData>
    >("/auth/login", credentials);

    return response.data.data;
}



let refreshAccessTokenPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
    if (refreshAccessTokenPromise) {
        return refreshAccessTokenPromise;
    }

    refreshAccessTokenPromise = apiClient
        .post<ApiSuccess<{ accessToken: string }>>("/auth/refresh")
        .then((response) => response.data.data.accessToken)
        .finally(() => {
            refreshAccessTokenPromise = null;
        });

    return refreshAccessTokenPromise;
}

export async function getCurrentUser(
    accessToken: string,
): Promise<AuthUser> {
    const response = await apiClient.get<
        ApiSuccess<{ user: AuthUser }>
    >("/auth/me", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data.data.user;
}


export interface RegisterCredentials {
    name: string;
    email: string;
    password: string;
    phone?: string;
}

export async function register(
    credentials: RegisterCredentials,
): Promise<AuthUser> {
    const response = await apiClient.post<
        ApiSuccess<{ user: AuthUser }>
    >("/auth/register", credentials);

    return response.data.data.user;
}


export async function requestEmailVerification(
    email: string,
): Promise<void> {
    await apiClient.post<ApiSuccess<null>>(
        "/auth/verify-email/request",
        { email },
    );
}

export async function verifyEmail(
    email: string,
    code: string,
): Promise<void> {
    const query = new URLSearchParams({ email });

    await apiClient.post<ApiSuccess<null>>(
        `/auth/verify-email?${query.toString()}`,
        { code },
    );
}


