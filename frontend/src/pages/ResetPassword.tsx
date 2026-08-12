import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { ApiError, forgotPassword } from "../lib/api";

interface ResetPasswordFormValues {
    code: string;
    newPassword: string;
    confirmPassword: string;
}

// Same reasoning as VerifyEmail's PENDING_VERIFICATION_EMAIL_KEY — router
// state doesn't survive a reload, and opening the code from a mail app can
// trigger one.
const PENDING_RESET_EMAIL_KEY = "studypair_pending_reset_email";

export default function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();
    const { completePasswordReset } = useAuth();
    const stateEmail = (location.state as { email?: string } | null)?.email;
    const email = stateEmail ?? sessionStorage.getItem(PENDING_RESET_EMAIL_KEY) ?? "";

    if (stateEmail) {
        sessionStorage.setItem(PENDING_RESET_EMAIL_KEY, stateEmail);
    }

    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [resent, setResent] = useState(false);
    const [resending, setResending] = useState(false);
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        defaultValues: { code: "", newPassword: "", confirmPassword: "" },
    });

    if (!email) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
                <p className="text-body-md font-body-md text-on-surface-variant">
                    We don't have an email to reset. Please start over.
                </p>
                <Link to="/forgot-password" className="text-label-md font-label-md text-primary hover:underline">
                    Back to reset password
                </Link>
            </div>
        );
    }

    const onSubmit = async (values: ResetPasswordFormValues) => {
        setError(null);
        setSubmitting(true);
        try {
            await completePasswordReset(email, values.code, values.newPassword, values.confirmPassword);
            sessionStorage.removeItem(PENDING_RESET_EMAIL_KEY);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not reset your password.");
        } finally {
            setSubmitting(false);
        }
    };

    const onEditEmail = () => {
        sessionStorage.removeItem(PENDING_RESET_EMAIL_KEY);
        navigate("/forgot-password");
    };

    const onResend = async () => {
        setError(null);
        setResent(false);
        setResending(true);
        try {
            await forgotPassword(email);
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
                        <Icon name="lock_reset" filled className="text-[32px]" />
                    </div>

                    <h1 className="mb-space-xs text-headline-lg font-headline-lg text-on-surface">
                        Enter your reset code
                    </h1>
                    <p className="mb-space-xs text-body-md font-body-md text-on-surface-variant">
                        If <span className="font-semibold text-on-surface">{email}</span> has an account, we
                        sent it a 6-digit code.
                    </p>
                    <button
                        type="button"
                        onClick={onEditEmail}
                        className="mb-space-xl text-label-md font-label-md text-primary hover:underline"
                    >
                        Wrong email? Edit
                    </button>

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

                        <div>
                            <label className="mb-1 block px-1 text-label-sm font-label-sm text-on-surface-variant">
                                New password
                            </label>
                            <input
                                type="password"
                                {...register("newPassword", { required: "Please enter a new password." })}
                                placeholder="e.g. Str0ng!Pass"
                                className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md text-body-md font-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {errors.newPassword && (
                                <p className="mt-1 text-body-sm font-body-sm text-error">
                                    {errors.newPassword.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1 block px-1 text-label-sm font-label-sm text-on-surface-variant">
                                Confirm new password
                            </label>
                            <input
                                type="password"
                                {...register("confirmPassword", {
                                    required: "Please confirm your new password.",
                                    validate: (value) =>
                                        value === watch("newPassword") || "Passwords do not match.",
                                })}
                                placeholder="e.g. Str0ng!Pass"
                                className="h-14 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md text-body-md font-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-body-sm font-body-sm text-error">
                                    {errors.confirmPassword.message}
                                </p>
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
                            {submitting ? "Resetting…" : "Reset password"}
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
