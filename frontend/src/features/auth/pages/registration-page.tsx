
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
    AlertCircle,
    ArrowRight,
    Eye,
    EyeOff,
    LoaderCircle,
    LockKeyhole,
    Mail,
    Phone,
    ShieldCheck,
    UserRound,
    WalletCards,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    register as registerAccount,
    type RegisterCredentials,
} from "@/features/auth/auth-api";

interface RegistrationFormValues {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
}

interface ApiErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
}

function getRegistrationErrorMessage(error: unknown): string {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return "Something went wrong. Please try again.";
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return "The request timed out. Please try again.";
    }

    if (!error.response) {
        return "Unable to connect to the server. Check your connection.";
    }

    const apiError = error.response.data?.error;

    if (apiError?.code === "EMAIL_ALREADY_EXISTS") {
        return "An account with this email already exists.";
    }

    if (apiError?.code === "PHONE_ALREADY_EXISTS") {
        return "An account with this phone number already exists.";
    }

    if (error.response.status === 429) {
        return "Too many registration attempts. Please try again later.";
    }

    return apiError?.message ?? "Unable to create your account. Please try again.";
}

export function RegisterPage() {
    const navigate = useNavigate();

    const [formError, setFormError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register: registerField,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegistrationFormValues>({
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(
        values: RegistrationFormValues,
    ): Promise<void> {
        setFormError(null);

        const credentials: RegisterCredentials = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            password: values.password,
            ...(values.phone.trim()
                ? { phone: values.phone.trim() }
                : {}),
        };

        try {
            const user = await registerAccount(credentials);

            toast.success("Account created. Verify your email to continue.");

            navigate(
                `/verify-email?email=${encodeURIComponent(user.email)}`,
                { replace: true },
            );
        } catch (error: unknown) {
            const message = getRegistrationErrorMessage(error);

            setFormError(message);
            toast.error(message);
        }
    }

    return (
        <section className="mx-auto w-full max-w-md space-y-2">
            <header className="space-y-3 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                    <WalletCards className="size-7" aria-hidden="true" />
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Shared expenses, made simple
                </p>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Create your account
                </h1>

                <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    Join Splitly to organize shared expenses, manage groups,
                    and keep everyone's balances clear.
                </p>
            </header>

            <Card className="gap-0 overflow-hidden border-border/70 bg-card shadow-xl shadow-primary/5">
                <CardHeader className="border-b border-border/70 bg-transparent px-6 py-4 sm:px-7">
                    <CardTitle className="text-lg font-semibold">
                        Get started with Splitly
                    </CardTitle>

                    <CardDescription>
                        Enter your details to create your account.
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-6 py-6 sm:px-7">
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4"
                        noValidate
                    >
                        <div className="space-y-2">
                            <Label htmlFor="name">Full name</Label>

                            <div className="relative">
                                <UserRound
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="name"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Your full name"
                                    maxLength={100}
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={
                                        errors.name ? "name-error" : undefined
                                    }
                                    disabled={isSubmitting}
                                    className="h-11 rounded-lg pl-10"
                                    {...registerField("name", {
                                        required: "Enter your name.",
                                        validate: (value) =>
                                            value.trim().length > 0 ||
                                            "Enter your name.",
                                        maxLength: {
                                            value: 100,
                                            message:
                                                "Name must be at most 100 characters.",
                                        },
                                    })}
                                />
                            </div>

                            {errors.name && (
                                <p
                                    id="name-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>

                            <div className="relative">
                                <Mail
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    maxLength={254}
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={
                                        errors.email ? "email-error" : undefined
                                    }
                                    disabled={isSubmitting}
                                    className="h-11 rounded-lg pl-10"
                                    {...registerField("email", {
                                        required: "Enter your email address.",
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message:
                                                "Enter a valid email address.",
                                        },
                                        maxLength: {
                                            value: 254,
                                            message:
                                                "Email must be at most 254 characters.",
                                        },
                                    })}
                                />
                            </div>

                            {errors.email && (
                                <p
                                    id="email-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                Phone number{" "}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>

                            <div className="relative">
                                <Phone
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="phone"
                                    type="tel"
                                    autoComplete="tel"
                                    placeholder="+91 98765 43210"
                                    maxLength={40}
                                    aria-invalid={Boolean(errors.phone)}
                                    aria-describedby={
                                        errors.phone ? "phone-error" : undefined
                                    }
                                    disabled={isSubmitting}
                                    className="h-11 rounded-lg pl-10"
                                    {...registerField("phone", {
                                        validate: (value) =>
                                            !value.trim() ||
                                            value.trim().startsWith("+") ||
                                            "Include your country calling code, e.g. +91.",
                                    })}
                                />
                            </div>

                            {errors.phone && (
                                <p
                                    id="phone-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.phone.message}
                                </p>
                            )}

                            <p className="text-xs text-muted-foreground">
                                Include your country calling code if you provide
                                a number.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>

                            <div className="relative">
                                <LockKeyhole
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password
                                            ? "password-error"
                                            : undefined
                                    }
                                    disabled={isSubmitting}
                                    className="h-11 rounded-lg pl-10 pr-11"
                                    {...registerField("password", {
                                        required: "Create a password.",
                                        minLength: {
                                            value: 8,
                                            message:
                                                "Password must contain at least 8 characters.",
                                        },
                                    })}
                                />

                                <button
                                    type="button"
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    aria-pressed={showPassword}
                                    disabled={isSubmitting}
                                    onClick={() =>
                                        setShowPassword((visible) => !visible)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                >
                                    {showPassword ? (
                                        <EyeOff
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Eye
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            </div>

                            {errors.password && (
                                <p
                                    id="password-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.password.message}
                                </p>
                            )}

                            <p className="text-xs text-muted-foreground">
                                Use at least 8 characters.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Confirm password
                            </Label>

                            <Input
                                id="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                aria-invalid={Boolean(errors.confirmPassword)}
                                aria-describedby={
                                    errors.confirmPassword
                                        ? "confirm-password-error"
                                        : undefined
                                }
                                disabled={isSubmitting}
                                className="h-11 rounded-lg"
                                {...registerField("confirmPassword", {
                                    required: "Confirm your password.",
                                    validate: (value) =>
                                        value === watch("password") ||
                                        "Passwords do not match.",
                                })}
                            />

                            {errors.confirmPassword && (
                                <p
                                    id="confirm-password-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        {formError && (
                            <div
                                role="alert"
                                className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
                            >
                                <AlertCircle
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <p>{formError}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            size="lg"
                            className="h-11 w-full rounded-lg font-semibold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <LoaderCircle
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create account
                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="my-6 border-t border-border/70" />

                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        >
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck
                    className="size-4 text-primary"
                    aria-hidden="true"
                />
                You'll verify your email before signing in.
            </p>
        </section>
    );
}
