import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import {
    AlertCircle,
    ArrowRight,
    AtSign,
    Eye,
    EyeOff,
    LoaderCircle,
    LockKeyhole,
    ShieldCheck,
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
import { useAuth } from "@/providers/auth-provider";

interface LoginFormValues {
    identifier: string;
    password: string;
}

interface ApiErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
}

function getLoginErrorMessage(error: unknown): string {
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

    if (apiError?.code === "INVALID_CREDENTIALS") {
        return "Invalid email/phone number or password.";
    }

    if (apiError?.code === "EMAIL_NOT_VERIFIED") {
        return "Please verify your email before signing in.";
    }

    if (error.response.status === 429) {
        return "Too many attempts. Please wait before trying again.";
    }

    return apiError?.message ?? "Unable to sign in. Please try again.";
}

export function LoginPage() {
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const [formError, setFormError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        defaultValues: {
            identifier: "",
            password: "",
        },
    });
    async function onSubmit(values: LoginFormValues): Promise<void> {
        try {
            await signIn(values);

            toast.success("Signed in successfully");
            navigate("/dashboard", { replace: true });
        } catch (error: unknown) {
            toast.error(getLoginErrorMessage(error));
            setFormError(getLoginErrorMessage(error));
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
                    Welcome back
                </h1>

                <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    Sign in to manage your groups, track expenses, and keep every
                    balance clear.
                </p>
            </header>

            <Card className="gap-0 overflow-hidden border-border/70 bg-card shadow-xl shadow-primary/5">
                <CardHeader className="border-b bg-transparent border-border/70  px-6 py-4 sm:px-7">
                    <CardTitle className="text-lg font-semibold">
                        Sign in to Splitly
                    </CardTitle>

                    <CardDescription>
                        Enter your account details to continue.
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-6 py-6 sm:px-7">
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                        noValidate
                    >
                        <div className="space-y-2">
                            <Label htmlFor="identifier">
                                Email or phone number
                            </Label>

                            <div className="relative">
                                <AtSign
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="identifier"
                                    type="text"
                                    autoComplete="username"
                                    placeholder="you@example.com"
                                    aria-invalid={Boolean(errors.identifier)}
                                    aria-describedby={
                                        errors.identifier ? "identifier-error" : undefined
                                    }
                                    disabled={isSubmitting}
                                    className="h-11 rounded-lg pl-10"
                                    {...register("identifier", {
                                        required: "Enter your email or phone number.",
                                        validate: (value) =>
                                            value.trim().length > 0 ||
                                            "Enter your email or phone number.",
                                    })}
                                />
                            </div>

                            {errors.identifier && (
                                <p
                                    id="identifier-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.identifier.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="password">Password</Label>

                                <Link
                                    to="/forgot-password"
                                    className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <div className="relative">
                                <LockKeyhole
                                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={
                                        errors.password ? "password-error" : undefined
                                    }
                                    disabled={isSubmitting}
                                    className="h-11 rounded-lg pl-10 pr-11"
                                    {...register("password", {
                                        required: "Enter your password.",
                                    })}
                                />

                                <button
                                    type="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    aria-pressed={showPassword}
                                    disabled={isSubmitting}
                                    onClick={() => setShowPassword((visible) => !visible)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="size-4" aria-hidden="true" />
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
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="my-6 border-t border-border/70" />

                    <p className="text-center text-sm text-muted-foreground">
                        New to Splitly?{" "}
                        <Link
                            to="/register"
                            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        >
                            Create an account
                        </Link>
                    </p>
                </CardContent>
            </Card>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Your account is protected by secure session handling.
            </p>
        </section>
    );
}