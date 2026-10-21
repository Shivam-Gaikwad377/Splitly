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