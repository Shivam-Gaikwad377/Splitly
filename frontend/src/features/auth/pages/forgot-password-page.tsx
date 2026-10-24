
import { useState } from "react";
import axios from "axios";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    LoaderCircle,
    Mail,
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
import { requestPasswordReset } from "@/features/auth/auth-api";

interface ForgotPasswordFormValues {
    email: string;
}

interface ApiErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
}

function getForgotPasswordErrorMessage(error: unknown): string {
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
        return "Too many requests. Please wait before trying again.";
    }

    if (error.response.status === 400) {
        return "Enter a valid email address.";
    }

    return "We couldn't process your request. Please try again.";
}

export function ForgotPasswordPage() {
    const [requestedEmail, setRequestedEmail] = useState<string | null>(
        null,
    );
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormValues>({
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(
        values: ForgotPasswordFormValues,
    ): Promise<void> {
        const email = values.email.trim().toLowerCase();

        setFormError(null);

        try {
            await requestPasswordReset(email);
            setRequestedEmail(email);
        } catch (error: unknown) {
            setFormError(getForgotPasswordErrorMessage(error));
        }
    }

    return (
        <section className="mx-auto w-full max-w-md space-y-5">
            <header className="space-y-3 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                    {requestedEmail ? (
                        <CheckCircle2
                            className="size-7"
                            aria-hidden="true"
                        />
                    ) : (
                        <Mail
                            className="size-7"
                            aria-hidden="true"
                        />
                    )}
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Account recovery
                </p>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {requestedEmail
                        ? "Check your inbox"
                        : "Forgot your password?"}
                </h1>

                <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    {requestedEmail
                        ? "Your password-reset request has been processed."
                        : "It happens. Enter your account email and we'll help you reset your password."}
                </p>
            </header>

            {!requestedEmail ? (
                <Card className="gap-0 overflow-hidden border-border/70 bg-card shadow-xl shadow-primary/5">
                    <CardHeader className="gap-2 px-6 pt-6 pb-4 sm:px-7">
                        <CardTitle className="text-xl font-semibold">
                            Reset your password
                        </CardTitle>

                        <CardDescription className="leading-6">
                            Enter the email address associated with
                            your Splitly account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pt-2 pb-6 sm:px-7">
                        <form
                            noValidate
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-5"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="forgot-password-email">
                                    Email address
                                </Label>

                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />

                                    <Input
                                        id="forgot-password-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        maxLength={254}
                                        disabled={isSubmitting}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={
                                            errors.email
                                                ? "forgot-password-email-error"
                                                : undefined
                                        }
                                        className="h-12 rounded-xl pl-10"
                                        {...register("email", {
                                            required: "Enter your email address.",
                                            maxLength: {
                                                value: 254,
                                                message:
                                                    "Email must be 254 characters or fewer.",
                                            },
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message:
                                                    "Enter a valid email address.",
                                            },
                                        })}
                                    />
                                </div>

                                {errors.email && (
                                    <p
                                        id="forgot-password-email-error"
                                        className="text-sm text-destructive"
                                    >
                                        {errors.email.message}
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
                                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                                        Sending request...
                                    </>
                                ) : (
                                    <>
                                        Send reset instructions
                                        <ArrowRight className="size-4" aria-hidden="true" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-5 border-t border-border/70 pt-4">
                            <p className="text-center text-sm text-muted-foreground">
                                Remembered your password?{" "}
                                <Link
                                    to="/login"
                                    className="font-semibold text-primary underline-offset-4 hover:underline"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="gap-0 overflow-hidden border-border/70 bg-card shadow-xl shadow-primary/5">
                    <CardHeader className="gap-2 px-6 pt-6 pb-4 sm:px-7">
                        <CardTitle className="text-xl font-semibold">
                            Request received
                        </CardTitle>

                        <CardDescription className="leading-6">
                            If an account exists for this email,
                            password-reset instructions will be sent.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5 px-6 pt-2 pb-6 sm:px-7">
                        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <Mail
                                className="mt-0.5 size-5 shrink-0 text-primary"
                                aria-hidden="true"
                            />

                            <div className="min-w-0 space-y-1">
                                <p className="text-sm font-semibold">
                                    Check your email
                                </p>

                                <p className="break-all text-sm font-medium">
                                    {requestedEmail}
                                </p>

                                <p className="text-sm leading-5 text-muted-foreground">
                                    Check your spam folder too. For
                                    security, Splitly doesn't disclose
                                    whether an account matches this address.
                                </p>
                            </div>
                        </div>

                        <Button
                            asChild
                            size="lg"
                            className="h-12 w-full rounded-xl font-semibold"
                        >
                            <Link
                                to={`/reset-password?email=${encodeURIComponent(requestedEmail)}`}
                            >
                                Continue to reset password
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full rounded-xl"
                            onClick={() => {
                                setRequestedEmail(null);
                                setFormError(null);
                            }}
                        >
                            Try another email
                        </Button>
                    </CardContent>
                </Card>
            )}

            <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
                <ShieldCheck
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                />
                Your password is never sent or stored in plain text.
            </p>

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
