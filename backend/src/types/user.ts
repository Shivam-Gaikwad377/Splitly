export type UserProfile = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerified: boolean;
}