
import { useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    LoaderCircle,
    LockKeyhole,
    ShieldCheck,
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
import { resetPassword } from "@/features/auth/auth-api";

interface ResetPasswordFormValues {
    code: string;
    newPassword: string;
    confirmPassword: string;
}

interface ApiErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
}

function getResetPasswordErrorMessage(error: unknown): string {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return "Something went wrong. Please try again.";
    }

    if (
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT"
    ) {
        return "The request timed out. Please try again.";
    }

    if (!error.response) {
        return "Unable to connect to the server. Check your connection.";
    }

    if (error.response.status === 429) {
        return "Too many attempts. Please wait before trying again.";
    }

    const apiError = error.response.data?.error;

    if (
        apiError?.code === "INVALID_RESET_TOKEN" ||
        error.response.status === 400
    ) {
        return "The reset code is invalid or has expired. Request a new code and try again.";
    }

    return apiError?.message ??
        "Unable to reset your password. Please try again.";
}

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const email = (
        searchParams.get("email") ?? ""
    ).trim().toLowerCase();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormValues>({
        defaultValues: {
            code: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(
        values: ResetPasswordFormValues,
    ): Promise<void> {
        setFormError(null);

        try {
            await resetPassword({
                email,
                code: values.code,
                newPassword: values.newPassword,
            });

            setIsComplete(true);
        } catch (error: unknown) {
            setFormError(getResetPasswordErrorMessage(error));
        }
    }

    if (!email) {
        return (
            <section className="mx-auto w-full max-w-md">
                <Card className="gap-0 border-border/70 bg-card shadow-xl shadow-primary/5">
                    <CardHeader className="gap-2 px-6 pt-6 pb-4 sm:px-7">
                        <CardTitle className="text-xl font-semibold">
                            Start password recovery
                        </CardTitle>

                        <CardDescription className="leading-6">
                            Request a password-reset code first.
                            We'll use your email address to identify
                            the reset request.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 sm:px-7">
                        <Button
                            asChild
                            size="lg"
                            className="h-12 w-full rounded-xl"
                        >
                            <Link to="/forgot-password">
                                Request reset code
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        );
    }

    if (isComplete) {
        return (
            <section className="mx-auto w-full max-w-md space-y-5">
                <header className="space-y-3 text-center">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                        <CheckCircle2
                            className="size-7"
                            aria-hidden="true"
                        />
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        Password updated
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        You're all set
                    </h1>

                    <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                        Your password has been changed successfully.
                        Sign in using your new password.
                    </p>
                </header>

                <Card className="gap-0 border-border/70 bg-card shadow-xl shadow-primary/5">
                    <CardContent className="space-y-4 px-6 py-6 sm:px-7">
                        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <ShieldCheck
                                className="mt-0.5 size-5 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            <p className="text-sm leading-6 text-muted-foreground">
                                Your new password is ready to use.
                                This page won't sign you in automatically.
                            </p>
                        </div>

                        <Button
                            asChild
                            size="lg"
                            className="h-12 w-full rounded-xl font-semibold"
                        >
                            <Link to="/login">
                                Continue to sign in
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-md space-y-5">
            <header className="space-y-3 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                    <KeyRound className="size-7" aria-hidden="true" />
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Account recovery
                </p>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Create a new password
                </h1>

                <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    Enter the code sent to your email and choose a
                    new password for your Splitly account.
                </p>
            </header>

            <Card className="gap-0 overflow-hidden border-border/70 bg-card shadow-xl shadow-primary/5">
                <CardHeader className="gap-2 px-6 pt-6 pb-4 sm:px-7">
                    <CardTitle className="text-xl font-semibold">
                        Reset your password
                    </CardTitle>

                    <CardDescription className="break-all leading-6">
                        Resetting the password for{" "}
                        <span className="font-medium text-foreground">
                            {email}
                        </span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-6 pt-2 pb-6 sm:px-7">
                    <form
                        noValidate
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="reset-code">
                                6-digit reset code
                            </Label>

                            <Input
                                id="reset-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                maxLength={6}
                                disabled={isSubmitting}
                                aria-invalid={Boolean(errors.code)}
                                aria-describedby={
                                    errors.code
                                        ? "reset-code-error"
                                        : "reset-code-hint"
                                }
                                className="h-14 rounded-xl text-center text-xl font-semibold tracking-[0.5em] tabular-nums"
                                {...register("code", {
                                    required: "Enter your reset code.",
                                    pattern: {
                                        value: /^\d{6}$/,
                                        message: "Enter all six digits.",
                                    },
                                })}
                            />

                            <p
                                id="reset-code-hint"
                                className="text-xs text-muted-foreground"
                            >
                                The code expires after 10 minutes.
                            </p>

                            {errors.code && (
                                <p
                                    id="reset-code-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.code.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-password">
                                New password
                            </Label>

                            <div className="relative">
                                <LockKeyhole
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    disabled={isSubmitting}
                                    aria-invalid={Boolean(errors.newPassword)}
                                    aria-describedby={
                                        errors.newPassword
                                            ? "new-password-error"
                                            : "new-password-hint"
                                    }
                                    className="h-12 rounded-xl pl-10 pr-11"
                                    {...register("newPassword", {
                                        required: "Enter your new password.",
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
                                            ? "Hide new password"
                                            : "Show new password"
                                    }
                                    aria-pressed={showPassword}
                                    disabled={isSubmitting}
                                    onClick={() =>
                                        setShowPassword((visible) => !visible)
                                    }
                                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="size-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>

                            <p
                                id="new-password-hint"
                                className="text-xs text-muted-foreground"
                            >
                                Use at least 8 characters.
                            </p>

                            {errors.newPassword && (
                                <p
                                    id="new-password-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.newPassword.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">
                                Confirm new password
                            </Label>

                            <div className="relative">
                                <LockKeyhole
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />

                                <Input
                                    id="confirm-password"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    autoComplete="new-password"
                                    disabled={isSubmitting}
                                    aria-invalid={Boolean(
                                        errors.confirmPassword,
                                    )}
                                    aria-describedby={
                                        errors.confirmPassword
                                            ? "confirm-password-error"
                                            : undefined
                                    }
                                    className="h-12 rounded-xl pl-10 pr-11"
                                    {...register("confirmPassword", {
                                        required: "Confirm your new password.",
                                        validate: (value) =>
                                            value === getValues("newPassword") ||
                                            "Passwords do not match.",
                                    })}
                                />

                                <button
                                    type="button"
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide confirmation password"
                                            : "Show confirmation password"
                                    }
                                    aria-pressed={showConfirmPassword}
                                    disabled={isSubmitting}
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            (visible) => !visible,
                                        )
                                    }
                                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="size-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="size-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>

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
                                className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-sm text-destructive"
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
                            className="h-12 w-full rounded-xl font-semibold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <LoaderCircle
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                    Updating password...
                                </>
                            ) : (
                                <>
                                    Update password
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-5 border-t border-border/70 pt-4">
                        <p className="text-center text-sm text-muted-foreground">
                            Need a new code?{" "}
                            <Link
                                to="/forgot-password"
                                className="font-semibold text-primary underline-offset-4 hover:underline"
                            >
                                Request another
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="text-center">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to sign in
                </Link>
            </div>
        </section>
    );
}
