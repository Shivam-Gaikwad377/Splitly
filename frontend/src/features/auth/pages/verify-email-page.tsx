
import { useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import {
    AlertCircle,
 
    ArrowRight,
    CheckCircle2,
    KeyRound,
    LoaderCircle,
    Mail,
    ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
    requestEmailVerification,
    verifyEmail,
} from "@/features/auth/auth-api";

type VerificationStep = "request" | "code" | "verified";

interface EmailFormValues {
    email: string;
}

interface CodeFormValues {
    code: string;
}

interface ApiErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
}

function getVerificationErrorMessage(
    error: unknown,
    action: "request" | "verify",
): string {
    const fallback =
        action === "request"
            ? "Unable to process your request. Please try again."
            : "Unable to verify your email. Please try again.";

    if (!axios.isAxiosError<ApiErrorResponse>(error)) {
        return fallback;
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
        action === "verify" &&
        (
            apiError?.code === "INVALID_EMAIL_OR_CODE" ||
            apiError?.code === "INVALID_VERIFICATION_CODE" ||
            error.response.status === 400
        )
    ) {
        return "That code is invalid or has expired. Check the code or request a new one.";
    }

    return apiError?.message ?? fallback;
}

function VerificationProgress({
    activeStep,
}: {
    activeStep: 1 | 2;
}) {
    return (
        <div
            className="space-y-2"
            aria-label={`Step ${activeStep} of 2`}
        >
            <div className="flex items-center justify-between gap-3 text-xs font-medium">
                <span
                    className={
                        activeStep === 1
                            ? "text-primary"
                            : "text-muted-foreground"
                    }
                >
                    1. Request code
                </span>

                <span
                    className={
                        activeStep === 2
                            ? "text-primary"
                            : "text-muted-foreground"
                    }
                >
                    2. Verify email
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="h-1.5 rounded-full bg-primary" />
                <div
                    className={`h-1.5 rounded-full ${
                        activeStep === 2
                            ? "bg-primary"
                            : "bg-muted"
                    }`}
                />
            </div>
        </div>
    );
}

