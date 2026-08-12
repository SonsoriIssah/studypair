import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { ApiError, resendVerificationCode } from "../lib/api";

interface VerifyEmailFormValues {
    code: string;
}

export default function VerifyEmail() {
    const location = useLocation();
    const navigate = useNavigate();
    const { completeEmailVerification } = useAuth();
    const email = (location.state as { email?: string } | null)?.email ?? "";

    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [resent, setResent] = useState(false);
    const [resending, setResending] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<VerifyEmailFormValues>({ defaultValues: { code: "" } });

    if (!email) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-body-md font-body-md text-on-surface-variant">
                    We don't have an email to verify. Please sign up again.
                </p>
                <Link to="/login" className="text-label-md font-label-md text-primary hover:underline">
                    Back to sign in
                </Link>
            </div>
        );
    }

    const onSubmit = async (values: VerifyEmailFormValues) => {
        setError(null);
        setSubmitting(true);
        try {
            await completeEmailVerification(email, values.code);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not verify your email.");
        } finally {
            setSubmitting(false);
        }
    };

    const onResend = async () => {
        setError(null);
        setResent(false);
        setResending(true);
        try {
            await resendVerificationCode(email);
            setResent(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not resend the code.");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-container-margin md:p-8">
            <main className="mx-auto w-full max-w-md">
                <div className="flex flex-col items-center rounded-xl border border-outline-variant bg-surface-container-lowest p-space-xl text-center shadow-lg">
                    <div className="mb-space-lg flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                        <Icon name="mail" filled className="text-[32px]" />
                    </div>

                    <h1 className="mb-space-xs text-headline-lg font-headline-lg text-on-surface">
                        Check your email
                    </h1>
                    <p className="mb-space-xl text-body-md font-body-md text-on-surface-variant">
                        We sent a 6-digit code to <span className="font-semibold text-on-surface">{email}</span>.
                        Enter it below to finish creating your account.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-space-sm text-left">
                        <div>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                autoFocus
                                {...register("code", {
                                    required: "Please enter the code.",
                                    pattern: { value: /^\d{6}$/, message: "The code is 6 digits." },
                                })}
                                placeholder="000000"
                                className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md text-center text-headline-md font-headline-md tracking-[0.5em] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {errors.code && (
                                <p className="mt-1 text-body-sm font-body-sm text-error">{errors.code.message}</p>
                            )}
                        </div>

                        {error && <p className="text-body-sm font-body-sm text-error">{error}</p>}
                        {resent && !error && (
                            <p className="text-body-sm font-body-sm text-secondary">A new code is on its way.</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-space-sm flex h-14 w-full items-center justify-center rounded-xl bg-primary text-body-lg font-body-lg font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
                        >
                            {submitting ? "Verifying…" : "Verify"}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={onResend}
                        disabled={resending}
                        className="mt-space-lg text-label-md font-label-md text-primary hover:underline disabled:opacity-60"
                    >
                        {resending ? "Sending…" : "Resend code"}
                    </button>
                </div>
            </main>
        </div>
    );
}