export function EmailVerificationPage() {
    const { isAuthenticated, user } = useAuth();
    const isUserVerified = isAuthenticated && user ? user.emailVerified : false;
    const [searchParams] = useSearchParams();
    
    const initialEmail = (
        searchParams.get("email") ?? ""
    ).trim().toLowerCase();
    
    const [step, setStep] = useState<VerificationStep>("request");
    const visibleStep = isUserVerified ? "verified" : step;
    const [email, setEmail] = useState(initialEmail);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [resendError, setResendError] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);
    const [hasResent, setHasResent] = useState(false);

    const requestForm = useForm<EmailFormValues>({
        defaultValues: { email: initialEmail },
    });

    const codeForm = useForm<CodeFormValues>({
        defaultValues: { code: "" },
    });

    async function onRequestCode(
        values: EmailFormValues,
    ): Promise<void> {
        const normalizedEmail = values.email.trim().toLowerCase();
        setRequestError(null);

        try {
            await requestEmailVerification(normalizedEmail);

            setEmail(normalizedEmail);
            setCodeError(null);
            setResendError(null);
            setHasResent(false);
            codeForm.reset({ code: "" });

            // Show the separate code-entry card after the request succeeds.
            setStep("code");
        } catch (error: unknown) {
            setRequestError(
                getVerificationErrorMessage(error, "request"),
            );
        }
    }

    async function onVerifyCode(
        values: CodeFormValues,
    ): Promise<void> {
        setCodeError(null);

        try {
            await verifyEmail(email, values.code);
            setStep("verified");
        } catch (error: unknown) {
            setCodeError(
                getVerificationErrorMessage(error, "verify"),
            );
        }
    }

    async function onResendCode(): Promise<void> {
        setIsResending(true);
        setResendError(null);
        setCodeError(null);

        try {
            await requestEmailVerification(email);
            setHasResent(true);
        } catch (error: unknown) {
            setResendError(
                getVerificationErrorMessage(error, "request"),
            );
        } finally {
            setIsResending(false);
        }
    }

    function useDifferentEmail(): void {
        requestForm.setValue("email", email);
        setRequestError(null);
        setCodeError(null);
        setResendError(null);
        setHasResent(false);
        codeForm.reset({ code: "" });
        setStep("request");
    }

    return (
        <section className="mx-auto w-full max-w-md space-y-5">
            <header className="space-y-3 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                    {step === "request" ? (
                        <Mail className="size-7" aria-hidden="true" />
                    ) : step === "code" ? (
                        <KeyRound className="size-7" aria-hidden="true" />
                    ) : (
                        <CheckCircle2 className="size-7" aria-hidden="true" />
                    )}
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Account security
                </p>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {step === "verified"
                        ? "You're verified"
                        : "Verify your email"}
                </h1>

                <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                    {step === "request"
                        ? "Confirm your email address to finish setting up your Splitly account."
                        : step === "code"
                          ? "Enter the code associated with your email address."
                          : "Your email verification is complete. You can now sign in to Splitly."}
                </p>
            </header>

            {step !== "verified" && (
                <VerificationProgress
                    activeStep={step === "request" ? 1 : 2}
                />
            )}

            {visibleStep === "request" && (
                <Card className="gap-0 overflow-hidden border-border/70 bg-card shadow-xl shadow-primary/5">
                    <CardHeader className="gap-2 px-6 pt-6 pb-4 sm:px-7">
                        <CardTitle className="text-xl font-semibold">
                            Send a verification code
                        </CardTitle>

                        <CardDescription className="leading-6">
                            We'll send a one-time, six-digit code
                            to your email if your account is eligible.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pt-2 pb-6 sm:px-7">
                        <form
                            noValidate
                            onSubmit={requestForm.handleSubmit(onRequestCode)}
                            className="space-y-5"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="verification-email">
                                    Email address
                                </Label>

                                <div className="relative">
                                    <Mail
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />

                                    <Input
                                        id="verification-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        maxLength={254}
                                        disabled={requestForm.formState.isSubmitting}
                                        aria-invalid={Boolean(
                                            requestForm.formState.errors.email,
                                        )}
                                        aria-describedby={
                                            requestForm.formState.errors.email
                                                ? "verification-email-error"
                                                : undefined
                                        }
                                        className="h-12 rounded-xl pl-10"
                                        {...requestForm.register("email", {
                                            required: "Enter your email address.",
                                            maxLength: {
                                                value: 254,
                                                message: "Email must be 254 characters or fewer.",
                                            },
                                            pattern: {
                                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                                message: "Enter a valid email address.",
                                            },
                                        })}
                                    />
                                </div>

                                {requestForm.formState.errors.email && (
                                    <p
                                        id="verification-email-error"
                                        className="text-sm text-destructive"
                                    >
                                        {requestForm.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            {requestError && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-sm text-destructive"
                                >
                                    <AlertCircle
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <p>{requestError}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="h-12 w-full rounded-xl font-semibold"
                                disabled={requestForm.formState.isSubmitting}
                            >
                                {requestForm.formState.isSubmitting ? (
                                    <>
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Sending request...
                                    </>
                                ) : (
                                    <>
                                        Send verification code
                                        <ArrowRight className="size-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-5 border-t border-border/70 pt-4">
                            <p className="text-center text-sm text-muted-foreground">
                                Already verified?{" "}
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
            )}

            {visibleStep === "code" && (
                <Card className="gap-0 overflow-hidden border-border/70 bg-card shadow-xl shadow-primary/5">
                    <CardHeader className="gap-2 px-6 pt-6 pb-4 sm:px-7">
                        <CardTitle className="text-xl font-semibold">
                            Enter your verification code
                        </CardTitle>

                        <CardDescription className="leading-6">
                            Enter the six-digit code to verify your
                            email address.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5 px-6 pt-2 pb-6 sm:px-7">
                        <div
                            role="status"
                            aria-live="polite"
                            className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"
                        >
                            <Mail className="mt-0.5 size-5 shrink-0 text-primary" />

                            <div className="min-w-0 space-y-1">
                                <p className="text-sm font-semibold">
                                    Request received
                                </p>
                                <p className="text-sm leading-5 text-muted-foreground">
                                    If the account is eligible, a code
                                    will be sent to:
                                </p>
                                <p className="break-all text-sm font-medium text-foreground">
                                    {email}
                                </p>
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Check your spam folder too. Delivery
                                    may take a minute.
                                </p>
                            </div>
                        </div>

                        {hasResent && (
                            <p
                                role="status"
                                className="text-sm text-muted-foreground"
                            >
                                Your new code request was processed.
                                If the account is eligible, another code
                                will be sent.
                            </p>
                        )}

                        <form
                            noValidate
                            onSubmit={codeForm.handleSubmit(onVerifyCode)}
                            className="space-y-5"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="verification-code">
                                    6-digit code
                                </Label>

                                <Input
                                    id="verification-code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    placeholder="000000"
                                    disabled={codeForm.formState.isSubmitting}
                                    aria-invalid={Boolean(
                                        codeForm.formState.errors.code || codeError,
                                    )}
                                    aria-describedby={
                                        codeForm.formState.errors.code
                                            ? "verification-code-error"
                                            : codeError
                                              ? "verification-server-error"
                                              : "verification-code-hint"
                                    }
                                    className="h-14 rounded-xl text-center text-xl font-semibold tracking-[0.5em] tabular-nums"
                                    {...codeForm.register("code", {
                                        required: "Enter the six-digit code.",
                                        pattern: {
                                            value: /^\d{6}$/,
                                            message: "Enter all six digits.",
                                        },
                                    })}
                                    onChange={(event) => {
                                        const value = event.currentTarget.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6);

                                        codeForm.setValue("code", value, {
                                            shouldDirty: true,
                                            shouldValidate:
                                                codeForm.formState.isSubmitted,
                                        });

                                        setCodeError(null);
                                    }}
                                />

                                <p
                                    id="verification-code-hint"
                                    className="text-xs text-muted-foreground"
                                >
                                    The code must contain exactly six digits.
                                </p>

                                {codeForm.formState.errors.code && (
                                    <p
                                        id="verification-code-error"
                                        className="text-sm text-destructive"
                                    >
                                        {codeForm.formState.errors.code.message}
                                    </p>
                                )}
                            </div>

                            {codeError && (
                                <div
                                    id="verification-server-error"
                                    role="alert"
                                    className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-sm text-destructive"
                                >
                                    <AlertCircle
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <p>{codeError}</p>
                                </div>
                            )}

                            {resendError && (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {resendError}
                                </p>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="h-12 w-full rounded-xl font-semibold"
                                disabled={codeForm.formState.isSubmitting}
                            >
                                {codeForm.formState.isSubmitting ? (
                                    <>
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify email
                                        <ArrowRight className="size-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="flex flex-col items-center gap-3 border-t border-border/70 pt-4 text-sm sm:flex-row sm:justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-lg"
                                disabled={isResending || codeForm.formState.isSubmitting}
                                onClick={() => void onResendCode()}
                            >
                                {isResending ? (
                                    <>
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Requesting...
                                    </>
                                ) : (
                                    "Resend code"
                                )}
                            </Button>

                            <button
                                type="button"
                                className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                                onClick={useDifferentEmail}
                                disabled={isResending || codeForm.formState.isSubmitting}
                            >
                                Use a different email
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {visibleStep === "verified" && (
                <Card className="gap-0 border-border/70 bg-card shadow-xl shadow-primary/5">
                    <CardHeader className="items-center gap-3 px-6 pt-8 pb-4 text-center sm:px-7">
                        <div className="grid size-14 place-items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-7" aria-hidden="true" />
                        </div>

                        <CardTitle className="text-xl font-semibold">
                            Email verified successfully
                        </CardTitle>

                        <CardDescription className="leading-6">
                            Your email address has been verified.
                            You can now sign in to your Splitly account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pt-2 pb-6 sm:px-7">
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
            )}

            <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                Never share your verification code with anyone.
            </p>
        </section>
    );
}
